'use client';

import React, { useState } from 'react';
import { Content } from '@/types/creator';
import ContentList from '@/components/content/ContentList';
import ContentEditor from '@/components/content/ContentEditor';

export default function ContentManagement() {
  const [contents, setContents] = useState<Content[]>([
    {
      id: '1',
      creatorId: 'creator1',
      title: 'Amazing Tutorial - How to Start',
      description: 'Learn the basics in this comprehensive tutorial',
      thumbnail: 'https://via.placeholder.com/300x200',
      type: 'video',
      duration: 1200,
      views: 15420,
      likes: 1204,
      comments: 340,
      tags: ['tutorial', 'beginner', 'guide'],
      status: 'published',
      createdAt: '2026-02-15T10:30:00Z',
      updatedAt: '2026-02-15T10:30:00Z',
      price: 4.99,
    },
    {
      id: '2',
      creatorId: 'creator1',
      title: 'Exclusive Behind the Scenes',
      description: 'Get a peek at how we create content',
      thumbnail: 'https://via.placeholder.com/300x200',
      type: 'video',
      duration: 800,
      views: 8320,
      likes: 720,
      comments: 180,
      tags: ['behind-the-scenes', 'exclusive'],
      status: 'published',
      createdAt: '2026-02-10T15:45:00Z',
      updatedAt: '2026-02-10T15:45:00Z',
    },
    {
      id: '3',
      creatorId: 'creator1',
      title: 'Draft: New Series Announcement',
      description: 'Coming soon - exciting new content series',
      thumbnail: 'https://via.placeholder.com/300x200',
      type: 'image',
      views: 0,
      likes: 0,
      comments: 0,
      tags: ['announcement', 'series'],
      status: 'draft',
      createdAt: '2026-02-18T10:00:00Z',
      updatedAt: '2026-02-18T10:00:00Z',
    },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  const filteredContents = contents.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const handleEdit = (id: string) => {
    setEditingId(id);
    setView('editor');
  };

  const handleDelete = (id: string) => {
    setContents((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSave = (content: Content) => {
    if (editingId) {
      setContents((prev) =>
        prev.map((c) => (c.id === editingId ? { ...content, id: editingId } : c))
      );
    } else {
      setContents((prev) => [{ ...content, id: `new_${Date.now()}` }, ...prev]);
    }
    setEditingId(null);
    setView('list');
  };

  const editingContent = editingId ? contents.find((c) => c.id === editingId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Content Management</h1>
            <p className="text-gray-400 mt-2">Manage, edit, and publish your content</p>
          </div>
          {view === 'list' && (
            <button
              onClick={() => {
                setEditingId(null);
                setView('editor');
              }}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all whitespace-nowrap"
            >
              + New Content
            </button>
          )}
        </div>

        {view === 'list' ? (
          <>
            {/* Filter Tabs */}
            <div className="flex gap-2 sm:gap-4 mb-6 overflow-x-auto pb-2">
              {(['all', 'published', 'draft', 'archived'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                    filter === tab
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab !== 'all' && (
                    <span className="ml-2 text-xs">
                      ({contents.filter((c) => c.status === tab).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content List */}
            <ContentList
              contents={filteredContents}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </>
        ) : (
          <ContentEditor
            content={editingContent || undefined}
            onSave={handleSave}
            onCancel={() => {
              setEditingId(null);
              setView('list');
            }}
          />
        )}
      </div>
    </div>
  );
}
