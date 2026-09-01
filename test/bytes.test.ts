import { PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { SanitizeError, pdfDefang } from '../src/index.ts';
import {
  actionTypesOnPages,
  createAcroFormOnlyWidgetPdf,
  createAnnotJsOnlyPdf,
  createCleanPdf,
  createDangerousUrisPdf,
  createEmbeddedFilesPdf,
  createEncryptedPdf,
  createFormActionsPdf,
  createGoToRPdf,
  createKitchenSinkPdf,
  createLaunchAnnotPdf,
  createMovieSoundPdf,
  createNamedJavaScriptPdf,
  createOpenActionPdf,
  createXfaPdf,
  firstAcroFormField,
  pageAnnots,
  remainingUris,
} from './fixtures.ts';
import { acroFormHas, catalogHas, namesHas, reload, sameBytes } from './inspect.ts';

describe('pdfDefang.sanitize', () => {
  it('returns the original bytes for a clean PDF', async () => {
    const original = await createCleanPdf();
    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(sameBytes(bytes, original)).toBe(true);
    expect(report.modified).toBe(false);
    expect(report.javascript_in_names).toBe(0);
    expect(report.embedded_files).toBe(0);
    expect(report.open_action_removed).toBe(false);
    expect(report.document_aa_removed).toBe(false);
    expect(report.xfa_form_removed).toBe(false);
    expect(report.calculation_order_removed).toBe(false);
    expect(report.pages_with_aa).toBe(0);
    expect(report.annotations_with_actions).toBe(0);
    expect(report.annotations_with_js).toBe(0);
    expect(report.dangerous_uris_removed).toBe(0);
    expect(report.error).toBe(null);
  });

  it('does not mutate the input buffer', async () => {
    const original = await createNamedJavaScriptPdf();
    const copy = original.slice();
    await pdfDefang.sanitize(original);
    expect(sameBytes(original, copy)).toBe(true);
  });

  it('strips Names JavaScript and reports one named entry', async () => {
    const original = await createNamedJavaScriptPdf();
    expect(namesHas(await reload(original), 'JavaScript')).toBe(true);

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.javascript_in_names).toBe(1);
    expect(report.modified).toBe(true);
    expect(namesHas(await reload(bytes), 'JavaScript')).toBe(false);
  });

  it('strips OpenAction', async () => {
    const original = await createOpenActionPdf();
    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.open_action_removed).toBe(true);
    expect(catalogHas(await reload(bytes), 'OpenAction')).toBe(false);
  });

  it('strips EmbeddedFiles in strict', async () => {
    const original = await createEmbeddedFilesPdf();
    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.embedded_files).toBe(1);
    expect(namesHas(await reload(bytes), 'EmbeddedFiles')).toBe(false);
  });

  it('strips Launch annotations', async () => {
    const original = await createLaunchAnnotPdf();
    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.annotations_with_actions).toBe(1);
    expect(report.annotation_action_types).toEqual(['Launch']);
    expect(actionTypesOnPages(await reload(bytes))).toEqual([]);
  });

  it('strips three dangerous URIs and keeps https', async () => {
    const original = await createDangerousUrisPdf();
    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.dangerous_uris_removed).toBe(3);
    expect(report.dangerous_uri_schemes_removed).toEqual(['javascript', 'file', 'unc']);
    expect(remainingUris(await reload(bytes))).toEqual(['https://example.com/safe']);
  });

  it('strips GoToR', async () => {
    const original = await createGoToRPdf();
    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.annotations_with_actions).toBe(1);
    expect(report.annotation_action_types).toEqual(['GoToR']);
    expect(actionTypesOnPages(await reload(bytes))).toEqual([]);
  });

  it('strips Movie and Sound', async () => {
    const original = await createMovieSoundPdf();
    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.annotations_with_actions).toBe(2);
    expect(report.annotation_action_types).toEqual(['Movie', 'Sound']);
  });

  it('strips XFA and leaves the rest of AcroForm', async () => {
    const original = await createXfaPdf();
    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.xfa_form_removed).toBe(true);
    const pdf = await reload(bytes);
    expect(acroFormHas(pdf, 'XFA')).toBe(false);
    expect(acroFormHas(pdf, 'Fields')).toBe(true);
  });

  it('strips a widget that only lives on the AcroForm field tree', async () => {
    const original = await createAcroFormOnlyWidgetPdf();
    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.annotations_with_actions).toBe(1);
    expect(report.annotation_action_types).toEqual(['JavaScript']);
    expect(firstAcroFormField(await reload(bytes)).has(PDFName.of('A'))).toBe(false);
  });

  it('strips form actions, annot AA/JS, CO, and embedded files in strict', async () => {
    const original = await createFormActionsPdf();
    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.annotations_with_actions).toBe(4);
    expect(report.annotation_action_types).toEqual(['SubmitForm', 'ResetForm', 'JavaScript']);
    expect(report.annotations_with_js).toBe(1);
    expect(report.calculation_order_removed).toBe(true);
    expect(report.embedded_files).toBe(1);

    const pdf = await reload(bytes);
    expect(actionTypesOnPages(pdf)).toEqual([]);
    expect(acroFormHas(pdf, 'CO')).toBe(false);
    expect(namesHas(pdf, 'EmbeddedFiles')).toBe(false);
    expect(pageAnnots(pdf)).toHaveLength(4);
  });

  it('strips the kitchen sink in one pass', async () => {
    const original = await createKitchenSinkPdf();
    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.javascript_in_names).toBe(1);
    expect(report.embedded_files).toBe(1);
    expect(report.open_action_removed).toBe(true);
    expect(report.document_aa_removed).toBe(true);
    expect(report.pages_with_aa).toBe(1);
    expect(report.annotations_with_actions).toBe(2);
    expect(report.annotation_action_types).toEqual(['Launch', 'JavaScript']);
    expect(report.error).toBe(null);

    const pdf = await reload(bytes);
    expect(pdf.getPageCount()).toBe(3);
    expect(catalogHas(pdf, 'OpenAction')).toBe(false);
    expect(catalogHas(pdf, 'AA')).toBe(false);
    expect(namesHas(pdf, 'JavaScript')).toBe(false);
    expect(namesHas(pdf, 'EmbeddedFiles')).toBe(false);
  });

  it('throws SanitizeError on garbage and leaves the original bytes on the error', async () => {
    const garbage = new TextEncoder().encode('not a pdf');
    try {
      await pdfDefang.sanitize(garbage);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(SanitizeError);
      const failed = error as SanitizeError;
      expect(failed.report.error).not.toBe(null);
      expect(failed.report.modified).toBe(false);
      expect(failed.original).toBe(garbage);
    }
  });

  it('throws SanitizeError on encrypted PDFs', async () => {
    const original = await createEncryptedPdf();
    try {
      await pdfDefang.sanitize(original);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(SanitizeError);
      const failed = error as SanitizeError;
      expect(failed.report.error).toBe('encrypted PDFs are not supported');
      expect(failed.original).toBe(original);
    }
  });
});

