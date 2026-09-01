# pdf-defang-js

Port [kovetz-PDF/pdf-defang](https://github.com/kovetz-PDF/pdf-defang) (MIT, Python + pikepdf) to TypeScript. Do not invent a new threat model. Match their strip matrix and report fields. The JS call site is a namespace object (`pdfDefang`), not a Python-shaped bag of loose functions. Publish as `pdf-defang-js`.

## Why this exists

A Node web app that accepts PDF uploads has no drop-in sanitizer on npm. Searches for `pdf sanitize`, `pdf javascript remove`, `pdf-defang`, and `pdf active content` return parsers, viewers, and HTML sanitizers.

Closest prior art:

- pdf-defang (PyPI): the thing to port. `scan` / `sanitize` / `sanitize_bytes`, `strict` vs `balanced`. Docs: https://kovetz-pdf.github.io/pdf-defang/
- pdf-lib discussion #1438: people paste their own catalog / Annots walk. That is the usual Node pattern, not a library.
- pdf-xss-checker: detect-only regex on extracted text. Not a rewrite.
- @coroboros/pdf-cleaner: pdf-lib, but only links + metadata. JS strip is out of scope.
- unpdf / pdf-parse / pdf.js: extract or render.
- Dangerzone / Ghostscript pdfwrite: flatten / rasterize. Different product.

## Name and license

- This package: `pdf-defang-js` on npm. CLI bin: `pdf-defang-js` (do not take the `pdf-defang` command; that is the Python CLI).
- Python package and GitHub repo stay `pdf-defang`, MIT, built by [kovetz.co.il](https://kovetz.co.il).
- Keep MIT. Credit them in README. Link the Python repo. Do not copy their README prose wholesale.
- A courtesy note to contact@kovetz.co.il is nice. It is not a blocker.

## Public API

```ts
import { pdfDefang, SanitizeError } from 'pdf-defang-js'

pdfDefang.sanitize(bytes, options?: { level?: 'strict' | 'balanced' }): Promise<Uint8Array>
pdfDefang.sanitize(bytes, options: { returnReport: true; level?: 'strict' | 'balanced' }): Promise<SanitizeResult>

pdfDefang.scan(bytes): Promise<ScanReport>

pdfDefang.sanitizeFile(path, options?: { level?: 'strict' | 'balanced' }): Promise<boolean>
pdfDefang.sanitizeFile(path, options: { returnReport: true; level?: 'strict' | 'balanced' }): Promise<SanitizeReport>

pdfDefang.scanFile(path): Promise<ScanReport>
```

Export `pdfDefang`, `SanitizeError`, report classes, and the option/report types. Do not export loose `sanitize` / `scan` functions.

`pdfDefang.sanitize` is the bytes API: throws `SanitizeError` on unparseable or encrypted files. Do not silently return the original bytes. `pdfDefang.sanitizeFile` can leave the file untouched and return a report with `error`.

Encrypted PDFs are out of scope. There is no `password` option. Decrypt with another library, then call this on the plaintext.

CLI: `pdf-defang-js clean`, `pdf-defang-js scan`, `--level`, `--json`, exit codes 0 / 1 / 2 as in the Python CLI.

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

Encrypted files are out of scope. Raise `SanitizeError` (or a scan report with `is_encrypted`). Do not claim a clean file. Callers who need to open encrypted PDFs should decrypt them elsewhere first.

Corrupt files also fail. That is fine.

After a successful load, hex names and object streams are already visible. Do not treat those as a separate miss.

pdf-lib `context.obj({ URI: 'javascript:...' })` stores a name, not a string. Real PDFs use strings. Tests must use `PDFString.of(...)`.

## Threat model (copy their honesty)

In scope: content the PDF asks a viewer to execute.

Out of scope: viewer parser memory-corruption, and encrypted PDFs. This library parses the file in-process. It is not Dangerzone.

Say that in the README. Do not market it as a CDR product.

## Layout

```
src/index.ts
src/sanitize.ts       bytes API
src/files.ts          path helpers
src/scan.ts
src/strip.ts          shared walk
src/pdf.ts            dict helpers and Fields/Annots visit
src/load.ts
src/uri.ts
src/report.ts
src/error.ts
src/types.ts
src/cli.ts
test/
```

TypeScript, ESM, Node 20+. Vitest. No extra framework.

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
- each slot: key gone after `pdfDefang.sanitize`, still present after `pdfDefang.scan`
- `balanced` keeps form JS / SubmitForm / CO / EmbeddedFiles
- `strict` removes them
- https link stays
- `javascript:` URI goes
- corrupt / not-pdf / encrypted: error, original bytes unchanged

Do not recompute the expected report by running the implementation. Use literals.

## Do not

- Fail-open on the bytes API. That is an app choice. This library should fail loudly.
- Flatten, rasterize, or rewrite page content streams.
- Add antivirus, VirusTotal, or a network call.
- Publish to npm until the strip matrix has tests.
- Vendor the Python source. Read it, reimplement against pdf-lib.
