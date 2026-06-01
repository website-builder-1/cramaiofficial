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

function sanitize(html: string) {
  return DOMPurify.sanitize(html ?? '', {
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