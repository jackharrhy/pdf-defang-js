import { describe, expect, it } from 'vitest';

import { extractScheme, isSafeUri } from '../src/uri.ts';

describe('isSafeUri', () => {
  it.each([
    ['http://example.com', true],
    ['https://example.com/path?q=1', true],
    ['mailto:user@example.com', true],
    ['tel:+1-555-1234', true],
    ['ftp://files.example.com/x.txt', true],
    ['', true],
    ['page2.pdf', true],
    ['#section1', true],
    ['/relative/path', true],
    ['javascript:alert(1)', false],
    ['JAVASCRIPT:alert(1)', false],
    ['file:///etc/passwd', false],
    ['data:text/html,<script>alert(1)</script>', false],
    ['vbscript:msgbox(1)', false],
    ['\\\\server\\share\\file.exe', false],
    ['//server/share/file.exe', false],
  ] as const)('%s → %s', (uri, expected) => {
    expect(isSafeUri(uri)).toBe(expected);
  });
});

describe('extractScheme', () => {
  it.each([
    ['http://example.com', 'http'],
    ['HTTPS://example.com', 'https'],
    ['javascript:alert(1)', 'javascript'],
    ['\\\\server\\share', 'unc'],
    ['\\server\\share', 'unc'],
    ['//server/share', 'unc'],
    ['', ''],
    ['page.pdf', ''],
    ['not a real:: scheme', ''],
  ] as const)('%s → %s', (uri, expected) => {
    expect(extractScheme(uri)).toBe(expected);
  });
});
