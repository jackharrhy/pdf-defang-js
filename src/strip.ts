import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';

import { acroFormDict, actionTypeName, asDict, countNamedTreeEntries, namesDict, pdfText, visitFormAndPageDicts } from './pdf.ts';
import type { SanitizeReport } from './report.ts';
import type { Level } from './types.ts';
import { extractScheme, isSafeUri } from './uri.ts';

export const DANGEROUS_ACTION_TYPES_STRICT: ReadonlySet<string> = new Set([
  '/JavaScript',
  '/Launch',
  '/ImportData',
  '/SubmitForm',
  '/ResetForm',
  '/Rendition',
  '/GoToR',
  '/GoToE',
  '/Movie',
  '/Sound',
]);

export const DANGEROUS_ACTION_TYPES_BALANCED: ReadonlySet<string> = new Set([
  '/Launch',
  '/ImportData',
  '/Rendition',
  '/GoToR',
  '/GoToE',
  '/Movie',
  '/Sound',
]);

export function dangerousActionTypes(level: Level): ReadonlySet<string> {
  switch (level) {
    case 'balanced':
      return DANGEROUS_ACTION_TYPES_BALANCED;
    case 'strict':
      return DANGEROUS_ACTION_TYPES_STRICT;
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function stripDocument(pdf: PDFDocument, report: SanitizeReport, level: Level): void {
  stripDocumentLevel(pdf, report, level);
  stripPages(pdf, report, level);
}

function stripDocumentLevel(pdf: PDFDocument, report: SanitizeReport, level: Level): void {
  const names = namesDict(pdf);
  if (names) {
    if (names.has(PDFName.of('JavaScript'))) {
      const javascript = asDict(names.lookup(PDFName.of('JavaScript')));
      report.javascript_in_names = javascript ? countNamedTreeEntries(javascript) : 0;
      names.delete(PDFName.of('JavaScript'));
    }
    if (names.has(PDFName.of('EmbeddedFiles')) && level === 'strict') {
      const embedded = asDict(names.lookup(PDFName.of('EmbeddedFiles')));
      report.embedded_files = embedded ? countNamedTreeEntries(embedded) : 0;
      names.delete(PDFName.of('EmbeddedFiles'));
    }
  }

  if (pdf.catalog.has(PDFName.of('OpenAction'))) {
    pdf.catalog.delete(PDFName.of('OpenAction'));
    report.open_action_removed = true;
  }

  if (pdf.catalog.has(PDFName.of('AA'))) {
    pdf.catalog.delete(PDFName.of('AA'));
    report.document_aa_removed = true;
  }

  const acroForm = acroFormDict(pdf);
  if (acroForm) {
    if (acroForm.has(PDFName.of('XFA'))) {
      acroForm.delete(PDFName.of('XFA'));
      report.xfa_form_removed = true;
    }
    if (acroForm.has(PDFName.of('CO')) && level === 'strict') {
      acroForm.delete(PDFName.of('CO'));
      report.calculation_order_removed = true;
    }
  }
}

function stripPages(pdf: PDFDocument, report: SanitizeReport, level: Level): void {
  const dangerous = dangerousActionTypes(level);
  for (const page of pdf.getPages()) {
    if (page.node.has(PDFName.of('AA'))) {
      page.node.delete(PDFName.of('AA'));
      report.pages_with_aa += 1;
    }
  }
  visitFormAndPageDicts(pdf, (annot) => {
    stripAnnotation(annot, report, level, dangerous);
  });
}

function stripAnnotation(
  annot: PDFDict,
  report: SanitizeReport,
  level: Level,
  dangerousTypes: ReadonlySet<string>,
): void {
  try {
    const action = asDict(annot.lookup(PDFName.of('A')));
    if (action) {
      const stype = actionTypeName(action) ?? '';
      if (dangerousTypes.has(stype)) {
        report.annotations_with_actions += 1;
        report.annotation_action_types.push(stype.replace(/^\//, ''));
        annot.delete(PDFName.of('A'));
      } else if (stype === '/URI') {
        const uri = pdfText(action.lookup(PDFName.of('URI')));
        if (uri !== undefined && !isSafeUri(uri)) {
          const scheme = extractScheme(uri);
          report.dangerous_uris_removed += 1;
          if (scheme && !report.dangerous_uri_schemes_removed.includes(scheme)) {
            report.dangerous_uri_schemes_removed.push(scheme);
          }
          annot.delete(PDFName.of('A'));
        }
      }
    }
    if (level === 'strict') {
      if (annot.has(PDFName.of('AA'))) {
        annot.delete(PDFName.of('AA'));
        report.annotations_with_actions += 1;
      }
      if (annot.has(PDFName.of('JS'))) {
        annot.delete(PDFName.of('JS'));
        report.annotations_with_js += 1;
      }
    }
  } catch {
    return;
  }
}
