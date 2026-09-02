import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFString } from 'pdf-lib';

import { extractScheme, isSafeUri } from './uri.ts';

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

export function collectActionChain(start: PDFDict): PDFDict[] {
  const chain: PDFDict[] = [];
  const seen = new Set<PDFDict>();
  const queue: PDFDict[] = [start];
  while (queue.length > 0) {
    const action = queue.shift();
    if (!action || seen.has(action)) {
      continue;
    }
    seen.add(action);
    chain.push(action);
    const next = action.lookup(PDFName.of('Next'));
    const nextDict = asDict(next);
    if (nextDict) {
      queue.push(nextDict);
      continue;
    }
    const nextArray = asArray(next);
    if (!nextArray) {
      continue;
    }
    for (let i = 0; i < nextArray.size(); i += 1) {
      const step = asDict(nextArray.lookup(i));
      if (step) {
        queue.push(step);
      }
    }
  }
  return chain;
}

export function inspectActionChain(
  start: PDFDict,
  dangerousTypes: ReadonlySet<string>,
): {
  types: string[];
  unsafeUriSchemes: string[];
} {
  const types: string[] = [];
  const seenTypes = new Set<string>();
  const unsafeUriSchemes: string[] = [];
  for (const step of collectActionChain(start)) {
    const stype = actionTypeName(step) ?? '';
    if (dangerousTypes.has(stype)) {
      const name = stype.replace(/^\//, '');
      if (!seenTypes.has(name)) {
        seenTypes.add(name);
        types.push(name);
      }
      continue;
    }
    if (stype !== '/URI') {
      continue;
    }
    const uri = pdfText(step.lookup(PDFName.of('URI')));
    if (uri !== undefined && !isSafeUri(uri)) {
      unsafeUriSchemes.push(extractScheme(uri));
    }
  }
  return { types, unsafeUriSchemes };
}

export function countNamedTreeEntries(tree: PDFDict, seen: Set<PDFDict> = new Set<PDFDict>()): number {
  if (seen.has(tree)) {
    return 0;
  }
  seen.add(tree);
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
        total += countNamedTreeEntries(kid, seen);
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

function visitFieldTree(field: PDFDict, visit: (dict: PDFDict) => void, seen: Set<PDFDict>): void {
  if (seen.has(field)) {
    return;
  }
  seen.add(field);
  visit(field);
  const kids = asArray(field.lookup(PDFName.of('Kids')));
  if (!kids) {
    return;
  }
  visitArrayDicts(kids, (kid) => {
    visitFieldTree(kid, visit, seen);
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
      visitFieldTree(field, visit, seen);
    });
  }

  for (const page of pdf.getPages()) {
    const annots = asArray(page.node.lookup(PDFName.of('Annots')));
    if (annots) {
      visitArrayDicts(annots, visitOnce);
    }
  }
}
