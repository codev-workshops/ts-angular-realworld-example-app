import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Port of `shared/pipes/markdown.pipe.ts`: renders markdown and sanitizes it.
 *
 * Angular used `marked.parse()` piped through `DomSanitizer`; here `marked`'s
 * synchronous overload is used (so consumers render without an effect) and
 * DOMPurify replaces `DomSanitizer`.
 *
 * The returned string is DOMPurify-sanitized and safe for `dangerouslySetInnerHTML`.
 */
export function markdown(content: string): string {
  return DOMPurify.sanitize(marked.parse(content, { async: false }));
}
