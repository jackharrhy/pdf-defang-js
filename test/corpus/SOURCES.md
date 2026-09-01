# Public corpus

These PDFs are not shipped on npm. They are test inputs only.

## klausnitzer/pentest-pdf-collection

Harmless simulated malicious PDFs for pentest labs.

- `js_annot.pdf`: OpenAction JavaScript alert
- `attach_scripts.pdf`: three EmbeddedFiles (hello.sh / .bat / .ps1)
- `xss_text.pdf`: XSS payload as visible text only (no PDF actions)

https://github.com/klausnitzer/pentest-pdf-collection

## luigigubello/PayloadsAllThePDFs

Viewer XSS / JavaScript test PDFs.

- `payload1.pdf`: OpenAction JS plus `data:` URI
- `payload2.pdf`: OpenAction JS plus a schemeless HTML-injection URI (kept)
- `payload3.pdf`: OpenAction JS plus `file:` URI
- `payload7.pdf`: annotation `/AA` JavaScript
- `payload8.pdf`: PDF.js FontMatrix XSS. Out of scope for this library.
- `foxit-reader-poc.pdf`: annotation `/AA` JavaScript
- `starter_pack.pdf`: OpenAction JS plus an https URI (kept)

https://github.com/luigigubello/PayloadsAllThePDFs
