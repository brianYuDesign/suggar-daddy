'use client';

import React from 'react';

interface FileUploadZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onSelectFiles: () => void;
}

export default function FileUploadZone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onSelectFiles,
}: FileUploadZoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-lg p-8 sm:p-12 text-center transition-colors cursor-pointer ${
        isDragging
          ? 'border-purple-400 bg-purple-900/20'
          : 'border-gray-600 bg-slate-800/50 hover:border-gray-500'
      }`}
      role="region"
      aria-label="File upload drop zone"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Upload Icon */}
        <div className="text-5xl sm:text-6xl">📤</div>

        {/* Text */}
        <div>
          <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
            Drag and drop your files
          </h3>
          <p className="text-gray-400 mb-4">
            or
          </p>
          <button
            onClick={onSelectFiles}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
            aria-label="Select files from computer"
          >
            Browse Files
          </button>
        </div>

        {/* File Types */}
        <p className="text-xs sm:text-sm text-gray-500 pt-4">
          Supported: MP4, MOV, WebM, PNG, JPG, GIF, MP3, WAV
        </p>
        <p className="text-xs sm:text-sm text-gray-500">
          Max file size: 2 GB
        </p>
      </div>
    </div>
  );
}
