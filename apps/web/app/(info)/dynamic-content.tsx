import { sanitizeHtml } from '../../lib/sanitize';

interface DynamicContentProps {
  content: string;
}

export function DynamicContent({ content }: DynamicContentProps) {
  return (
    <article
      className="prose prose-gray max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
    />
  );
}
