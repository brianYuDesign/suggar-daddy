import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { UploadService } from '@suggar-daddy/common';
import { MediaService } from '../media.service';

describe('UploadController', () => {
  let controller: UploadController;

  const uploadService = {
    uploadFile: jest.fn().mockResolvedValue({
      secure_url: 'https://cdn.example.com/image.jpg',
      public_id: 'test-public-id',
      format: 'jpg',
      resource_type: 'image',
      width: 800,
      height: 600,
      bytes: 12345,
      duration: undefined,
    }),
    getVideoThumbnail: jest
      .fn()
      .mockReturnValue('https://cdn.example.com/thumb.jpg'),
  };

  const mediaService = {
    create: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const mockUser = { userId: 'user-1', email: 'test@example.com', role: 'CREATOR' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        { provide: UploadService, useValue: uploadService },
        { provide: MediaService, useValue: mediaService },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
  });

  describe('uploadSingle', () => {
    const mockFile: Partial<Express.Multer.File> = {
      buffer: Buffer.from('fake-image-data'),
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
      size: 12345,
    };

    it('should upload file and create media record', async () => {
      mediaService.create.mockResolvedValueOnce({
        id: 'media-123',
        thumbnailUrl: null,
      });

      const result = await controller.uploadSingle(
        mockUser as any,
        mockFile as Express.Multer.File,
      );

      expect(uploadService.uploadFile).toHaveBeenCalledWith(mockFile.buffer, {
        folder: 'suggar-daddy/user-1',
        resourceType: 'auto',
      });

      expect(mediaService.create).toHaveBeenCalledWith({
        userId: 'user-1',
        originalUrl: 'https://cdn.example.com/image.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 12345,
        thumbnailUrl: undefined,
        width: 800,
        height: 600,
        duration: undefined,
        processingStatus: 'completed',
        metadata: {
          format: 'jpg',
          resourceType: 'image',
          publicId: 'test-public-id',
        },
      });

      expect(result).toEqual({
        id: 'media-123',
        url: 'https://cdn.example.com/image.jpg',
        thumbnailUrl: null,
        publicId: 'test-public-id',
        format: 'jpg',
        resourceType: 'image',
        width: 800,
        height: 600,
        size: 12345,
      });
    });

    it('should throw BadRequestException when no file', async () => {
      await expect(
        controller.uploadSingle(mockUser as any, undefined as any),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.uploadSingle(mockUser as any, undefined as any),
      ).rejects.toThrow('No file uploaded');
    });

    it('should generate video thumbnail for video uploads', async () => {
      uploadService.uploadFile.mockResolvedValueOnce({
        secure_url: 'https://cdn.example.com/video.mp4',
        public_id: 'video-public-id',
        format: 'mp4',
        resource_type: 'video',
        width: 1920,
        height: 1080,
        bytes: 5000000,
        duration: 30,
      });

      mediaService.create.mockResolvedValueOnce({
        id: 'media-video-1',
        thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      });

      const videoFile: Partial<Express.Multer.File> = {
        buffer: Buffer.from('fake-video-data'),
        originalname: 'clip.mp4',
        mimetype: 'video/mp4',
        size: 5000000,
      };

      const result = await controller.uploadSingle(
        mockUser as any,
        videoFile as Express.Multer.File,
      );

      // Should call getVideoThumbnail for video resource_type
      expect(uploadService.getVideoThumbnail).toHaveBeenCalledWith(
        'video-public-id',
      );

      expect(mediaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
          duration: 30,
        }),
      );

      expect(result.thumbnailUrl).toBe('https://cdn.example.com/thumb.jpg');
      expect(result.resourceType).toBe('video');
    });
  });

  describe('uploadMultiple', () => {
    const mockFiles: Partial<Express.Multer.File>[] = [
      {
        buffer: Buffer.from('file-1'),
        originalname: 'a.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
      },
      {
        buffer: Buffer.from('file-2'),
        originalname: 'b.png',
        mimetype: 'image/png',
        size: 2000,
      },
    ];

    it('should upload multiple files', async () => {
      uploadService.uploadFile
        .mockResolvedValueOnce({
          secure_url: 'https://cdn.example.com/a.jpg',
          public_id: 'pub-a',
          format: 'jpg',
          resource_type: 'image',
          width: 100,
          height: 100,
          bytes: 1000,
        })
        .mockResolvedValueOnce({
          secure_url: 'https://cdn.example.com/b.png',
          public_id: 'pub-b',
          format: 'png',
          resource_type: 'image',
          width: 200,
          height: 200,
          bytes: 2000,
        });

      mediaService.create
        .mockResolvedValueOnce({ id: 'media-1' })
        .mockResolvedValueOnce({ id: 'media-2' });

      const result = await controller.uploadMultiple(
        mockUser as any,
        mockFiles as Express.Multer.File[],
      );

      expect(uploadService.uploadFile).toHaveBeenCalledTimes(2);
      expect(mediaService.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { id: 'media-1', url: 'https://cdn.example.com/a.jpg' },
        { id: 'media-2', url: 'https://cdn.example.com/b.png' },
      ]);
    });

    it('should throw BadRequestException when no files', async () => {
      await expect(
        controller.uploadMultiple(mockUser as any, [] as any),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.uploadMultiple(mockUser as any, [] as any),
      ).rejects.toThrow('files are required');
    });
  });

  describe('delete', () => {
    it('should delete own media', async () => {
      mediaService.findOne.mockResolvedValueOnce({
        id: 'media-del',
        userId: 'user-1',
      });

      const result = await controller.delete(mockUser as any, 'media-del');

      expect(mediaService.findOne).toHaveBeenCalledWith('media-del');
      expect(mediaService.remove).toHaveBeenCalledWith('media-del');
      expect(result).toEqual({ deleted: 'media-del' });
    });

    it('should throw ForbiddenException when deleting other user media', async () => {
      mediaService.findOne.mockResolvedValueOnce({
        id: 'media-other',
        userId: 'user-999',
      });

      await expect(
        controller.delete(mockUser as any, 'media-other'),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.delete(
          mockUser as any,
          'media-other',
        ),
      ).rejects.toThrow('You can only delete your own media');

      // remove should NOT have been called
      expect(mediaService.remove).not.toHaveBeenCalled();
    });
  });
});
