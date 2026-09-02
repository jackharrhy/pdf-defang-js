import { PDFArray, PDFDict, PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { pdfDefang } from '../src/index.ts';
import {
  actionTypesOnPages,
  createCircularGotoNextPdf,
  createCircularKidsPdf,
  createCircularNamedTreePdf,
  createCircularNextPdf,
  createGotoThenActionArrayPdf,
  createGotoThenJavaScriptPdf,
  createGotoThenJavascriptUriPdf,
  createHttpsThenLaunchPdf,
  firstAcroFormField,
  remainingUris,
} from './fixtures.ts';
import { catalogHas, namesHas, reload, sameBytes } from './inspect.ts';

function firstKid(field: PDFDict): PDFDict {
  const kids = field.lookup(PDFName.of('Kids'));
  if (!(kids instanceof PDFArray)) {
    throw new Error('expected Kids');
  }
  const kid = kids.lookup(0);
  if (!(kid instanceof PDFDict)) {
    throw new Error('expected kid dict');
  }
  return kid;
}

describe('/A /Next chains', () => {
  it('strips a GoTo whose Next is JavaScript', async () => {
    const original = await createGotoThenJavaScriptPdf();
    const scan = await pdfDefang.scan(original);
    expect(scan.annotations_with_actions).toBe(1);
    expect(scan.annotation_action_types).toEqual(['JavaScript']);
    expect(scan.risk_level).toBe('medium');

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.annotations_with_actions).toBe(1);
    expect(report.annotation_action_types).toEqual(['JavaScript']);
    expect(actionTypesOnPages(await reload(bytes))).toEqual([]);
  });

  it('keeps GoTo Next JavaScript in balanced', async () => {
    const original = await createGotoThenJavaScriptPdf();
    const { bytes, report } = await pdfDefang.sanitize(original, {
      level: 'balanced',
      returnReport: true,
    });
    expect(report.modified).toBe(false);
    expect(report.annotations_with_actions).toBe(0);
    expect(actionTypesOnPages(await reload(bytes))).toEqual(['/GoTo']);
  });

  it('strips a safe https URI whose Next is Launch', async () => {
    const original = await createHttpsThenLaunchPdf();
    const scan = await pdfDefang.scan(original);
    expect(scan.annotations_with_actions).toBe(1);
    expect(scan.annotation_action_types).toEqual(['Launch']);
    expect(scan.dangerous_uris).toBe(0);
    expect(scan.risk_level).toBe('high');

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.annotations_with_actions).toBe(1);
    expect(report.annotation_action_types).toEqual(['Launch']);
    expect(report.dangerous_uris_removed).toBe(0);
    expect(actionTypesOnPages(await reload(bytes))).toEqual([]);
    expect(remainingUris(await reload(bytes))).toEqual([]);
  });

  it('strips a GoTo whose Next array is JavaScript then Launch', async () => {
    const original = await createGotoThenActionArrayPdf();
    const scan = await pdfDefang.scan(original);
    expect(scan.annotations_with_actions).toBe(1);
    expect(scan.annotation_action_types).toEqual(['JavaScript', 'Launch']);
    expect(scan.risk_level).toBe('high');

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.annotations_with_actions).toBe(1);
    expect(report.annotation_action_types).toEqual(['JavaScript', 'Launch']);
    expect(actionTypesOnPages(await reload(bytes))).toEqual([]);
  });

  it('strips a circular Next chain that includes JavaScript', async () => {
    const original = await createCircularNextPdf();
    const scan = await pdfDefang.scan(original);
    expect(scan.annotations_with_actions).toBe(1);
    expect(scan.annotation_action_types).toEqual(['JavaScript']);

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.annotations_with_actions).toBe(1);
    expect(report.annotation_action_types).toEqual(['JavaScript']);
    expect(actionTypesOnPages(await reload(bytes))).toEqual([]);
  });

  it('leaves a circular GoTo Next that has no dangerous step', async () => {
    const original = await createCircularGotoNextPdf();
    const scan = await pdfDefang.scan(original);
    expect(scan.annotations_with_actions).toBe(0);
    expect(scan.risk_level).toBe('none');

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(sameBytes(bytes, original)).toBe(true);
    expect(report.modified).toBe(false);
    expect(actionTypesOnPages(await reload(bytes))).toEqual(['/GoTo']);
  });

  it('strips a GoTo whose Next is a javascript: URI', async () => {
    const original = await createGotoThenJavascriptUriPdf();
    const scan = await pdfDefang.scan(original);
    expect(scan.annotations_with_actions).toBe(0);
    expect(scan.dangerous_uris).toBe(1);
    expect(scan.dangerous_uri_schemes).toEqual(['javascript']);
    expect(scan.risk_level).toBe('high');

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.dangerous_uris_removed).toBe(1);
    expect(report.dangerous_uri_schemes_removed).toEqual(['javascript']);
    expect(report.annotations_with_actions).toBe(0);
    expect(actionTypesOnPages(await reload(bytes))).toEqual([]);
  });
});

describe('circular Kids', () => {
  it('finishes a cyclic AcroForm tree and still strips catalog hooks', async () => {
    const original = await createCircularKidsPdf();
    const scan = await pdfDefang.scan(original);
    expect(scan.has_open_action).toBe(true);
    expect(scan.annotations_with_actions).toBe(1);
    expect(scan.annotation_action_types).toEqual(['JavaScript']);
    expect(scan.risk_level).toBe('high');

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.open_action_removed).toBe(true);
    expect(report.annotations_with_actions).toBe(1);
    expect(report.annotation_action_types).toEqual(['JavaScript']);
    const pdf = await reload(bytes);
    expect(catalogHas(pdf, 'OpenAction')).toBe(false);
    expect(firstKid(firstAcroFormField(pdf)).has(PDFName.of('A'))).toBe(false);
  });

  it('counts named JavaScript through a cyclic name tree', async () => {
    const original = await createCircularNamedTreePdf();
    const scan = await pdfDefang.scan(original);
    expect(scan.has_javascript).toBe(true);
    expect(scan.javascript_in_names).toBe(1);
    expect(scan.risk_level).toBe('high');

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.javascript_in_names).toBe(1);
    expect(namesHas(await reload(bytes), 'JavaScript')).toBe(false);
  });
});
