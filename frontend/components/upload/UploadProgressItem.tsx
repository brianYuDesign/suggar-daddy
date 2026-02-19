'use client';

import React from 'react';
import { UploadProgress } from '@/types/creator';

interface UploadProgressItemProps {
  upload: UploadProgress;
  onCancel: () => void;
  onRetry: () => void;
}

export default function UploadProgressItem({
  upload,
  onCancel,
  onRetry,
}: UploadProgressItemProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const statusColor = {
    pending: 'bg-gray-700',
    uploading: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  const statusIcon = {
    pending: '⏳',
    uploading: '📤',
    completed: '✓',
    failed: '✗',
  };

  return (
    <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
      <div className="flex items-start gap-3 mb-2">
        <span className="text-lg mt-1">{statusIcon[upload.status]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{upload.fileName}</p>
          <p className="text-gray-400 text-sm">
            {formatFileSize(upload.uploadedSize)} / {formatFileSize(upload.size)}
          </p>
        </div>
        {upload.status === 'uploading' && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-red-400 transition-colors text-sm font-medium whitespace-nowrap ml-2"
            aria-label={`Cancel upload for ${upload.fileName}`}
          >
            Cancel
          </button>
        )}
        {upload.status === 'failed' && (
          <button
            onClick={onRetry}
            className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium whitespace-nowrap ml-2"
            aria-label={`Retry upload for ${upload.fileName}`}
          >
            Retry
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all ${statusColor[upload.status]}`}
          style={{ width: `${upload.progress}%` }}
          role="progressbar"
          aria-valuenow={upload.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Upload progress for ${upload.fileName}`}
        ></div>
      </div>

      {/* Status Text */}
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-gray-400 capitalize">{upload.status}</span>
        <span className="text-xs font-semibold text-gray-300">{upload.progress}%</span>
      </div>

      {upload.error && (
        <p className="text-xs text-red-400 mt-2">{upload.error}</p>
      )}
    </div>
  );
}
