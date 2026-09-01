# Build brief: pdf-defang-js

Port [kovetz-PDF/pdf-defang](https://github.com/kovetz-PDF/pdf-defang) (MIT, Python + pikepdf) to TypeScript. Do not invent a new threat model. Match their API and strip matrix. Publish as `pdf-defang-js`.

This folder started as notes only. There is no library code here on purpose.

## Why this exists

A Node web app that accepts PDF uploads has no drop-in sanitizer on npm. Searches for `pdf sanitize`, `pdf javascript remove`, `pdf-defang`, and `pdf active content` return parsers, viewers, and HTML sanitizers.

Closest prior art:

- **pdf-defang (PyPI)** — the thing to port. `scan` / `sanitize` / `sanitize_bytes`, `strict` vs `balanced`. Docs: https://kovetz-pdf.github.io/pdf-defang/
- **pdf-lib discussion #1438** — people paste their own catalog / Annots walk. That is the usual Node pattern, not a library.
- **pdf-xss-checker** — detect-only regex on extracted text. Not a rewrite.
- **@coroboros/pdf-cleaner** — pdf-lib, but only links + metadata. JS strip is out of scope.
- **unpdf / pdf-parse / pdf.js** — extract or render.
- **Dangerzone / Ghostscript pdfwrite** — flatten / rasterize. Different product.

A working TypeScript sketch of the `strict` walk (pdf-lib, fail-open, Astron-shaped API) lives in another repo: `~/repos/gndctl/astron/src/lib/pdf/disarmPdf.ts` and its tests. Use that as a starting implementation, not as the public API. This package should look like Python pdf-defang, not like Astron.

## Name and license

- This package: `pdf-defang-js` on npm. CLI bin: `pdf-defang-js` (do not take the `pdf-defang` command; that is the Python CLI).
- Python package and GitHub repo stay `pdf-defang`, MIT, built by [kovetz.co.il](https://kovetz.co.il).
- Keep MIT. Credit them in README. Link the Python repo. Do not copy their README prose wholesale.
- A courtesy note to contact@kovetz.co.il is nice. It is not a blocker.

## Public API to match

Python surface (from their README / `pdf_defang` package):

```ts
sanitize(path, options?: { password?: string; level?: 'strict' | 'balanced' }): Promise<boolean>
sanitize(path, options: { returnReport: true; password?: string; level?: 'strict' | 'balanced' }): Promise<SanitizeReport>

scan(path): Promise<ScanReport>

sanitizeBytes(bytes, options?: { password?: string; level?: 'strict' | 'balanced' }): Promise<Uint8Array>
scanBytes(bytes): Promise<ScanReport>
```

Also a small CLI later: `pdf-defang-js clean`, `pdf-defang-js scan`, `--level`, `--json`, exit codes 0 / 1 / 2 as in the Python CLI.

`SanitizeError` on unparseable or encrypted-without-password for the bytes API. Do not silently return the original bytes from `sanitizeBytes`. File `sanitize()` can leave the file untouched and return a report with `error`, matching Python.

Default `level` is `strict`.

## What to strip

Canonical matrix: https://kovetz-pdf.github.io/pdf-defang/protections/

Both levels:

- Names `/JavaScript`
- Catalog `/OpenAction`, catalog `/AA`
- AcroForm `/XFA`
- Page `/AA`
- Annotation `/A` types: Launch, ImportData, GoToR, GoToE, Movie, Sound, Rendition
- URI actions whose scheme is not in the safe list (http, https, mailto, tel, ftp, sftp, news, nntp, irc, ircs, magnet). Relative URIs stay. `javascript:`, `file:`, `data:`, `vbscript:`, UNC go.

`strict` also:

- Annotation `/A` JavaScript, SubmitForm, ResetForm
- Annotation `/AA` and `/JS`
- AcroForm `/CO`
- Names `/EmbeddedFiles`

`balanced` keeps those form / portfolio pieces.

Walk page `Annots` and the AcroForm `Fields` / `Kids` tree. Same widget can appear in both; visit once.

Preserve visible content: text, images, layout, field values, bookmarks, metadata, safe http(s)/mailto links.

## Parser

Use **pdf-lib** (pure JS, already common in Node apps). Do not take a qpdf / pikepdf native dependency for v1.

pdf-lib will not open some encrypted or corrupt files. That is fine: raise `SanitizeError`, do not claim a clean file.

After a successful load, hex names and object streams are already visible. Do not treat those as a separate miss.

pdf-lib `context.obj({ URI: 'javascript:...' })` stores a name, not a string. Real PDFs use strings. Tests must use `PDFString.of(...)`.

## Threat model (copy their honesty)

In scope: content the PDF asks a viewer to execute.

Out of scope: viewer parser memory-corruption. This library parses the file in-process. It is not Dangerzone.

Say that in the README. Do not market it as a CDR product.

## Suggested layout

```
src/index.ts          // public exports
src/sanitize.ts       // file + bytes
src/scan.ts
src/strip.ts          // shared walk
src/report.ts         // SanitizeReport / ScanReport / risk_level
src/uri.ts
src/cli.ts            // later
test/                 // fixtures generated like the Python tests
```

TypeScript, ESM, Node 20+. Vitest or node:test. No extra framework.

Ship `sanitize` / `scan` / `sanitizeBytes` / `scanBytes` and the report types. CLI can be a follow-up.

## Reports

Mirror the Python fields enough that a FastAPI shop and a Next.js shop can log the same shapes:

- `modified`, `level`, `error`
- `javascript_in_names`, `embedded_files`, `open_action_removed`, `document_aa_removed`, `xfa_form_removed`, `calculation_order_removed`
- `pages_with_aa`, `annotations_with_actions`, `annotation_action_types`, `annotations_with_js`
- `dangerous_uris_removed`, `dangerous_uri_schemes_removed`
- scan: `has_javascript`, `has_open_action`, `risk_level` (`high` / `medium` / `low` / `none`) using their rules

`asDict()` / `toJSON()` for logs.

## Tests

Port the Python fixtures in `tests/fixtures/generate_fixtures.py` (OpenAction, Names JS, page AA, XFA, widget JS, Launch, SubmitForm, annotation AA/JS, embedded files, kitchen sink).

Assert:

- clean PDF: same bytes, or at least no rewrite
- each slot: key gone after `sanitizeBytes`, still present after `scan`
- `balanced` keeps form JS / SubmitForm / CO / EmbeddedFiles
- `strict` removes them
- https link stays
- `javascript:` URI goes
- corrupt / not-pdf / encrypted without password: error, original bytes unchanged

Do not recompute the expected report by running the implementation. Use literals.

## Do not

- Copy Astron's `disarmPdfBytes` logger / S3 / fail-open ingest policy into this package. Fail-open is an app choice. This library should fail loudly on the bytes API.
- Flatten, rasterize, or rewrite page content streams.
- Add antivirus, VirusTotal, or a network call.
- Publish to npm until the strip matrix has tests.
- Vendor the Python source. Read it, reimplement against pdf-lib.

## First PR for the builder

1. `package.json` name `pdf-defang-js` + pdf-lib + TypeScript.
2. `sanitizeBytes` / `scanBytes` for `strict` only, with fixtures.
3. Add `balanced`.
4. File path helpers.
5. README that matches their threat-model section, shorter.
6. Publish when tests are green.
