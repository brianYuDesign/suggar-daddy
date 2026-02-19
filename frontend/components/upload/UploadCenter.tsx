'use client';

import React, { useRef, useState } from 'react';
import { UploadProgress } from '@/types/creator';
import FileUploadZone from '@/components/upload/FileUploadZone';
import UploadProgressItem from '@/components/upload/UploadProgressItem';

export default function UploadCenter() {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const simulateUpload = (file: File, fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        setUploads((prev) =>
          prev.map((u) =>
            u.fileId === fileId
              ? { ...u, progress: 100, status: 'completed' }
              : u
          )
        );
        clearInterval(interval);
      } else {
        setUploads((prev) =>
          prev.map((u) =>
            u.fileId === fileId
              ? {
                  ...u,
                  progress: Math.round(progress),
                  uploadedSize: Math.round((file.size * progress) / 100),
                  status: 'uploading',
                }
              : u
          )
        );
      }
    }, 500);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      const fileId = generateFileId();
      const newUpload: UploadProgress = {
        fileId,
        fileName: file.name,
        progress: 0,
        status: 'pending',
        size: file.size,
        uploadedSize: 0,
      };

      setUploads((prev) => [...prev, newUpload]);

      // Start upload simulation
      setTimeout(() => {
        simulateUpload(file, fileId);
      }, 300);
    });
  };

  const handleCancel = (fileId: string) => {
    setUploads((prev) => prev.filter((u) => u.fileId !== fileId));
  };

  const handleRetry = (fileId: string) => {
    setUploads((prev) =>
      prev.map((u) =>
        u.fileId === fileId
          ? { ...u, progress: 0, status: 'pending', error: undefined }
          : u
      )
    );

    const upload = uploads.find((u) => u.fileId === fileId);
    if (upload) {
      // Re-simulate upload
      const file = new File([''], upload.fileName);
      setTimeout(() => {
        simulateUpload(file, fileId);
      }, 300);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Upload Center</h1>
        <p className="text-gray-400 mb-8">Upload your content and manage your media library</p>

        {/* Upload Zone */}
        <FileUploadZone
          isDragging={isDragging}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onSelectFiles={() => fileInputRef.current?.click()}
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
          accept="video/*,image/*,audio/*"
          aria-label="File upload input"
        />

        {/* Upload List */}
        {uploads.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              Uploads ({uploads.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {uploads.map((upload) => (
                <UploadProgressItem
                  key={upload.fileId}
                  upload={upload}
                  onCancel={() => handleCancel(upload.fileId)}
                  onRetry={() => handleRetry(upload.fileId)}
                />
              ))}
            </div>
          </div>
        )}

        {uploads.length === 0 && (
          <div className="mt-12 text-center text-gray-400">
            <p>No uploads yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
