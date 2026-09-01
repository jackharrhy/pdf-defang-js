import { EncryptedPDFError, PDFDocument } from 'pdf-lib';

export type LoadFailure = {
  message: string;
  isEncrypted: boolean;
};

export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  // pdf-lib writes Producer/ModDate on load when updateMetadata is true, so a
  // clean file would be rewritten even if we strip nothing.
  return PDFDocument.load(bytes, { updateMetadata: false });
}

function isEncryptedLoadError(error: unknown): boolean {
  // pdf-lib 1.17 often throws a plain Error whose message includes "is encrypted".
  return error instanceof Error && error.message.includes('is encrypted');
}

export function describeLoadFailure(error: unknown): LoadFailure {
  if (error instanceof EncryptedPDFError || isEncryptedLoadError(error)) {
    return {
      message: 'encrypted PDFs are not supported',
      isEncrypted: true,
    };
  }
  if (error instanceof Error) {
    return {
      message: `${error.name}: ${error.message}`,
      isEncrypted: false,
    };
  }
  return {
    message: String(error),
    isEncrypted: false,
  };
}
