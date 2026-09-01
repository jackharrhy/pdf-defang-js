import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { main } from '../src/cli.ts';
import { createCleanPdf, createNamedJavaScriptPdf } from './fixtures.ts';

async function tempPdf(bytes: Uint8Array): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'pdf-defang-js-cli-'));
  const path = join(dir, 'doc.pdf');
  await writeFile(path, bytes);
  return path;
}

describe('cli main()', () => {
  it('clean exits 1 when something was stripped', async () => {
    const path = await tempPdf(await createNamedJavaScriptPdf());
    expect(await main(['clean', '--quiet', path])).toBe(1);
  });

  it('clean exits 0 on an already-clean file', async () => {
    const path = await tempPdf(await createCleanPdf());
    expect(await main(['clean', '--quiet', path])).toBe(0);
  });

  it('clean exits 2 when a file is missing', async () => {
    expect(await main(['clean', '--quiet', join(tmpdir(), 'pdf-defang-js-nope.pdf')])).toBe(2);
  });

  it('scan exits 1 on high-risk content', async () => {
    const path = await tempPdf(await createNamedJavaScriptPdf());
    expect(await main(['scan', '--json', path])).toBe(1);
  });

  it('scan exits 0 on a clean PDF', async () => {
    const path = await tempPdf(await createCleanPdf());
    expect(await main(['scan', '--json', path])).toBe(0);
  });
});
