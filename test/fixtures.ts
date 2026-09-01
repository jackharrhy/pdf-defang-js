import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFObject,
  PDFString,
  type PDFPage,
  type PDFRef,
} from 'pdf-lib';

async function newPdf(pageCount = 2): Promise<{ pdf: PDFDocument; pages: PDFPage[] }> {
  const pdf = await PDFDocument.create();
  const pages: PDFPage[] = [];
  for (let i = 0; i < pageCount; i += 1) {
    pages.push(pdf.addPage([612, 792]));
  }
  return { pdf, pages };
}

function register(pdf: PDFDocument, object: PDFObject): PDFRef {
  return pdf.context.register(object);
}

function setAnnots(pdf: PDFDocument, page: PDFPage, refs: PDFRef[]): void {
  page.node.set(PDFName.of('Annots'), pdf.context.obj(refs));
}

export async function createCleanPdf(): Promise<Uint8Array> {
  const { pdf } = await newPdf(2);
  return pdf.save();
}

export async function createNamedJavaScriptPdf(): Promise<Uint8Array> {
  const { pdf } = await newPdf(2);
  const jsAction = register(
    pdf,
    pdf.context.obj({
      S: 'JavaScript',
      JS: PDFString.of("app.alert('hello');"),
    }),
  );
  pdf.catalog.set(
    PDFName.of('Names'),
    pdf.context.obj({
      JavaScript: {
        Names: [PDFString.of('OnLoad'), jsAction],
      },
    }),
  );
  return pdf.save();
}

export async function createOpenActionPdf(): Promise<Uint8Array> {
  const { pdf } = await newPdf(2);
  pdf.catalog.set(
    PDFName.of('OpenAction'),
    pdf.context.obj({
      S: 'JavaScript',
      JS: PDFString.of("app.alert('opened');"),
    }),
  );
  return pdf.save();
}

export async function createEmbeddedFilesPdf(): Promise<Uint8Array> {
  const { pdf } = await newPdf(2);
  const fileSpec = register(
    pdf,
    pdf.context.obj({
      Type: 'Filespec',
      F: PDFString.of('note.txt'),
      EF: {
        F: pdf.context.stream('This is an embedded file.', { Type: 'EmbeddedFile' }),
      },
    }),
  );
  pdf.catalog.set(
    PDFName.of('Names'),
    pdf.context.obj({
      EmbeddedFiles: {
        Names: [PDFString.of('note.txt'), fileSpec],
      },
    }),
  );
  return pdf.save();
}

export async function createLaunchAnnotPdf(): Promise<Uint8Array> {
  const { pdf, pages } = await newPdf(2);
  const annot = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [100, 100, 200, 120],
      A: {
        S: 'Launch',
        F: PDFString.of('calc.exe'),
      },
    }),
  );
  setAnnots(pdf, pages[0]!, [annot]);
  return pdf.save();
}

export async function createDangerousUrisPdf(): Promise<Uint8Array> {
  const { pdf, pages } = await newPdf(2);
  // Real PDFs store URI as a string. context.obj({ URI: '...' }) would store a name.
  const jsUri = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [50, 50, 200, 70],
      A: {
        S: 'URI',
        URI: PDFString.of("javascript:alert('xss')"),
      },
    }),
  );
  const fileUri = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [50, 80, 200, 100],
      A: {
        S: 'URI',
        URI: PDFString.of('file:///C:/Windows/System32/calc.exe'),
      },
    }),
  );
  const uncUri = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [50, 110, 200, 130],
      A: {
        S: 'URI',
        URI: PDFString.of('\\\\attacker.com\\share\\malware.exe'),
      },
    }),
  );
  const httpsUri = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [50, 140, 200, 160],
      A: {
        S: 'URI',
        URI: PDFString.of('https://example.com/safe'),
      },
    }),
  );
  setAnnots(pdf, pages[0]!, [jsUri, fileUri, uncUri, httpsUri]);
  return pdf.save();
}

export async function createGoToRPdf(): Promise<Uint8Array> {
  const { pdf, pages } = await newPdf(2);
  const annot = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [100, 100, 200, 120],
      A: {
        S: 'GoToR',
        F: PDFString.of('\\\\attacker.com\\share\\evil.pdf'),
      },
    }),
  );
  setAnnots(pdf, pages[0]!, [annot]);
  return pdf.save();
}

export async function createMovieSoundPdf(): Promise<Uint8Array> {
  const { pdf, pages } = await newPdf(2);
  const movie = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [50, 50, 200, 70],
      A: {
        S: 'Movie',
        T: PDFString.of('movie title'),
      },
    }),
  );
  const sound = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [50, 80, 200, 100],
      A: {
        S: 'Sound',
      },
    }),
  );
  setAnnots(pdf, pages[0]!, [movie, sound]);
  return pdf.save();
}

