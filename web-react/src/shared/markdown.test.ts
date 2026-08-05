import { describe, expect, it } from 'vitest';
import { markdown } from './markdown';

describe('markdown', () => {
  it('renders markdown to HTML', () => {
    expect(markdown('# Title')).toContain('<h1>Title</h1>');
    expect(markdown('**bold**')).toContain('<strong>bold</strong>');
  });

  it('returns an empty string for empty content', () => {
    expect(markdown('')).toBe('');
  });

  // One case per payload class in `e2e/xss-security.spec.ts`.
  describe('XSS sanitization', () => {
    it('strips script tags', () => {
      const html = markdown('Before payload: <script>alert(1)</script> After payload');
      expect(html).not.toContain('<script');
      expect(html).not.toContain('alert(1)');
      expect(html).toContain('Before payload:');
    });

    it('strips onerror handlers on images', () => {
      const html = markdown('<img src=x onerror="alert(1)">');
      expect(html).not.toContain('onerror');
    });

    it('strips onload handlers on svg', () => {
      const html = markdown('<svg onload="alert(1)">');
      expect(html).not.toContain('onload');
    });

    it('strips iframe srcdoc payloads', () => {
      const html = markdown('<iframe srcdoc="<script>alert(1)</script>">');
      expect(html).not.toContain('srcdoc');
      expect(html).not.toContain('<iframe');
    });

    it('strips javascript: hrefs on anchors', () => {
      const html = markdown('<a href="javascript:alert(1)">click me</a>');
      expect(html).not.toContain('javascript:');
      expect(html).toContain('click me');
    });

    it('strips event handlers on arbitrary elements', () => {
      const html = markdown('<div onmouseover="alert(1)">hover me</div>');
      expect(html).not.toContain('onmouseover');
      expect(html).toContain('hover me');
    });

    it('strips javascript: hrefs produced from markdown link syntax', () => {
      const html = markdown('[click me](javascript:alert(1))');
      expect(html).not.toContain('javascript:');
    });

    it('strips data URI script payloads in image sources', () => {
      const html = markdown('![x](data:text/html,<script>alert(1)</script>)');
      expect(html).not.toContain('<script');
    });
  });
});
