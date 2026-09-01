import type { PDFDocument } from 'pdf-lib';

import { SanitizeError } from './error.ts';
import { describeLoadFailure, loadPdf } from './load.ts';
import { reportHasRemovals, SanitizeReport } from './report.ts';
import { stripDocument } from './strip.ts';
import { parseLevel, type SanitizeOptions } from './types.ts';

export type SanitizeResult = {
  bytes: Uint8Array;
  report: SanitizeReport;
};

export async function sanitize(
  bytes: Uint8Array,
  options?: Omit<SanitizeOptions, 'returnReport'> & { returnReport?: false },
): Promise<Uint8Array>;
export async function sanitize(
  bytes: Uint8Array,
  options: Omit<SanitizeOptions, 'returnReport'> & { returnReport: true },
): Promise<SanitizeResult>;
export async function sanitize(
  bytes: Uint8Array,
  options: SanitizeOptions = {},
): Promise<Uint8Array | SanitizeResult> {
  const level = parseLevel(options.level);
  const report = new SanitizeReport();
  report.level = level;
  report.file_size_before = bytes.byteLength;

  let pdf: PDFDocument;
  try {
    pdf = await loadPdf(bytes);
  } catch (error) {
    const failure = describeLoadFailure(error);
    report.error = failure.message;
    throw new SanitizeError(failure.message, { report, original: bytes });
  }

  stripDocument(pdf, report, level);

  if (!reportHasRemovals(report)) {
    report.file_size_after = bytes.byteLength;
    return options.returnReport ? { bytes, report } : bytes;
  }

  const cleaned = await pdf.save();
  report.modified = true;
  report.file_size_after = cleaned.byteLength;
  return options.returnReport ? { bytes: cleaned, report } : cleaned;
}
