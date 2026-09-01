import { readFile, writeFile } from 'node:fs/promises';

import { SanitizeError } from './error.ts';
import { reportHasRemovals, SanitizeReport, ScanReport } from './report.ts';
import { sanitize } from './sanitize.ts';
import { scan } from './scan.ts';
import type { SanitizeOptions } from './types.ts';

export async function sanitizeFile(
  pdfPath: string,
  options?: Omit<SanitizeOptions, 'returnReport'> & { returnReport?: false },
): Promise<boolean>;
export async function sanitizeFile(
  pdfPath: string,
  options: Omit<SanitizeOptions, 'returnReport'> & { returnReport: true },
): Promise<SanitizeReport>;
export async function sanitizeFile(
  pdfPath: string,
  options: SanitizeOptions = {},
): Promise<boolean | SanitizeReport> {
  const report = new SanitizeReport();
  report.level = options.level ?? 'strict';

  let bytes: Uint8Array;
  try {
    bytes = await readFile(pdfPath);
  } catch (error) {
    report.error = describeFileError(error);
    return options.returnReport ? report : false;
  }

  report.file_size_before = bytes.byteLength;

  try {
    const result = await sanitize(bytes, {
      level: options.level,
      returnReport: true,
    });
    if (reportHasRemovals(result.report) && !sameBytes(result.bytes, bytes)) {
      await writeFile(pdfPath, result.bytes);
    }
    return options.returnReport ? result.report : true;
  } catch (error) {
    if (error instanceof SanitizeError) {
      return options.returnReport ? error.report : false;
    }
    report.error = describeFileError(error);
    return options.returnReport ? report : false;
  }
}

export async function scanFile(pdfPath: string): Promise<ScanReport> {
  try {
    const bytes = await readFile(pdfPath);
    return scan(bytes);
  } catch (error) {
    const failed = new ScanReport();
    failed.error = describeFileError(error);
    return failed;
  }
}

function describeFileError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  for (let i = 0; i < a.byteLength; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