describe('pdfDefang.scan', () => {
  it('reports none on a clean PDF', async () => {
    const original = await createCleanPdf();
    const report = await pdfDefang.scan(original);
    expect(report.has_javascript).toBe(false);
    expect(report.has_open_action).toBe(false);
    expect(report.has_document_aa).toBe(false);
    expect(report.has_xfa_form).toBe(false);
    expect(report.has_embedded_files).toBe(false);
    expect(report.annotations_with_actions).toBe(0);
    expect(report.risk_level).toBe('none');
    expect(report.error).toBe(null);
    expect(report.page_count).toBe(2);
  });

  it('detects Names JavaScript as high risk without stripping', async () => {
    const original = await createNamedJavaScriptPdf();
    const report = await pdfDefang.scan(original);
    expect(report.has_javascript).toBe(true);
    expect(report.javascript_in_names).toBe(1);
    expect(report.risk_level).toBe('high');
    expect(namesHas(await reload(original), 'JavaScript')).toBe(true);
  });

  it('detects OpenAction as high risk', async () => {
    const report = await pdfDefang.scan(await createOpenActionPdf());
    expect(report.has_open_action).toBe(true);
    expect(report.risk_level).toBe('high');
  });

  it('detects embedded files as medium risk', async () => {
    const report = await pdfDefang.scan(await createEmbeddedFilesPdf());
    expect(report.has_embedded_files).toBe(true);
    expect(report.embedded_files_count).toBe(1);
    expect(report.risk_level).toBe('medium');
  });

  it('detects Launch as high risk', async () => {
    const report = await pdfDefang.scan(await createLaunchAnnotPdf());
    expect(report.annotations_with_actions).toBe(1);
    expect(report.annotation_action_types).toEqual(['Launch']);
    expect(report.risk_level).toBe('high');
  });

  it('detects three dangerous URIs and not the https control', async () => {
    const report = await pdfDefang.scan(await createDangerousUrisPdf());
    expect(report.dangerous_uris).toBe(3);
    expect(report.dangerous_uri_schemes).toEqual(['file', 'javascript', 'unc']);
    expect(report.risk_level).toBe('high');
  });

  it('detects GoToR as high risk', async () => {
    const report = await pdfDefang.scan(await createGoToRPdf());
    expect(report.annotation_action_types).toEqual(['GoToR']);
    expect(report.risk_level).toBe('high');
  });

  it('detects Movie and Sound as medium risk', async () => {
    const report = await pdfDefang.scan(await createMovieSoundPdf());
    expect(report.annotations_with_actions).toBe(2);
    expect(report.annotation_action_types).toEqual(['Movie', 'Sound']);
    expect(report.risk_level).toBe('medium');
  });

  it('detects annotation JS with no trigger as low risk', async () => {
    const report = await pdfDefang.scan(await createAnnotJsOnlyPdf());
    expect(report.annotations_with_js).toBe(1);
    expect(report.annotations_with_actions).toBe(0);
    expect(report.risk_level).toBe('low');
  });

  it('detects the kitchen sink as high risk', async () => {
    const original = await createKitchenSinkPdf();
    const report = await pdfDefang.scan(original);
    expect(report.has_javascript).toBe(true);
    expect(report.has_open_action).toBe(true);
    expect(report.has_document_aa).toBe(true);
    expect(report.has_embedded_files).toBe(true);
    expect(report.pages_with_aa).toBe(1);
    expect(report.annotations_with_actions).toBe(2);
    expect(report.risk_level).toBe('high');
    expect(catalogHas(await reload(original), 'OpenAction')).toBe(true);
  });

  it('records parse failures on ScanReport.error', async () => {
    const report = await pdfDefang.scan(new TextEncoder().encode('not a pdf'));
    expect(report.error).not.toBe(null);
    expect(report.risk_level).toBe('none');
  });

  it('marks encrypted PDFs without throwing', async () => {
    const report = await pdfDefang.scan(await createEncryptedPdf());
    expect(report.is_encrypted).toBe(true);
    expect(report.error).toBe('encrypted PDFs are not supported');
  });
});
