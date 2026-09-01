import { PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { pdfDefang } from '../src/index.ts';
import { actionTypesOnPages, createFormActionsPdf, createKitchenSinkPdf, pageAnnots } from './fixtures.ts';
import { acroFormHas, namesHas, reload } from './inspect.ts';

describe('balanced', () => {
  it('keeps SubmitForm, ResetForm, form JavaScript, annot AA/JS, CO, and EmbeddedFiles', async () => {
    const original = await createFormActionsPdf();
    const { bytes, report } = await pdfDefang.sanitize(original, {
      level: 'balanced',
      returnReport: true,
    });

    expect(report.level).toBe('balanced');
    expect(report.calculation_order_removed).toBe(false);
    expect(report.embedded_files).toBe(0);
    expect(report.annotations_with_js).toBe(0);
    expect(report.annotation_action_types).toEqual([]);

    const pdf = await reload(bytes);
    expect(actionTypesOnPages(pdf)).toEqual(['/SubmitForm', '/ResetForm', '/JavaScript']);
    expect(acroFormHas(pdf, 'CO')).toBe(true);
    expect(namesHas(pdf, 'EmbeddedFiles')).toBe(true);

    const annots = pageAnnots(pdf, 0);
    expect(annots.some((annot) => annot.has(PDFName.of('AA')))).toBe(true);
    expect(annots.some((annot) => annot.has(PDFName.of('JS')))).toBe(true);
  });

  it('still strips Names JavaScript, OpenAction, catalog AA, page AA, and Launch', async () => {
    const original = await createKitchenSinkPdf();
    const { bytes, report } = await pdfDefang.sanitize(original, {
      level: 'balanced',
      returnReport: true,
    });

    expect(report.javascript_in_names).toBe(1);
    expect(report.open_action_removed).toBe(true);
    expect(report.document_aa_removed).toBe(true);
    expect(report.pages_with_aa).toBe(1);
    expect(report.embedded_files).toBe(0);
    expect(report.annotation_action_types).toEqual(['Launch']);

    const pdf = await reload(bytes);
    expect(namesHas(pdf, 'JavaScript')).toBe(false);
    expect(namesHas(pdf, 'EmbeddedFiles')).toBe(true);
    expect(actionTypesOnPages(pdf)).toEqual(['/JavaScript']);
  });
});
