'use client';

import React, { useState } from 'react';
import { Content } from '@/types/creator';

interface ContentEditorProps {
  content?: Content;
  onSave: (content: Content) => void;
  onCancel: () => void;
}

export default function ContentEditor({
  content,
  onSave,
  onCancel,
}: ContentEditorProps) {
  const [formData, setFormData] = useState<Partial<Content>>(
    content || {
      title: '',
      description: '',
      type: 'video',
      tags: [],
      status: 'draft',
    }
  );

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        id: content?.id || '',
        creatorId: content?.creatorId || 'creator1',
        title: formData.title || '',
        description: formData.description || '',
        thumbnail: formData.thumbnail || 'https://via.placeholder.com/300x200',
        type: formData.type || 'video',
        duration: formData.duration,
        views: formData.views || 0,
        likes: formData.likes || 0,
        comments: formData.comments || 0,
        tags: formData.tags || [],
        status: formData.status || 'draft',
        createdAt: content?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        price: formData.price,
      });
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl bg-slate-800/50 rounded-lg border border-slate-700 p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-white mb-6">
        {content ? 'Edit Content' : 'Create New Content'}
      </h2>

      {/* Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-white mb-2">
          Title *
        </label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={`w-full px-4 py-2 bg-slate-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors ${
            errors.title ? 'border-red-500' : 'border-slate-600'
          }`}
          placeholder="Enter content title"
          aria-label="Content title"
        />
        {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-white mb-2">
          Description *
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={`w-full px-4 py-2 bg-slate-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none h-24 ${
            errors.description ? 'border-red-500' : 'border-slate-600'
          }`}
          placeholder="Enter content description"
          aria-label="Content description"
        />
        {errors.description && (
          <p className="text-red-400 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      {/* Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-white mb-2">Type</label>
        <select
          value={formData.type || 'video'}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
          className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
          aria-label="Content type"
        >
          <option value="video">Video</option>
          <option value="image">Image</option>
          <option value="audio">Audio</option>
          <option value="text">Text</option>
        </select>
      </div>

      {/* Price */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-white mb-2">
          Price (Optional - leave empty for free)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.price || ''}
          onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
          className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="9.99"
          aria-label="Content price"
        />
      </div>

      {/* Tags */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-white mb-2">Tags</label>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="Enter tag and press Enter"
            aria-label="Tag input"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            aria-label="Add tag"
          >
            Add
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {formData.tags?.map((tag) => (
            <div
              key={tag}
              className="bg-purple-900/50 text-purple-200 px-3 py-1 rounded-full text-sm flex items-center gap-2"
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="text-purple-300 hover:text-purple-100 transition-colors"
                aria-label={`Remove tag ${tag}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-white mb-2">Status</label>
        <select
          value={formData.status || 'draft'}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
          aria-label="Content status"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          type="submit"
          className="flex-1 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
        >
          {content ? 'Update Content' : 'Create Content'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
