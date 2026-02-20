'use client';

import React from 'react';
import { Content } from '@/types/creator';
import ContentCard from '@/components/content/ContentCard';

interface ContentListProps {
  contents: Content[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ContentList({
  contents,
  onEdit,
  onDelete,
}: ContentListProps) {
  if (contents.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-8 sm:p-12 text-center">
        <div className="text-4xl mb-4">📭</div>
        <p className="text-gray-400">No content found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contents.map((content) => (
        <ContentCard
          key={content.id}
          content={content}
          onEdit={() => onEdit(content.id)}
          onDelete={() => onDelete(content.id)}
        />
      ))}
    </div>
  );
}
