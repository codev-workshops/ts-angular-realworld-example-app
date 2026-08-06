import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('injects the sanitized HTML', () => {
    const { container } = render(<Markdown content="# Title" className="article-content" />);

    expect(container.querySelector('.article-content h1')?.textContent).toBe('Title');
  });

  it('never injects a script or an event handler', () => {
    const { container } = render(<Markdown content={'<script>alert(1)</script><img src=x onerror="alert(1)">'} />);

    expect(container.querySelectorAll('script')).toHaveLength(0);
    expect(container.querySelector('img')?.hasAttribute('onerror')).toBe(false);
  });

  it('strips javascript: hrefs', () => {
    const { container } = render(<Markdown content={'<a href="javascript:alert(1)">click me</a>'} />);

    expect(container.querySelector('a')?.getAttribute('href')).toBeNull();
  });
});
