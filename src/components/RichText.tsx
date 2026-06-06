import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'code', 'pre', 'blockquote',
  'dl', 'dt', 'dd',
  'sup', 'sub', 'span', 'div',
];

// Repair common malformed model output and convert any leftover markdown
// to clean HTML before sanitization.
function normalize(input: string): string {
  let s = input ?? '';

  // Fix broken close-tag patterns like "<strong</>", "<em</>", "<p</>"
  s = s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)([^<>]*)<\/>/g, '<$1$2>');
  // Stray "</>"
  s = s.replace(/<\/>/g, '');
  // Tags missing their closing ">", e.g. "<strong" followed by space/newline
  s = s.replace(/<(\/?[a-zA-Z][a-zA-Z0-9]*)(\s+[^<>]*?)?(?=\s|$)(?![^<]*>)/g, '<$1$2>');

  // Convert markdown remnants → HTML
  // Bold: **text** or __text__
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])__([^_\n]+)__(?=[\s).,!?:;]|$)/g, '$1<strong>$2</strong>');
  // Italic: *text* or _text_ (avoid breaking words/urls)
  s = s.replace(/(^|[\s(>])\*([^*\n]+)\*(?=[\s).,!?:;<]|$)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[\s(>])_([^_\n]+)_(?=[\s).,!?:;<]|$)/g, '$1<em>$2</em>');
  // Inline code
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  // Headings at start of a line
  s = s.replace(/^\s{0,3}#{4,6}\s+(.+)$/gm, '<h4>$1</h4>');
  s = s.replace(/^\s{0,3}#{1,3}\s+(.+)$/gm, '<h3>$1</h3>');

  return s;
}

function sanitize(html: string) {
  return DOMPurify.sanitize(normalize(html ?? ''), {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['class'],
  });
}

interface RichTextProps {
  html?: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

export function RichText({ html, as: Tag = 'div', className }: RichTextProps) {
  if (!html) return null;
  return (
    <Tag
      className={cn('rich-text', className)}
      dangerouslySetInnerHTML={{ __html: sanitize(html) }}
    />
  );
}

export default RichText;