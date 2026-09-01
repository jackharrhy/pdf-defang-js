import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { pdfDefang } from '../src/index.ts';
import { pageAnnots, remainingUris } from './fixtures.ts';
import { catalogHas, namesHas, reload, sameBytes } from './inspect.ts';

const corpus = join(dirname(fileURLToPath(import.meta.url)), 'corpus');

async function loadCorpus(name: string): Promise<Uint8Array> {
  return readFile(join(corpus, name));
}

describe('public corpus', () => {
  it('strips OpenAction JavaScript from pentest js_annot.pdf', async () => {
    const original = await loadCorpus('js_annot.pdf');
    const scan = await pdfDefang.scan(original);
    expect(scan.has_open_action).toBe(true);
    expect(scan.risk_level).toBe('high');
    expect(catalogHas(await reload(original), 'OpenAction')).toBe(true);

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.open_action_removed).toBe(true);
    expect(catalogHas(await reload(bytes), 'OpenAction')).toBe(false);
  });

  it('strips three EmbeddedFiles from attach_scripts.pdf in strict', async () => {
    const original = await loadCorpus('attach_scripts.pdf');
    const scan = await pdfDefang.scan(original);
    expect(scan.has_embedded_files).toBe(true);
    expect(scan.embedded_files_count).toBe(3);
    expect(scan.risk_level).toBe('medium');

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.embedded_files).toBe(3);
    expect(namesHas(await reload(bytes), 'EmbeddedFiles')).toBe(false);
  });

  it('keeps EmbeddedFiles on attach_scripts.pdf in balanced', async () => {
    const original = await loadCorpus('attach_scripts.pdf');
    const { bytes, report } = await pdfDefang.sanitize(original, {
      level: 'balanced',
      returnReport: true,
    });
    expect(report.embedded_files).toBe(0);
    expect(namesHas(await reload(bytes), 'EmbeddedFiles')).toBe(true);
  });

  it('strips a data: URI and OpenAction from PayloadsAllThePDFs payload1.pdf', async () => {
    const original = await loadCorpus('payload1.pdf');
    const scan = await pdfDefang.scan(original);
    expect(scan.has_open_action).toBe(true);
    expect(scan.dangerous_uris).toBe(1);
    expect(scan.dangerous_uri_schemes).toEqual(['data']);
    expect(scan.risk_level).toBe('high');

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.open_action_removed).toBe(true);
    expect(report.dangerous_uris_removed).toBe(1);
    expect(report.dangerous_uri_schemes_removed).toEqual(['data']);
    expect(remainingUris(await reload(bytes))).toEqual([]);
  });

  it('keeps the schemeless URI on payload2.pdf and still strips OpenAction', async () => {
    const original = await loadCorpus('payload2.pdf');
    const scan = await pdfDefang.scan(original);
    expect(scan.has_open_action).toBe(true);
    expect(scan.dangerous_uris).toBe(0);

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.open_action_removed).toBe(true);
    expect(remainingUris(await reload(bytes))).toEqual(['">\'><details open ontoggle=confirm(2)>']);
  });

  it('strips the file: URI on payload3.pdf', async () => {
    const original = await loadCorpus('payload3.pdf');
    const scan = await pdfDefang.scan(original);
    expect(scan.has_open_action).toBe(true);
    expect(scan.dangerous_uris).toBe(1);
    expect(scan.dangerous_uri_schemes).toEqual(['file']);

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.dangerous_uris_removed).toBe(1);
    expect(remainingUris(await reload(bytes))).toEqual([]);
  });

  it('keeps the https URI on starter_pack.pdf', async () => {
    const original = await loadCorpus('starter_pack.pdf');
    const scan = await pdfDefang.scan(original);
    expect(scan.has_open_action).toBe(true);
    expect(scan.dangerous_uris).toBe(0);

    const { bytes } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(remainingUris(await reload(bytes))).toEqual(['https://www.gubello.me']);
  });

  it('strips annotation /AA from foxit-reader-poc.pdf', async () => {
    const original = await loadCorpus('foxit-reader-poc.pdf');
    const scan = await pdfDefang.scan(original);
    expect(scan.annotations_with_actions).toBe(1);
    expect(scan.risk_level).toBe('medium');

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.annotations_with_actions).toBe(1);
    const annots = pageAnnots(await reload(bytes));
    expect(annots).toHaveLength(1);
    expect(annots[0]!.has(PDFName.of('AA'))).toBe(false);
  });

  it('strips annotation /AA from payload7.pdf', async () => {
    const original = await loadCorpus('payload7.pdf');
    const scan = await pdfDefang.scan(original);
    expect(scan.annotations_with_actions).toBe(1);
    expect(scan.risk_level).toBe('medium');

    const { bytes, report } = await pdfDefang.sanitize(original, { returnReport: true });
    expect(report.annotations_with_actions).toBe(1);
    const annots = pageAnnots(await reload(bytes));
    expect(annots).toHaveLength(1);
    expect(annots[0]!.has(PDFName.of('AA'))).toBe(false);
  });

  it('does not rewrite payload8.pdf (PDF.js FontMatrix, out of scope)', async () => {
    const original = await loadCorpus('payload8.pdf');
    const scan = await pdfDefang.scan(original);
    expect(scan.risk_level).toBe('none');
    expect(scan.has_open_action).toBe(false);
    expect(scan.has_javascript).toBe(false);
    expect(sameBytes(await pdfDefang.sanitize(original), original)).toBe(true);
  });

  it('does not rewrite xss_text.pdf (XSS as visible text only)', async () => {
    const original = await loadCorpus('xss_text.pdf');
    const scan = await pdfDefang.scan(original);
    expect(scan.risk_level).toBe('none');
    expect(scan.has_open_action).toBe(false);
    expect(scan.has_javascript).toBe(false);
    expect(sameBytes(await pdfDefang.sanitize(original), original)).toBe(true);
  });
});
