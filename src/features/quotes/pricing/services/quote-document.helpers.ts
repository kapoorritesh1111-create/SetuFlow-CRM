import type { QuoteDocumentMimeType } from '../types';

export function resolveQuoteDocumentDocType(mimeType: QuoteDocumentMimeType): string {
  return mimeType === 'application/pdf' ? 'quote_pdf' : 'quote_html';
}

export function buildGeneratedDocumentFileUrl(args: {
  documentId: string;
  version: number;
  fileName: string;
  mimeType: QuoteDocumentMimeType;
}): string {
  const encodedName = encodeURIComponent(args.fileName.trim() || `quote-document-v${args.version}`);
  const kind = args.mimeType === 'application/pdf' ? 'pdf' : 'html';

  return `generated://quote-documents/${args.documentId}/v${args.version}/${kind}/${encodedName}`;
}

export function resolveVersionLabel(version: number): string {
  return `v${version}`;
}
