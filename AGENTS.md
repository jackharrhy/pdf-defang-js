# pdf-defang-js

A TypeScript library that strips active content from PDFs. Call site is `pdfDefang.sanitize` / `pdfDefang.scan` (bytes or files), plus a CLI. npm name and bin are `pdf-defang-js`.

It removes what a PDF asks a viewer to run: JavaScript, OpenAction, Launch, unsafe URIs, XFA, and the rest of the pdf-defang matrix. Text, images, layout, field values, bookmarks, metadata, and ordinary http(s)/mailto links stay.

## Based on

Port of [pdf-defang](https://github.com/kovetz-PDF/pdf-defang) (MIT, Python + pikepdf) by [kovetz.co.il](https://kovetz.co.il). Their [protections](https://kovetz-pdf.github.io/pdf-defang/protections/) page is the strip matrix. Docs: https://kovetz-pdf.github.io/pdf-defang/

This package reimplements that behaviour on pdf-lib. Keep MIT, credit them, link the Python repo. Do not copy their README. Do not take the `pdf-defang` command; that is the Python CLI. Do not vendor their source.

## Headspace

Match their threat model. Do not invent a new one.

In scope: content the PDF asks a viewer to execute. Out of scope: viewer parser crashes, encrypted files, flattening, rasterizing, antivirus, network lookups. The file is parsed in-process. This is not Dangerzone and should not be marketed as CDR.

`strict` is the default. `balanced` keeps the form and portfolio pieces they keep (form JS, SubmitForm, ResetForm, annot `/AA` `/JS`, AcroForm `/CO`, EmbeddedFiles). If a slot is on their list, strip or report it. If it is not, leave it. Report field names should stay close enough that Python and JS logs look like the same shape.

Fail loudly on the bytes API. Unparseable or encrypted input throws `SanitizeError`; do not return the original bytes and call it clean. `sanitizeFile` can leave the file and put `error` on the report. There is no `password` option. Decrypt elsewhere, then call this on the plaintext.

The walk has to finish. Visit page Annots and the AcroForm Fields/Kids tree once each. Follow `/A /Next` (dict or array). Walk with an explicit stack or queue and a seen set: cycles stop, and a long unique chain must not blow the stack. A throw mid-walk is a bug: catalog hooks already found would never get written. Fail on parse and encrypt; do not fail-open.

Preserve visible content. Do not rewrite page content streams. Use pdf-lib, not a qpdf/pikepdf native dependency. After a successful load, hex names and object streams are already visible.

The public surface is the `pdfDefang` namespace, `SanitizeError`, report classes, and the option/report types. Do not export loose `sanitize` / `scan` functions.

Tests are the contract. Assert literals, not whatever the current walk returned. Real PDFs store URI as a string; fixtures use `PDFString.of(...)` because `context.obj({ URI: '...' })` stores a name. Scan should still see a slot that sanitize removes.

TypeScript, ESM, Node 20+, Vitest.
