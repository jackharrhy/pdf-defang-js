import { PDFArray, PDFDict, PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { pdfDefang } from '../src/index.ts';
import {
  createHexNameJavaScriptPdf,
  createImportDataRenditionGoToEPdf,
  createNestedKidsWidgetPdf,
} from './fixtures.ts';
import { namesHas, reload } from './inspect.ts';

describe('ImportData, nested Kids, and hex names', () => {
  it('strips ImportData, Rendition, and GoToE', async () => {
    const original = await createImportDataRenditionGoToEPdf();
    const scan = await pdfDefang.scan(original);
    expect(scan.annotations_with_actions).toBe(3);
    expect(scan.annotation_action_types).toEqual(['GoToE', 'ImportData', 'Rendition']);
    expect(scan.risk_level).toBe('high');

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.annotations_with_actions).toBe(3);
    expect(report.annotation_action_types).toEqual(['ImportData', 'Rendition', 'GoToE']);
    const pdf = await reload(bytes);
    for (const page of pdf.getPages()) {
      const annots = page.node.lookup(PDFName.of('Annots'));
      if (!(annots instanceof PDFArray)) {
        continue;
      }
      for (let i = 0; i < annots.size(); i += 1) {
        const annot = annots.lookup(i);
        if (annot instanceof PDFDict) {
          expect(annot.has(PDFName.of('A'))).toBe(false);
        }
      }
    }
  });

  it('strips widget JS that only lives under AcroForm Kids', async () => {
    const original = await createNestedKidsWidgetPdf();
    const scan = await pdfDefang.scan(original);
    expect(scan.annotations_with_actions).toBe(1);
    expect(scan.annotation_action_types).toEqual(['JavaScript']);

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.annotation_action_types).toEqual(['JavaScript']);
    const acroForm = (await reload(bytes)).catalog.lookup(PDFName.of('AcroForm'));
    if (!(acroForm instanceof PDFDict)) {
      throw new Error('expected AcroForm');
    }
    const fields = acroForm.lookup(PDFName.of('Fields'));
    if (!(fields instanceof PDFArray)) {
      throw new Error('expected Fields');
    }
    const parent = fields.lookup(0);
    if (!(parent instanceof PDFDict)) {
      throw new Error('expected parent field');
    }
    const kids = parent.lookup(PDFName.of('Kids'));
    if (!(kids instanceof PDFArray)) {
      throw new Error('expected Kids');
    }
    const widget = kids.lookup(0);
    if (!(widget instanceof PDFDict)) {
      throw new Error('expected widget');
    }
    expect(widget.has(PDFName.of('A'))).toBe(false);
  });

  it('sees hex-encoded /JavaScript names after pdf-lib load', async () => {
    const original = await createHexNameJavaScriptPdf();
    expect(namesHas(await reload(original), 'JavaScript')).toBe(true);
    const scan = await pdfDefang.scan(original);
    expect(scan.has_javascript).toBe(true);
    expect(scan.javascript_in_names).toBe(1);
    expect(scan.risk_level).toBe('high');

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.javascript_in_names).toBe(1);
    expect(namesHas(await reload(bytes), 'JavaScript')).toBe(false);
  });
});
