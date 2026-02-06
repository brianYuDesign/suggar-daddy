# File Upload Guide

## Overview

This project uses **Cloudinary** for media file storage, processing, and delivery. Cloudinary provides automatic image/video optimization, transformations, and CDN delivery.

## Features

- ✅ Single and multiple file uploads
- ✅ Automatic format detection (images, videos, raw files)
- ✅ Image optimization and transformation
- ✅ Video thumbnail generation
- ✅ CDN delivery
- ✅ File deletion
- ✅ Metadata tracking

## Setup

### 1. Cloudinary Account

1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Get your credentials from Dashboard:
   - Cloud Name
   - API Key
   - API Secret

### 2. Environment Variables

Add to each service's `.env` file (especially `media-service`):

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Dependencies

Install required packages:

```bash
npm install cloudinary streamifier
npm install -D @types/multer
```

## Architecture

```
┌─────────────────┐
│  Client/App     │
└────────┬────────┘
         │ Upload Request
         ▼
┌─────────────────────────┐
│   Media Service         │
│  (Upload Controller)    │
└────────┬────────────────┘
         │
         ├─► UploadService (Common)
         │   └─► Cloudinary API
         │
         ├─► MediaFilesService
         │   └─► PostgreSQL
         │
         └─► MediaProducer
             └─► Kafka Event
```

## API Endpoints

### Upload Single File

```http
POST /upload/single
Content-Type: multipart/form-data

file: <binary>
userId: "user-123"
folder: "posts" (optional)
```

**Response:**
```json
{
  "id": "uuid",
  "url": "https://res.cloudinary.com/.../image.jpg",
  "thumbnailUrl": "https://res.cloudinary.com/.../thumbnail.jpg",
  "publicId": "suggar-daddy/user-123/abc123",
  "format": "jpg",
  "resourceType": "image",
  "width": 1920,
  "height": 1080,
  "size": 245678
}
```

### Upload Multiple Files

```http
POST /upload/multiple
Content-Type: multipart/form-data

files: <binary[]> (max 10)
userId: "user-123"
folder: "posts" (optional)
```

**Response:**
```json
[
  {
    "id": "uuid-1",
    "url": "https://res.cloudinary.com/.../image1.jpg",
    ...
  },
  {
    "id": "uuid-2",
    "url": "https://res.cloudinary.com/.../image2.jpg",
    ...
  }
]
```

### Delete File

```http
DELETE /upload/:id
```

**Response:**
```json
{
  "message": "Media deleted successfully"
}
```

## Usage Examples

### Frontend (React/Next.js)

```typescript
// Single file upload
const uploadFile = async (file: File, userId: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);
  formData.append('folder', 'posts');

  const response = await fetch('http://localhost:3008/upload/single', {
    method: 'POST',
    body: formData,
  });

  return response.json();
};

// Multiple files upload
const uploadMultiple = async (files: File[], userId: string) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  formData.append('userId', userId);

  const response = await fetch('http://localhost:3008/upload/multiple', {
    method: 'POST',
    body: formData,
  });

  return response.json();
};

// Delete file
const deleteFile = async (mediaId: string) => {
  const response = await fetch(`http://localhost:3008/upload/${mediaId}`, {
    method: 'DELETE',
  });

  return response.json();
};
```

### Using UploadService Directly

```typescript
import { UploadService } from '@suggar-daddy/common';

@Injectable()
export class MyService {
  constructor(private readonly uploadService: UploadService) {}

  async uploadImage(buffer: Buffer, userId: string) {
    // Upload with automatic optimization
    const result = await this.uploadService.uploadFile(buffer, {
      folder: `suggar-daddy/${userId}`,
      resourceType: 'image',
    });

    return result.secure_url;
  }

  async getOptimizedUrl(publicId: string) {
    // Get optimized version
    return this.uploadService.getOptimizedUrl(publicId, {
      width: 800,
      height: 600,
      quality: 'auto',
      format: 'auto', // WebP for modern browsers
    });
  }

  async getVideoThumbnail(publicId: string) {
    return this.uploadService.getVideoThumbnail(publicId, {
      width: 400,
      height: 300,
    });
  }

