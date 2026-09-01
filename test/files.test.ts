import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { pdfDefang } from '../src/index.ts';
import { createNamedJavaScriptPdf, createOpenActionPdf } from './fixtures.ts';
import { catalogHas, namesHas, reload, sameBytes } from './inspect.ts';

async function tempPdf(bytes: Uint8Array): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'pdf-defang-js-'));
  const path = join(dir, 'doc.pdf');
  await writeFile(path, bytes);
  return path;
}

describe('pdfDefang.sanitizeFile', () => {
  it('leaves a missing file untouched and returns false', async () => {
    const path = join(tmpdir(), 'pdf-defang-js-missing', 'nope.pdf');
    expect(await pdfDefang.sanitizeFile(path)).toBe(false);
    const report = await pdfDefang.sanitizeFile(path, { returnReport: true });
    expect(report.modified).toBe(false);
    expect(report.error).not.toBe(null);
  });

  it('strips OpenAction in place and returns true', async () => {
    const path = await tempPdf(await createOpenActionPdf());
    expect(await pdfDefang.sanitizeFile(path)).toBe(true);
    expect(catalogHas(await reload(await readFile(path)), 'OpenAction')).toBe(false);
  });

  it('does not rewrite a clean file', async () => {
    const original = await createNamedJavaScriptPdf();
    const path = await tempPdf(original);
    await pdfDefang.sanitizeFile(path);
    const once = await readFile(path);
    expect(namesHas(await reload(once), 'JavaScript')).toBe(false);

    const before = once.slice();
    const report = await pdfDefang.sanitizeFile(path, { returnReport: true });
    expect(report.javascript_in_names).toBe(0);
    expect(sameBytes(await readFile(path), before)).toBe(true);
  });

  it('leaves garbage on disk and reports the error', async () => {
    const path = await tempPdf(new TextEncoder().encode('not a pdf'));
    const before = await readFile(path);
    const report = await pdfDefang.sanitizeFile(path, { returnReport: true });
    expect(report.error).not.toBe(null);
    expect(sameBytes(await readFile(path), before)).toBe(true);
  });
});

describe('pdfDefang.scanFile', () => {
  it('detects Names JavaScript without modifying the file', async () => {
    const original = await createNamedJavaScriptPdf();
    const path = await tempPdf(original);
    const report = await pdfDefang.scanFile(path);
    expect(report.has_javascript).toBe(true);
    expect(report.javascript_in_names).toBe(1);
    expect(report.risk_level).toBe('high');
    expect(sameBytes(await readFile(path), original)).toBe(true);
    expect(namesHas(await reload(await readFile(path)), 'JavaScript')).toBe(true);
  });

  it('returns an error report for a missing file', async () => {
    const report = await pdfDefang.scanFile(join(tmpdir(), 'pdf-defang-js-missing', 'nope.pdf'));
    expect(report.error).not.toBe(null);
    expect(report.risk_level).toBe('none');
  });
});
