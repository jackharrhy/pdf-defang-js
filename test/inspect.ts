import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';

import { loadPdf } from '../src/load.ts';

export async function reload(bytes: Uint8Array): Promise<PDFDocument> {
  return loadPdf(bytes);
}

export function catalogHas(pdf: PDFDocument, name: string): boolean {
  return pdf.catalog.has(PDFName.of(name));
}

export function namesHas(pdf: PDFDocument, name: string): boolean {
  const names = pdf.catalog.lookup(PDFName.of('Names'));
  return names instanceof PDFDict && names.has(PDFName.of(name));
}

export function acroFormHas(pdf: PDFDocument, name: string): boolean {
  const acroForm = pdf.catalog.lookup(PDFName.of('AcroForm'));
  return acroForm instanceof PDFDict && acroForm.has(PDFName.of(name));
}

export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  for (let i = 0; i < a.byteLength; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