export async function createFormActionsPdf(): Promise<Uint8Array> {
  const { pdf, pages } = await newPdf(2);
  const submit = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      Rect: [100, 100, 200, 120],
      A: {
        S: 'SubmitForm',
        F: PDFString.of('https://example.com/post'),
      },
    }),
  );
  const reset = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      Rect: [100, 130, 200, 150],
      A: { S: 'ResetForm' },
    }),
  );
  const jsButton = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      Rect: [100, 160, 200, 180],
      A: {
        S: 'JavaScript',
        JS: PDFString.of("this.getField('total').value = a + b;"),
      },
    }),
  );
  const aaAnnot = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      Rect: [100, 190, 200, 210],
      AA: {
        C: {
          S: 'JavaScript',
          JS: PDFString.of("event.value = this.getField('a').value * 1.17;"),
        },
      },
      JS: PDFString.of("this.getField('inline').value = 'computed';"),
    }),
  );
  const fileSpec = register(
    pdf,
    pdf.context.obj({
      Type: 'Filespec',
      F: PDFString.of('attachment.txt'),
      EF: {
        F: pdf.context.stream('portfolio attachment', { Type: 'EmbeddedFile' }),
      },
    }),
  );
  pdf.catalog.set(
    PDFName.of('Names'),
    pdf.context.obj({
      EmbeddedFiles: {
        Names: [PDFString.of('attachment.txt'), fileSpec],
      },
    }),
  );
  pdf.catalog.set(
    PDFName.of('AcroForm'),
    pdf.context.obj({
      Fields: [submit, reset, jsButton, aaAnnot],
      CO: [aaAnnot],
    }),
  );
  setAnnots(pdf, pages[0]!, [submit, reset, jsButton, aaAnnot]);
  return pdf.save();
}

export async function createKitchenSinkPdf(): Promise<Uint8Array> {
  const { pdf, pages } = await newPdf(3);
  const jsAction = register(
    pdf,
    pdf.context.obj({
      S: 'JavaScript',
      JS: PDFString.of("app.alert('x');"),
    }),
  );
  const fileSpec = register(
    pdf,
    pdf.context.obj({
      Type: 'Filespec',
      F: PDFString.of('note.txt'),
      EF: {
        F: pdf.context.stream('embedded', { Type: 'EmbeddedFile' }),
      },
    }),
  );
  pdf.catalog.set(
    PDFName.of('Names'),
    pdf.context.obj({
      JavaScript: {
        Names: [PDFString.of('OnLoad'), jsAction],
      },
      EmbeddedFiles: {
        Names: [PDFString.of('note.txt'), fileSpec],
      },
    }),
  );
  pdf.catalog.set(
    PDFName.of('OpenAction'),
    pdf.context.obj({
      S: 'JavaScript',
      JS: PDFString.of('x();'),
    }),
  );
  pdf.catalog.set(
    PDFName.of('AA'),
    pdf.context.obj({
      O: {
        S: 'JavaScript',
        JS: PDFString.of('x();'),
      },
    }),
  );
  pages[0]!.node.set(
    PDFName.of('AA'),
    pdf.context.obj({
      O: {
        S: 'JavaScript',
        JS: PDFString.of('x();'),
      },
    }),
  );
  const launch = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [100, 100, 200, 120],
      A: {
        S: 'Launch',
        F: PDFString.of('calc.exe'),
      },
    }),
  );
  const jsAnnot = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [100, 100, 200, 120],
      A: {
        S: 'JavaScript',
        JS: PDFString.of('alert(1)'),
      },
    }),
  );
  setAnnots(pdf, pages[0]!, [launch]);
  setAnnots(pdf, pages[1]!, [jsAnnot]);
  return pdf.save();
}

export async function createXfaPdf(): Promise<Uint8Array> {
  const { pdf } = await newPdf(1);
  pdf.catalog.set(
    PDFName.of('AcroForm'),
    pdf.context.obj({
      Fields: [],
      XFA: pdf.context.stream(
        "<script contentType='application/x-javascript'>app.alert(1)</script>",
      ),
    }),
  );
  return pdf.save();
}

export async function createAcroFormOnlyWidgetPdf(): Promise<Uint8Array> {
  const { pdf } = await newPdf(1);
  const widget = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      Rect: [100, 100, 200, 120],
      A: {
        S: 'JavaScript',
        JS: PDFString.of('app.alert(1)'),
      },
    }),
  );
  pdf.catalog.set(
    PDFName.of('AcroForm'),
    pdf.context.obj({
      Fields: [widget],
    }),
  );
  return pdf.save();
}

