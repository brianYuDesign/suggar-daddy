'use client';

import React from 'react';
import { Content } from '@/types/creator';

interface ContentCardProps {
  content: Content;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ContentCard({
  content,
  onEdit,
  onDelete,
}: ContentCardProps) {
  const statusColor = {
    published: 'text-green-400 bg-green-400/10',
    draft: 'text-yellow-400 bg-yellow-400/10',
    archived: 'text-gray-400 bg-gray-400/10',
  };

  const contentTypeIcon = {
    video: '🎬',
    image: '🖼️',
    audio: '🎵',
    text: '📝',
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden hover:border-slate-600 transition-all group">
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden bg-slate-900">
        <img
          src={content.thumbnail}
          alt={content.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>

        {/* Status Badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${statusColor[content.status]}`}>
          {content.status.charAt(0).toUpperCase() + content.status.slice(1)}
        </div>

        {/* Content Type */}
        <div className="absolute top-2 left-2 text-xl">{contentTypeIcon[content.type]}</div>

        {/* Duration (for videos) */}
        {content.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {Math.floor(content.duration / 60)}:{String(content.duration % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="p-4">
        <h3 className="text-white font-semibold mb-1 line-clamp-2 group-hover:text-purple-400 transition-colors cursor-pointer" onClick={onEdit}>
          {content.title}
        </h3>
        <p className="text-gray-400 text-sm line-clamp-2 mb-3">{content.description}</p>

        {/* Stats */}
        <div className="flex gap-4 text-xs text-gray-400 mb-4">
          <div>👁️ {content.views.toLocaleString()}</div>
          <div>❤️ {content.likes.toLocaleString()}</div>
          <div>💬 {content.comments.toLocaleString()}</div>
        </div>

        {/* Tags */}
        {content.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {content.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-slate-700 text-gray-300 px-2 py-1 rounded"
              >
                #{tag}
              </span>
            ))}
            {content.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{content.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Price (if applicable) */}
        {content.price && (
          <div className="mb-4 p-2 bg-purple-900/30 rounded text-sm text-purple-300">
            💎 Premium: ${content.price.toFixed(2)}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors"
            aria-label={`Edit ${content.title}`}
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 px-3 py-2 bg-red-900/50 hover:bg-red-900 text-red-300 rounded text-sm font-medium transition-colors"
            aria-label={`Delete ${content.title}`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
