import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFString } from 'pdf-lib';

export function asDict(value: unknown): PDFDict | undefined {
  return value instanceof PDFDict ? value : undefined;
}

export function asArray(value: unknown): PDFArray | undefined {
  return value instanceof PDFArray ? value : undefined;
}

export function namesDict(pdf: PDFDocument): PDFDict | undefined {
  return asDict(pdf.catalog.lookup(PDFName.of('Names')));
}

export function acroFormDict(pdf: PDFDocument): PDFDict | undefined {
  return asDict(pdf.catalog.lookup(PDFName.of('AcroForm')));
}

export function pdfText(value: unknown): string | undefined {
  if (value instanceof PDFString || value instanceof PDFHexString || value instanceof PDFName) {
    return value.decodeText();
  }
  return undefined;
}

export function actionTypeName(action: PDFDict): string | undefined {
  const type = action.lookup(PDFName.of('S'));
  return type instanceof PDFName ? type.asString() : undefined;
}

export function countNamedTreeEntries(tree: PDFDict): number {
  try {
    const names = asArray(tree.lookup(PDFName.of('Names')));
    if (names) {
      return Math.floor(names.size() / 2);
    }
    const kids = asArray(tree.lookup(PDFName.of('Kids')));
    if (!kids) {
      return 0;
    }
    let total = 0;
    for (let i = 0; i < kids.size(); i += 1) {
      const kid = asDict(kids.lookup(i));
      if (kid) {
        total += countNamedTreeEntries(kid);
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export function visitArrayDicts(array: PDFArray, visit: (dict: PDFDict) => void): void {
  for (let i = 0; i < array.size(); i += 1) {
    const dict = asDict(array.lookup(i));
    if (dict) {
      visit(dict);
    }
  }
}

function visitFieldTree(field: PDFDict, visit: (dict: PDFDict) => void): void {
  visit(field);
  const kids = asArray(field.lookup(PDFName.of('Kids')));
  if (!kids) {
    return;
  }
  visitArrayDicts(kids, (kid) => {
    visitFieldTree(kid, visit);
  });
}

export function visitFormAndPageDicts(pdf: PDFDocument, visit: (dict: PDFDict) => void): void {
  // The same widget can sit on AcroForm Fields and on page Annots.
  const seen = new Set<PDFDict>();
  const visitOnce = (dict: PDFDict): void => {
    if (seen.has(dict)) {
      return;
    }
    seen.add(dict);
    visit(dict);
  };

  const fields = asArray(acroFormDict(pdf)?.lookup(PDFName.of('Fields')));
  if (fields) {
    visitArrayDicts(fields, (field) => {
      visitFieldTree(field, visitOnce);
    });
  }

  for (const page of pdf.getPages()) {
    const annots = asArray(page.node.lookup(PDFName.of('Annots')));
    if (annots) {
      visitArrayDicts(annots, visitOnce);
    }
  }
}