export async function createAnnotJsOnlyPdf(): Promise<Uint8Array> {
  const { pdf, pages } = await newPdf(1);
  const annot = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      Rect: [100, 100, 200, 120],
      JS: PDFString.of("this.getField('x').value = 1"),
    }),
  );
  setAnnots(pdf, pages[0]!, [annot]);
  return pdf.save();
}

export async function createEncryptedPdf(): Promise<Uint8Array> {
  const { pdf } = await newPdf(1);
  pdf.context.trailerInfo.Encrypt = pdf.context.obj({ Filter: 'Standard' });
  return pdf.save();
}

export async function createImportDataRenditionGoToEPdf(): Promise<Uint8Array> {
  const { pdf, pages } = await newPdf(1);
  const importData = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [0, 0, 20, 20],
      A: { S: 'ImportData', F: PDFString.of('data.fdf') },
    }),
  );
  const rendition = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Screen',
      Rect: [20, 0, 40, 20],
      A: { S: 'Rendition' },
    }),
  );
  const gotoE = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [40, 0, 60, 20],
      A: { S: 'GoToE', F: PDFString.of('embedded.pdf') },
    }),
  );
  setAnnots(pdf, pages[0]!, [importData, rendition, gotoE]);
  return pdf.save();
}

export async function createNestedKidsWidgetPdf(): Promise<Uint8Array> {
  const { pdf } = await newPdf(1);
  const widget = register(
    pdf,
    pdf.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      Rect: [100, 100, 200, 120],
      A: {
        S: 'JavaScript',
        JS: PDFString.of('app.alert(1)'),
      },
    }),
  );
  const parent = register(
    pdf,
    pdf.context.obj({
      Kids: [widget],
    }),
  );
  pdf.catalog.set(
    PDFName.of('AcroForm'),
    pdf.context.obj({
      Fields: [parent],
    }),
  );
  return pdf.save();
}

export async function createHexNameJavaScriptPdf(): Promise<Uint8Array> {
  return new TextEncoder().encode(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R /Names 4 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
4 0 obj
<< /#4A#61#76#61#53#63#72#69#70#74 5 0 R >>
endobj
5 0 obj
<< /Names [(OnLoad) 6 0 R] >>
endobj
6 0 obj
<< /S /JavaScript /JS (app.alert\\(1\\);) >>
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000131 00000 n 
0000000202 00000 n 
0000000258 00000 n 
0000000308 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
370
%%EOF
`);
}

export function pageAnnots(pdf: PDFDocument, pageIndex = 0): PDFDict[] {
  const annots = pdf.getPages()[pageIndex]?.node.lookup(PDFName.of('Annots'));
  if (!(annots instanceof PDFArray)) {
    return [];
  }
  const dicts: PDFDict[] = [];
  for (let i = 0; i < annots.size(); i += 1) {
    const dict = annots.lookup(i);
    if (dict instanceof PDFDict) {
      dicts.push(dict);
    }
  }
  return dicts;
}

export function firstAcroFormField(pdf: PDFDocument): PDFDict {
  const acroForm = pdf.catalog.lookup(PDFName.of('AcroForm'));
  if (!(acroForm instanceof PDFDict)) {
    throw new Error('expected AcroForm');
  }
  const fields = acroForm.lookup(PDFName.of('Fields'));
  if (!(fields instanceof PDFArray)) {
    throw new Error('expected Fields');
  }
  const field = fields.lookup(0);
  if (!(field instanceof PDFDict)) {
    throw new Error('expected field dict');
  }
  return field;
}

export function actionTypesOnPages(pdf: PDFDocument): string[] {
  const types: string[] = [];
  for (let i = 0; i < pdf.getPageCount(); i += 1) {
    for (const annot of pageAnnots(pdf, i)) {
      const action = annot.lookup(PDFName.of('A'));
      if (!(action instanceof PDFDict)) {
        continue;
      }
      const type = action.lookup(PDFName.of('S'));
      if (type instanceof PDFName) {
        types.push(type.asString());
      }
    }
  }
  return types;
}

export function remainingUris(pdf: PDFDocument): string[] {
  const uris: string[] = [];
  for (const annot of pageAnnots(pdf, 0)) {
    const action = annot.lookup(PDFName.of('A'));
    if (!(action instanceof PDFDict)) {
      continue;
    }
    const type = action.lookup(PDFName.of('S'));
    if (!(type instanceof PDFName) || type.asString() !== '/URI') {
      continue;
    }
    const uri = action.lookup(PDFName.of('URI'));
    if (uri instanceof PDFString) {
      uris.push(uri.decodeText());
    }
  }
  return uris;
}
