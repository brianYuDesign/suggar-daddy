import { useState, useCallback, useRef } from 'react';
import { uploadsApi, Upload, UploadProgress } from '@/lib/api';
import { useAppDispatch } from './redux';
import { addNotification } from '@/lib/store/slices/notifications';

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  url?: string;
  abortController: AbortController;
}

/**
 * Custom hook for file uploads with progress tracking
 */
export const useUpload = () => {
  const dispatch = useAppDispatch();
  const [uploads, setUploads] = useState<Map<string, UploadItem>>(new Map());
  const uploadQueueRef = useRef<UploadItem[]>([]);
  const isProcessingRef = useRef(false);

  // Add file to upload queue
  const addToQueue = useCallback((file: File) => {
    const id = `${Date.now()}-${Math.random()}`;
    const abortController = new AbortController();
    
    const uploadItem: UploadItem = {
      id,
      file,
      progress: 0,
      status: 'pending',
      abortController,
    };

    setUploads((prev) => new Map(prev).set(id, uploadItem));
    uploadQueueRef.current.push(uploadItem);
    
    return id;
  }, []);

  // Process upload queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    while (uploadQueueRef.current.length > 0) {
      const item = uploadQueueRef.current[0];
      
      try {
        setUploads((prev) => {
          const updated = new Map(prev);
          const uploadItem = updated.get(item.id);
          if (uploadItem) {
            uploadItem.status = 'uploading';
          }
          return updated;
        });

        const result = await uploadsApi.uploadFile(
          item.file,
          (progress: UploadProgress) => {
            setUploads((prev) => {
              const updated = new Map(prev);
              const uploadItem = updated.get(item.id);
              if (uploadItem) {
                uploadItem.progress = progress.progress;
              }
              return updated;
            });
          },
          item.abortController.signal
        );

        setUploads((prev) => {
          const updated = new Map(prev);
          const uploadItem = updated.get(item.id);
          if (uploadItem) {
            uploadItem.status = 'completed';
            uploadItem.url = result.url;
            uploadItem.progress = 100;
          }
          return updated;
        });

        dispatch(
          addNotification({
            type: 'success',
            message: `Uploaded ${item.file.name}`,
          })
        );
      } catch (error: any) {
        if (error.message !== 'Upload cancelled') {
          setUploads((prev) => {
            const updated = new Map(prev);
            const uploadItem = updated.get(item.id);
            if (uploadItem) {
              uploadItem.status = 'failed';
              uploadItem.error = error.message || 'Upload failed';
            }
            return updated;
          });

          dispatch(
            addNotification({
              type: 'error',
              message: `Failed to upload ${item.file.name}`,
            })
          );
        }
      }

      uploadQueueRef.current.shift();
    }

    isProcessingRef.current = false;
  }, [dispatch]);

  // Upload file
  const upload = useCallback(
    async (file: File) => {
      const id = addToQueue(file);
      await processQueue();
      return id;
    },
    [addToQueue, processQueue]
  );

  // Upload multiple files
  const uploadMultiple = useCallback(
    async (files: File[]) => {
      const ids = files.map(addToQueue);
      await processQueue();
      return ids;
    },
    [addToQueue, processQueue]
  );

  // Cancel upload
  const cancel = useCallback((id: string) => {
    const uploadItem = uploads.get(id);
    if (uploadItem && uploadItem.status === 'uploading') {
      uploadItem.abortController.abort();
      setUploads((prev) => {
        const updated = new Map(prev);
        const item = updated.get(id);
        if (item) {
          item.status = 'failed';
          item.error = 'Upload cancelled';
        }
        return updated;
      });
    }
  }, [uploads]);

  // Retry upload
  const retry = useCallback(
    async (id: string) => {
      const uploadItem = uploads.get(id);
      if (uploadItem && uploadItem.status === 'failed') {
        uploadItem.status = 'pending';
        uploadItem.error = undefined;
        uploadItem.progress = 0;
        uploadItem.abortController = new AbortController();
        
        setUploads((prev) => new Map(prev).set(id, uploadItem));
        uploadQueueRef.current.push(uploadItem);
        
        await processQueue();
      }
    },
    [uploads, processQueue]
  );

  // Clear completed uploads
  const clearCompleted = useCallback(() => {
    setUploads((prev) => {
      const updated = new Map(prev);
      for (const [id, item] of updated) {
        if (item.status === 'completed' || item.status === 'failed') {
          updated.delete(id);
        }
      }
      return updated;
    });
  }, []);

  // Clear all uploads
  const clearAll = useCallback(() => {
    uploads.forEach((item) => {
      if (item.status === 'uploading') {
        item.abortController.abort();
      }
    });
    setUploads(new Map());
    uploadQueueRef.current = [];
  }, [uploads]);

  return {
    // State
    uploads: Array.from(uploads.values()),
    
    // Methods
    upload,
    uploadMultiple,
    cancel,
    retry,
    clearCompleted,
    clearAll,
    
    // Utilities
    isUploading: Array.from(uploads.values()).some(
      (u) => u.status === 'uploading'
    ),
    totalProgress:
      uploads.size === 0
        ? 0
        : Math.round(
            Array.from(uploads.values()).reduce((sum, u) => sum + u.progress, 0) /
              uploads.size
          ),
  };
};

export default useUpload;
