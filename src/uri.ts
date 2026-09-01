const SAFE_SCHEME_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789+-.';

export const SAFE_URI_SCHEMES: ReadonlySet<string> = new Set([
  'http',
  'https',
  'mailto',
  'tel',
  'ftp',
  'sftp',
  'news',
  'nntp',
  'irc',
  'ircs',
  'magnet',
]);

export function extractScheme(uri: string): string {
  if (!uri) {
    return '';
  }
  const trimmed = uri.trim();
  // pdf-lib unescapes `\\` to `\`, so a UNC URI may start with either.
  if (trimmed.startsWith('\\') || trimmed.startsWith('//')) {
    return 'unc';
  }
  const colon = trimmed.indexOf(':');
  if (colon <= 0) {
    return '';
  }
  const scheme = trimmed.slice(0, colon).toLowerCase().trim();
  if (!scheme || [...scheme].some((char) => !SAFE_SCHEME_CHARS.includes(char))) {
    return '';
  }
  return scheme;
}

export function isSafeUri(uri: string): boolean {
  if (!uri || !uri.trim()) {
    return true;
  }
  const scheme = extractScheme(uri);
  if (!scheme) {
    return true;
  }
  return SAFE_URI_SCHEMES.has(scheme);
}
