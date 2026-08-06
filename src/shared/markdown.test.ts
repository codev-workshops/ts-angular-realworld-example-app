import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

/**
 * The payload list mirrors `e2e/xss-security.spec.ts` (@security) so a regression in the
 * sanitization pipeline fails here too, without needing a browser.
 */
const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror="alert(1)">',
  '<svg onload="alert(1)">',
  '<iframe srcdoc="<script>alert(1)</script>">',
  '<a href="javascript:alert(1)">click me</a>',
  '<div onmouseover="alert(1)">hover me</div>',
];

describe('renderMarkdown', () => {
  it('renders markdown to HTML', () => {
    expect(renderMarkdown('# Title')).toContain('<h1>Title</h1>');
    expect(renderMarkdown('a **bold** word')).toContain('<strong>bold</strong>');
  });

  it('returns an empty string for empty content', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown(null)).toBe('');
    expect(renderMarkdown(undefined)).toBe('');
  });

  it.each(XSS_PAYLOADS)('neutralises %s', payload => {
    const html = renderMarkdown(`Before payload: ${payload} After payload`);

    expect(html).toContain('Before payload:');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<iframe/i);
    expect(html).not.toMatch(/\son\w+\s*=/i);
    expect(html).not.toMatch(/javascript:/i);
  });

  it('keeps benign links and images', () => {
    const html = renderMarkdown('[link](https://example.com) ![img](https://example.com/a.png)');

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('src="https://example.com/a.png"');
  });

  it('sanitizes HTML embedded in markdown constructs', () => {
    const html = renderMarkdown('> quote <script>alert(1)</script>\n\n- item <img src=x onerror=alert(1)>');

    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/onerror/i);
  });
});
