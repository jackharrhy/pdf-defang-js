import { sanitizeFile, scanFile } from './files.ts';
import { sanitize } from './sanitize.ts';
import { scan } from './scan.ts';

export { SanitizeError } from './error.ts';
export { ScanReport, SanitizeReport } from './report.ts';
export type { ScanReportDict, SanitizeReportDict } from './report.ts';
export type { SanitizeResult } from './sanitize.ts';
export type { Level, RiskLevel, SanitizeOptions } from './types.ts';

export const pdfDefang: {
  sanitize: typeof sanitize;
  scan: typeof scan;
  sanitizeFile: typeof sanitizeFile;
  scanFile: typeof scanFile;
} = {
  sanitize,
  scan,
  sanitizeFile,
  scanFile,
};

export type PdfDefang = typeof pdfDefang;
