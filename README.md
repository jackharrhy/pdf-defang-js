# pdf-defang-js

TypeScript port of [pdf-defang](https://github.com/kovetz-PDF/pdf-defang).

Strips what a PDF asks a viewer to run: JavaScript, OpenAction, Launch, unsafe URI schemes, XFA, and everything else on [their protections list](https://kovetz-pdf.github.io/pdf-defang/protections/). Text, images, layout, field values, bookmarks, metadata, and ordinary http(s)/mailto links stay.

It does not flatten or rasterize pages. The file is parsed in your process, so a crafted PDF can crash pdf-lib. If you need isolation, use a sandbox or [Dangerzone](https://dangerzone.rocks/). This package only strips active content.

## Install

```bash
npm install pdf-defang-js
```

ESM only. Node 20+.

```ts
import { SanitizeError, pdfDefang } from 'pdf-defang-js';

const raw = new Uint8Array(await file.arrayBuffer());
const found = await pdfDefang.scan(raw);

try {
  const clean = await pdfDefang.sanitize(raw); // level defaults to 'strict'
} catch (error) {
  if (error instanceof SanitizeError) {
    // unparseable or encrypted. error.original is the input. do not serve it.
  }
}

await pdfDefang.sanitizeFile('upload.pdf');
```

`balanced` keeps form JavaScript, SubmitForm, ResetForm, annotation `/AA` `/JS`, AcroForm `/CO`, and embedded files. Use it when the PDF is a form you need to keep working and you trust the source.

Encrypted PDFs are not supported. Decrypt with another library, then pass the result here.

## CLI

```bash
pdf-defang-js clean upload.pdf
pdf-defang-js scan upload.pdf --json
```

Exit codes: 0 clean / no risk, 1 stripped or risky, 2 failed.

## Credit

The threat model and strip matrix come from pdf-defang, MIT, built by [kovetz.co.il](https://kovetz.co.il). This package reimplements that behaviour on pdf-lib.
