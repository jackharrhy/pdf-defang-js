import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';

import { describeLoadFailure, loadPdf } from './load.ts';
import {
  acroFormDict,
  asDict,
  countNamedTreeEntries,
  inspectActionChain,
  namesDict,
  visitFormAndPageDicts,
} from './pdf.ts';
import { ScanReport } from './report.ts';
import { DANGEROUS_ACTION_TYPES_STRICT } from './strip.ts';
import type { RiskLevel } from './types.ts';

export async function scan(bytes: Uint8Array): Promise<ScanReport> {
  const report = new ScanReport();
  report.file_size = bytes.byteLength;

  let pdf: PDFDocument;
  try {
    pdf = await loadPdf(bytes);
  } catch (error) {
    const failure = describeLoadFailure(error);
    report.error = failure.message;
    report.is_encrypted = failure.isEncrypted;
    return report;
  }

  report.page_count = pdf.getPageCount();
  scanDocumentLevel(pdf, report);
  scanPages(pdf, report);
  report.risk_level = calculateRisk(report);
  return report;
}

export function calculateRisk(report: ScanReport): RiskLevel {
  const highActions = new Set(['Launch', 'ImportData', 'GoToR']);
  const highSignals =
    report.has_javascript ||
    report.has_open_action ||
    report.has_document_aa ||
    report.has_xfa_form ||
    report.dangerous_uris > 0 ||
    report.annotation_action_types.some((type) => highActions.has(type));
  if (highSignals) {
    return 'high';
  }
  if (report.annotations_with_actions > 0 || report.has_embedded_files || report.pages_with_aa > 0) {
    return 'medium';
  }
  if (report.annotations_with_js > 0) {
    return 'low';
  }
  return 'none';
}

function scanDocumentLevel(pdf: PDFDocument, report: ScanReport): void {
  const names = namesDict(pdf);
  if (names) {
    if (names.has(PDFName.of('JavaScript'))) {
      report.has_javascript = true;
      const javascript = asDict(names.lookup(PDFName.of('JavaScript')));
      report.javascript_in_names = javascript ? countNamedTreeEntries(javascript) : 0;
    }
    if (names.has(PDFName.of('EmbeddedFiles'))) {
      report.has_embedded_files = true;
      const embedded = asDict(names.lookup(PDFName.of('EmbeddedFiles')));
      report.embedded_files_count = embedded ? countNamedTreeEntries(embedded) : 0;
    }
  }

  if (pdf.catalog.has(PDFName.of('OpenAction'))) {
    report.has_open_action = true;
  }
  if (pdf.catalog.has(PDFName.of('AA'))) {
    report.has_document_aa = true;
  }

  const acroForm = acroFormDict(pdf);
  if (acroForm?.has(PDFName.of('XFA'))) {
    report.has_xfa_form = true;
  }
}

function scanPages(pdf: PDFDocument, report: ScanReport): void {
  const seenTypes = new Set<string>();
  const seenUriSchemes = new Set<string>();

  for (const page of pdf.getPages()) {
    if (page.node.has(PDFName.of('AA'))) {
      report.pages_with_aa += 1;
    }
  }

  visitFormAndPageDicts(pdf, (annot) => {
    scanAnnotation(annot, report, seenTypes, seenUriSchemes);
  });

  report.annotation_action_types = [...seenTypes].sort();
  report.dangerous_uri_schemes = [...seenUriSchemes].sort();
}

function scanAnnotation(
  annot: PDFDict,
  report: ScanReport,
  seenTypes: Set<string>,
  seenUriSchemes: Set<string>,
): void {
  try {
    const action = asDict(annot.lookup(PDFName.of('A')));
    if (action) {
      const hit = inspectActionChain(action, DANGEROUS_ACTION_TYPES_STRICT);
      if (hit.types.length > 0) {
        report.annotations_with_actions += 1;
        for (const type of hit.types) {
          seenTypes.add(type);
        }
      }
      report.dangerous_uris += hit.unsafeUriSchemes.length;
      for (const scheme of hit.unsafeUriSchemes) {
        if (scheme) {
          seenUriSchemes.add(scheme);
        }
      }
    }
    if (annot.has(PDFName.of('AA'))) {
      report.annotations_with_actions += 1;
    }
    if (annot.has(PDFName.of('JS'))) {
      report.annotations_with_js += 1;
    }
  } catch {
    return;
  }
}
