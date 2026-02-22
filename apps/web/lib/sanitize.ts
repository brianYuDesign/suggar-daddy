import sanitize from 'sanitize-html';

const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'u', 'del',
  'blockquote', 'ul', 'ol', 'li',
  'a', 'img', 'br', 'hr',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'code', 'pre', 'span', 'div',
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href'],
  img: ['src', 'alt'],
  '*': ['class', 'id'],
};

export function sanitizeHtml(dirty: string): string {
  return sanitize(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
  });
}
