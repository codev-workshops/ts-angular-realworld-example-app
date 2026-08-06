import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Port of the `markdown` pipe (`src/app/shared/pipes/markdown.pipe.ts`).
 *
 * The Angular pipe was async only because it lazily `import()`ed `marked`; the ordering
 * that matters — render markdown first, sanitize the resulting HTML second — is kept, and
 * `DOMPurify.sanitize` replaces `DomSanitizer.sanitize(SecurityContext.HTML, ...)`.
 *
 * `marked` is configured with `async: false` so the return type is a plain string: nothing
 * may reach `dangerouslySetInnerHTML` before it has been through DOMPurify.
 */
export function renderMarkdown(content: string | null | undefined): string {
  if (!content) {
    return '';
  }
  const html = marked.parse(content, { async: false });
  return DOMPurify.sanitize(html);
}
