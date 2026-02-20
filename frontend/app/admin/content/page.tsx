'use client';

import React, { useState, useEffect } from 'react';
import { PendingContent, ReportedContent } from '@/types/admin';

// Mock data - replace with actual API calls
const mockPendingContent: PendingContent[] = [
  {
    id: '1',
    creatorId: 'c1',
    creatorName: 'Jane Smith',
    creatorAvatar: 'https://via.placeholder.com/40',
    title: 'Tutorial: Advanced Photography Tips',
    description: 'Learn advanced photography techniques...',
    thumbnail: 'https://via.placeholder.com/300x200',
    type: 'video',
    submittedAt: '2026-02-20T10:30:00Z',
    status: 'pending',
  },
  {
    id: '2',
    creatorId: 'c2',
    creatorName: 'Mike Johnson',
    title: 'Behind the Scenes: My Creative Process',
    description: 'A look into how I create my content...',
    thumbnail: 'https://via.placeholder.com/300x200',
    type: 'image',
    submittedAt: '2026-02-20T09:15:00Z',
    status: 'pending',
  },
  {
    id: '3',
    creatorId: 'c3',
    creatorName: 'Sarah Wilson',
    title: 'Exclusive Interview with Top Creator',
    description: 'An in-depth interview about success...',
    thumbnail: 'https://via.placeholder.com/300x200',
    type: 'video',
    submittedAt: '2026-02-19T16:45:00Z',
    status: 'pending',
  },
];

const mockReportedContent: ReportedContent[] = [
  {
    id: 'r1',
    contentId: 'c101',
    contentTitle: 'Inappropriate Content Title',
    reporterId: 'u1',
    reporterName: 'Concerned User',
    reason: 'Contains offensive material',
    status: 'pending',
    createdAt: '2026-02-20T08:00:00Z',
  },
  {
    id: 'r2',
    contentId: 'c102',
    contentTitle: 'Suspicious Activity',
    reporterId: 'u2',
    reporterName: 'Watchful Eye',
    reason: 'Potential spam content',
    status: 'pending',
    createdAt: '2026-02-19T14:30:00Z',
  },
];

const typeIcons: Record<string, string> = {
  video: '🎥',
  image: '🖼️',
  audio: '🎵',
  text: '📝',
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function ContentPage() {
  const [pendingContent, setPendingContent] = useState<PendingContent[]>([]);
  const [reportedContent, setReportedContent] = useState<ReportedContent[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'reported'>('pending');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Replace with actual API calls:
      // const pendingRes = await fetch('/api/v1/content/pending-review');
      // const reportedRes = await fetch('/api/v1/content/reported');
      
      await new Promise((resolve) => setTimeout(resolve, 700));
      setPendingContent(mockPendingContent);
      setReportedContent(mockReportedContent);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleApprove = async (contentId: string) => {
    // Replace with actual API call:
    // await fetch(`/api/v1/content/${contentId}/approve`, { method: 'POST' });
    
    setPendingContent((prev) =>
      prev.filter((content) => content.id !== contentId)
    );
  };

  const handleReject = async (contentId: string) => {
    // Replace with actual API call:
    // await fetch(`/api/v1/content/${contentId}/reject`, { method: 'POST' });
    
    setPendingContent((prev) =>
      prev.filter((content) => content.id !== contentId)
    );
  };

  const handleResolveReport = async (reportId: string, action: 'dismiss' | 'remove') => {
    // Replace with actual API call:
    // await fetch(`/api/v1/reports/${reportId}`, { 
    //   method: 'PATCH',
    //   body: JSON.stringify({ action })
    // });
    
    setReportedContent((prev) =>
      prev.filter((report) => report.id !== reportId)
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse h-8 bg-slate-700 rounded w-1/4"></div>
          <div className="animate-pulse h-12 bg-slate-800 rounded-lg"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse h-32 bg-slate-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Content Moderation</h1>
          <p className="text-gray-400 mt-1">
            Review and moderate platform content
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700 w-fit">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Pending Review
            {pendingContent.length > 0 && (
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                {pendingContent.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reported')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'reported'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Reported Content
            {reportedContent.length > 0 && (
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                {reportedContent.length}
              </span>
            )}
          </button>
        </div>

        {/* Pending Content Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingContent.length === 0 ? (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center">
                <span className="text-6xl mb-4 block">✅</span>
                <h3 className="text-xl font-semibold text-white mb-2">All Caught Up!</h3>
                <p className="text-gray-400">No pending content to review</p>
              </div>
            ) : (
              pendingContent.map((content) => (
                <div
                  key={content.id}
                  className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 hover:border-slate-600 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Thumbnail */}
                    <div className="relative w-full lg:w-48 h-32 flex-shrink-0">
                      <img
                        src={content.thumbnail}
                        alt={content.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <span className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                        {typeIcons[content.type]} {content.type}
                      </span>
                    </div>

                    {/* Content Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {content.title}
                          </h3>
                          <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                            {content.description}
                          </p>
                        </div>
                        <span className="text-gray-500 text-sm whitespace-nowrap">
                          {formatTimeAgo(content.submittedAt)}
                        </span>
                      </div>

                      {/* Creator Info */}
                      <div className="flex items-center gap-3 mb-4">
                        <img
                          src={content.creatorAvatar || 'https://via.placeholder.com/32'}
                          alt={content.creatorName}
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="text-gray-300 text-sm">
                          Submitted by <span className="text-white font-medium">{content.creatorName}</span>
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleApprove(content.id)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleReject(content.id)}
                          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-medium transition-colors"
                        >
                          ❌ Reject
                        </button>
                        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors">
                          👁️ Preview
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Reported Content Tab */}
        {activeTab === 'reported' && (
          <div className="space-y-4">
            {reportedContent.length === 0 ? (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-12 text-center">
                <span className="text-6xl mb-4 block">🎉</span>
                <h3 className="text-xl font-semibold text-white mb-2">No Reports</h3>
                <p className="text-gray-400">No content has been reported</p>
              </div>
            ) : (
              reportedContent.map((report) => (
                <div
                  key={report.id}
                  className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 hover:border-slate-600 transition-colors"
                >
                  <div className="flex flex-col gap-4">
                    {/* Report Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 mb-2">
                          ⚠️ Reported
                        </span>
                        <h3 className="text-lg font-semibold text-white">
                          {report.contentTitle}
                        </h3>
                      </div>
                      <span className="text-gray-500 text-sm">
                        {formatTimeAgo(report.createdAt)}
                      </span>
                    </div>

                    {/* Report Details */}
                    <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
                      <p className="text-gray-300">
                        <span className="text-gray-500">Reason:</span>{' '}
                        {report.reason}
                      </p>
                      <p className="text-gray-300">
                        <span className="text-gray-500">Reported by:</span>{' '}
                        {report.reporterName}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => handleResolveReport(report.id, 'dismiss')}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Dismiss Report
                      </button>
                      <button
                        onClick={() => handleResolveReport(report.id, 'remove')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Remove Content
                      </button>
                      <button className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg font-medium transition-colors">
                        View Content
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
