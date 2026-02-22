interface DynamicContentProps {
  content: string;
}

export function DynamicContent({ content }: DynamicContentProps) {
  return (
    <article
      className="prose prose-gray max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
