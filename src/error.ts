import type { SanitizeReport } from './report.ts';

export class SanitizeError extends Error {
  readonly report: SanitizeReport;
  readonly original: Uint8Array | undefined;

  constructor(
    message: string,
    options: { report: SanitizeReport; original?: Uint8Array },
  ) {
    super(message);
    this.name = 'SanitizeError';
    this.report = options.report;
    this.original = options.original;
  }
}
