import DOMPurify from 'dompurify';

/**
 * Angular MarkdownPipe equivalent: render markdown, then sanitize.
 * Angular sanitizes with DomSanitizer; React has no built-in sanitizer, so
 * DOMPurify guards the `dangerouslySetInnerHTML` used by the article page.
 */
export async function renderMarkdown(content: string): Promise<string> {
  const { marked } = await import('marked');
  return DOMPurify.sanitize(await marked.parse(content));
}
