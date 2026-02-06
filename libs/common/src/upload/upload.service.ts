import { Injectable } from '@nestjs/common';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { cloudinary } from './cloudinary.config';
import * as streamifier from 'streamifier';

export interface UploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  transformation?: any;
  publicId?: string;
}

@Injectable()
export class UploadService {
  /**
   * Upload file buffer to Cloudinary
   */
  async uploadFile(
    fileBuffer: Buffer,
    options: UploadOptions = {},
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'suggar-daddy',
          resource_type: options.resourceType || 'auto',
          transformation: options.transformation,
          public_id: options.publicId,
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(
    files: Express.Multer.File[],
    options: UploadOptions = {},
  ): Promise<UploadApiResponse[]> {
    const uploadPromises = files.map((file) =>
      this.uploadFile(file.buffer, {
        ...options,
        publicId: options.publicId
          ? `${options.publicId}_${Date.now()}`
          : undefined,
      }),
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<any> {
    return cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  }

  /**
   * Delete multiple files
   */
  async deleteMultiple(
    publicIds: string[],
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<any> {
    return cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType,
    });
  }

  /**
   * Get optimized image URL with transformations
   */
  getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string | number;
      format?: string;
    } = {},
  ): string {
    return cloudinary.url(publicId, {
      transformation: [
        {
          width: options.width,
          height: options.height,
          crop: options.crop || 'fill',
          quality: options.quality || 'auto',
          fetch_format: options.format || 'auto',
        },
      ],
    });
  }

  /**
   * Get video thumbnail URL
   */
  getVideoThumbnail(
    publicId: string,
    options: { width?: number; height?: number } = {},
  ): string {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      transformation: [
        {
          width: options.width || 300,
          height: options.height || 300,
          crop: 'fill',
          start_offset: '0',
        },
      ],
      format: 'jpg',
    });
  }
}