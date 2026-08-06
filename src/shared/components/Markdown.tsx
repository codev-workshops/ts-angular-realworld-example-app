import { useMemo } from 'react';
import { renderMarkdown } from '../markdown';

interface MarkdownProps {
  content: string | null | undefined;
  className?: string;
}

/**
 * The single place where markdown reaches the DOM: `{{ body | markdown }}` becomes
 * `dangerouslySetInnerHTML` fed exclusively by `renderMarkdown`, which sanitizes.
 * Consumers must never build the HTML themselves.
 */
export function Markdown({ content, className }: MarkdownProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
