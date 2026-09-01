#!/usr/bin/env node
import { parseArgs } from 'node:util';

import { sanitizeFile, scanFile } from './files.ts';
import { reportHasRemovals, type SanitizeReport, type ScanReport } from './report.ts';
import type { Level } from './types.ts';

const VERSION = '0.1.0';

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        version: { type: 'boolean', short: 'V' },
        help: { type: 'boolean', short: 'h' },
        level: { type: 'string', short: 'l' },
        json: { type: 'boolean', short: 'j' },
        quiet: { type: 'boolean', short: 'q' },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    return 2;
  }

  if (parsed.values.version) {
    console.log(`pdf-defang-js ${VERSION}`);
    return 0;
  }

  const [command, ...rest] = parsed.positionals;
  if (parsed.values.help || !command) {
    printHelp();
    return command ? 0 : 2;
  }

  if (command === 'clean') {
    return runClean(rest, parsed.values);
  }
  if (command === 'scan') {
    return runScan(rest, parsed.values);
  }

  printHelp();
  return 2;
}

type FlagValues = {
  level?: string;
  json?: boolean;
  quiet?: boolean;
};

async function runClean(files: string[], flags: FlagValues): Promise<number> {
  if (files.length === 0) {
    console.error('pdf-defang-js clean: missing file');
    return 2;
  }

  let level: Level = 'strict';
  try {
    level = parseCliLevel(flags.level);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }

  let anyFailed = false;
  let anyModified = false;
  const allResults: Array<Record<string, unknown>> = [];

  for (const filePath of files) {
    const report = await sanitizeFile(filePath, {
      returnReport: true,
      level,
    });

    if (report.error) {
      anyFailed = true;
      if (!flags.quiet) {
        console.error(`  ${filePath}: ERROR - ${report.error}`);
      }
      allResults.push({ file: filePath, ...report.asDict() });
      continue;
    }

    if (reportHasRemovals(report)) {
      anyModified = true;
    }

    if (flags.json) {
      allResults.push({ file: filePath, ...report.asDict() });
    } else if (!flags.quiet) {
      if (reportHasRemovals(report)) {
        console.log(`  ${filePath}: cleaned (${summarizeReport(report)})`);
      } else {
        console.log(`  ${filePath}: already clean`);
      }
    }
  }

  if (flags.json) {
    console.log(JSON.stringify(allResults, null, 2));
  }

  if (anyFailed) {
    return 2;
  }
  if (anyModified) {
    return 1;
  }
  return 0;
}

async function runScan(files: string[], flags: FlagValues): Promise<number> {
  const filePath = files[0];
  if (!filePath || files.length !== 1) {
    console.error('pdf-defang-js scan: expected one file');
    return 2;
  }

  const report = await scanFile(filePath);
  if (flags.json) {
    console.log(JSON.stringify({ file: filePath, ...report.asDict() }, null, 2));
  } else {
    emitScanHuman(filePath, report);
  }

  if (report.error) {
    return 2;
  }
  if (report.risk_level === 'none') {
    return 0;
  }
  return 1;
}

function parseCliLevel(level: string | undefined): Level {
  const value = level ?? 'strict';
  if (value === 'strict' || value === 'balanced') {
    return value;
  }
  throw new Error(`level must be 'strict' or 'balanced', got ${JSON.stringify(level)}`);
}

function summarizeReport(report: SanitizeReport): string {
  const parts: string[] = [];
  if (report.javascript_in_names) {
    parts.push(`${report.javascript_in_names} JS`);
  }
  if (report.open_action_removed) {
    parts.push('OpenAction');
  }
  if (report.document_aa_removed) {
    parts.push('/AA');
  }
  if (report.xfa_form_removed) {
    parts.push('XFA');
  }
  if (report.embedded_files) {
    parts.push(`${report.embedded_files} embedded`);
  }
  if (report.pages_with_aa) {
    parts.push(`${report.pages_with_aa} page /AA`);
  }
  if (report.annotations_with_actions) {
    parts.push(`${report.annotations_with_actions} annot actions`);
  }
  if (report.annotations_with_js) {
    parts.push(`${report.annotations_with_js} annot JS`);
  }
  if (report.dangerous_uris_removed) {
    parts.push(`${report.dangerous_uris_removed} dangerous URIs`);
  }
  return parts.join(', ') || 'nothing';
}

function emitScanHuman(filePath: string, report: ScanReport): void {
  console.log(`PDF: ${filePath}`);
  if (report.error) {
    console.log(`  ERROR: ${report.error}`);
    return;
  }
  console.log(`  pages: ${report.page_count}`);
  console.log(`  size: ${report.file_size.toLocaleString('en-US')} bytes`);
  console.log(`  risk: ${report.risk_level.toUpperCase()}`);
  if (report.has_javascript) {
    console.log(`  - document JavaScript: ${report.javascript_in_names} entries`);
  }
  if (report.has_open_action) {
    console.log('  - /OpenAction set (auto-execute on open)');
  }
  if (report.has_document_aa) {
    console.log('  - document /AA set (auto-execute on navigation)');
  }
  if (report.has_xfa_form) {
    console.log('  - XFA form');
  }
  if (report.has_embedded_files) {
    console.log(`  - embedded files: ${report.embedded_files_count}`);
  }
  if (report.pages_with_aa) {
    console.log(`  - pages with /AA: ${report.pages_with_aa}`);
  }
  if (report.annotations_with_actions) {
    const types = report.annotation_action_types.join(', ') || 'various';
    console.log(`  - dangerous annotation actions: ${report.annotations_with_actions} (${types})`);
  }
  if (report.annotations_with_js) {
    console.log(`  - annotations with /JS: ${report.annotations_with_js}`);
  }
  if (report.dangerous_uris) {
    const schemes = report.dangerous_uri_schemes.map((scheme) => `${scheme}:`).join(', ') || 'unknown';
    console.log(`  - dangerous URIs: ${report.dangerous_uris} (${schemes})`);
  }
  if (report.risk_level === 'none') {
    console.log('  no active content detected');
  }
}

function printHelp(): void {
  console.log(`Usage: pdf-defang-js <command> [options]

Commands:
  clean <file> [...]   Sanitize PDF(s) in place
  scan <file>          Inspect a PDF without modifying it

Options:
  -l, --level <level>  strict (default) or balanced
  -j, --json           JSON report
  -q, --quiet          Suppress per-file output (clean)
  -V, --version
`);
}

function isCliEntry(): boolean {
  const entry = process.argv[1]?.replaceAll('\\', '/') ?? '';
  return entry.endsWith('/cli.js') || entry.endsWith('/cli.ts') || entry.endsWith('/pdf-defang-js');
}

if (isCliEntry()) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      console.error(error);
      process.exitCode = 2;
    },
  );
}