  async deleteFile(publicId: string) {
    await this.uploadService.deleteFile(publicId, 'image');
  }
}
```

## Image Transformations

Cloudinary automatically optimizes images. You can also request specific transformations:

```typescript
// Get thumbnail
const thumbnailUrl = uploadService.getOptimizedUrl(publicId, {
  width: 300,
  height: 300,
  crop: 'fill',
});

// Get different sizes for responsive images
const sizes = [
  { width: 400, suffix: 'small' },
  { width: 800, suffix: 'medium' },
  { width: 1200, suffix: 'large' },
];

const urls = sizes.map(({ width, suffix }) => ({
  [suffix]: uploadService.getOptimizedUrl(publicId, { width }),
}));
```

## Video Processing

### Upload Video

```typescript
const result = await uploadService.uploadFile(videoBuffer, {
  folder: 'videos',
  resourceType: 'video',
});

// result.duration - video duration in seconds
// result.format - video format (mp4, mov, etc.)
```

### Get Video Thumbnail

```typescript
const thumbnailUrl = uploadService.getVideoThumbnail(result.public_id, {
  width: 640,
  height: 360,
});
```

## Events

The upload system emits Kafka events:

### Media Uploaded
```typescript
{
  event: 'media.uploaded',
  data: {
    mediaId: 'uuid',
    userId: 'user-123',
    storageUrl: 'https://...',
    mimeType: 'image/jpeg',
    fileSize: 245678
  }
}
```

### Media Deleted
```typescript
{
  event: 'media.deleted',
  data: {
    mediaId: 'uuid',
    userId: 'user-123',
    deletedAt: '2024-01-01T00:00:00Z'
  }
}
```

## File Size Limits

- **Images**: Up to 10MB recommended
- **Videos**: Up to 100MB recommended
- **Multiple files**: Max 10 files per request

Adjust in controller using `@UseInterceptors(FilesInterceptor('files', 10))`

## Security

### 1. File Type Validation

```typescript
import { extname } from 'path';

const imageFileFilter = (req, file, callback) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return callback(new Error('Only image files are allowed'), false);
  }
  
  callback(null, true);
};

@UseInterceptors(
  FileInterceptor('file', { fileFilter: imageFileFilter })
)
```

### 2. File Size Limit

```typescript
@UseInterceptors(
  FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  })
)
```

### 3. User Authentication

Always validate `userId` and ensure the authenticated user matches:

```typescript
@UseGuards(JwtAuthGuard)
async uploadFile(@GetUser() user, @Body('userId') userId) {
  if (user.id !== userId) {
    throw new UnauthorizedException();
  }
  // ... upload logic
}
```

## Best Practices

1. **Use folders**: Organize files by user/content type
   ```typescript
   folder: `suggar-daddy/${userId}/posts`
   ```

2. **Generate thumbnails**: For videos, always generate thumbnails

3. **Clean up**: Delete old/unused files regularly

4. **Optimize bandwidth**: Use transformations to serve appropriately sized images

5. **Track metadata**: Store file info in database for quick lookups

6. **Handle errors**: Implement retry logic for failed uploads

## Troubleshooting

### Upload Fails
- Verify Cloudinary credentials
- Check file size limits
- Ensure `streamifier` is installed

### Slow Uploads
- Use Cloudinary's upload presets for faster processing
- Consider chunked uploads for large files
- Enable compression before upload

### Missing Thumbnails
- Verify video format is supported
- Check if video processing is complete
- Use `eager` transformations for immediate generation

## Production Considerations

1. **CDN**: Cloudinary automatically uses CDN for delivery
2. **Backup**: Enable auto-backup in Cloudinary settings
3. **Monitoring**: Track upload success rates
4. **Quotas**: Monitor usage against your plan limits
5. **Caching**: Set appropriate cache headers
6. **Transformation Quotas**: Pre-generate common sizes to avoid on-the-fly processing

## Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Node.js SDK](https://cloudinary.com/documentation/node_integration)
- [Image Transformations](https://cloudinary.com/documentation/image_transformations)
- [Video Transformations](https://cloudinary.com/documentation/video_manipulation_and_delivery)