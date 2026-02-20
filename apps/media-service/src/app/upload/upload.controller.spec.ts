import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { MediaService } from '../media.service';
import { VideoProcessorService } from '../video/video-processor';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { LocalStorageService } from '../storage/local-storage.service';

describe('UploadController', () => {
  let controller: UploadController;

  const localStorageService = {
    saveFile: jest.fn().mockResolvedValue('user-1/1708000000-abc12345.jpg'),
    saveVideoOriginal: jest.fn().mockResolvedValue('user-1/media-123/original.mp4'),
    saveThumbnail: jest.fn().mockResolvedValue('user-1/media-123/thumb.jpg'),
    savePreview: jest.fn().mockResolvedValue('user-1/media-123/preview.mp4'),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    getPublicUrl: jest.fn().mockImplementation(
      (path: string) => `http://localhost:3008/uploads/${path}`,
    ),
  };

  const mediaService = {
    create: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
    updateFields: jest.fn().mockResolvedValue(undefined),
  };

  const videoProcessorService = {
    processVideo: jest.fn(),
  };

  const kafkaProducerService = {
    emit: jest.fn(),
    sendEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockUser = { userId: 'user-1', email: 'test@example.com', role: 'CREATOR' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        LocalStorageService,
        MediaService,
        VideoProcessorService,
        KafkaProducerService,
      ],
    });

    const module: TestingModule = await moduleRef
      .overrideProvider(LocalStorageService)
      .useValue(localStorageService)
      .overrideProvider(MediaService)
      .useValue(mediaService)
      .overrideProvider(VideoProcessorService)
      .useValue(videoProcessorService)
      .overrideProvider(KafkaProducerService)
      .useValue(kafkaProducerService)
      .compile();

    controller = module.get<UploadController>(UploadController);
  });

  describe('uploadSingle', () => {
    const mockFile = {
      buffer: Buffer.from('fake-image-data'),
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
      size: 12345,
    } as any;

    it('should upload file and create media record', async () => {
      mediaService.create.mockResolvedValueOnce({
        id: 'media-123',
        thumbnailUrl: null,
      });

      const result = await controller.uploadSingle(
        mockUser as any,
        mockFile,
      );

      expect(localStorageService.saveFile).toHaveBeenCalledWith(
        mockFile.buffer,
        'user-1',
        'photo.jpg',
      );

      expect(mediaService.create).toHaveBeenCalledWith({
        userId: 'user-1',
        originalUrl: 'http://localhost:3008/uploads/user-1/1708000000-abc12345.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 12345,
        processingStatus: 'completed',
        metadata: { storagePath: 'user-1/1708000000-abc12345.jpg' },
      });

      expect(result).toEqual({
        id: 'media-123',
        url: 'http://localhost:3008/uploads/user-1/1708000000-abc12345.jpg',
        thumbnailUrl: null,
        format: 'jpeg',
        resourceType: 'image',
        width: null,
        height: null,
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
  });

  describe('uploadMultiple', () => {
    const mockFiles = [
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
    ] as any[];

    it('should upload multiple files', async () => {
      localStorageService.saveFile
        .mockResolvedValueOnce('user-1/a.jpg')
        .mockResolvedValueOnce('user-1/b.png');

      localStorageService.getPublicUrl
        .mockReturnValueOnce('http://localhost:3008/uploads/user-1/a.jpg')
        .mockReturnValueOnce('http://localhost:3008/uploads/user-1/b.png');

      mediaService.create
        .mockResolvedValueOnce({ id: 'media-1' })
        .mockResolvedValueOnce({ id: 'media-2' });

      const result = await controller.uploadMultiple(
        mockUser as any,
        mockFiles,
      );

      expect(localStorageService.saveFile).toHaveBeenCalledTimes(2);
      expect(mediaService.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { id: 'media-1', url: 'http://localhost:3008/uploads/user-1/a.jpg' },
        { id: 'media-2', url: 'http://localhost:3008/uploads/user-1/b.png' },
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
    it('should delete own media and local file', async () => {
      mediaService.findOne.mockResolvedValueOnce({
        id: 'media-del',
        userId: 'user-1',
        metadata: { storagePath: 'user-1/file.jpg' },
      });

      const result = await controller.delete(mockUser as any, 'media-del');

      expect(mediaService.findOne).toHaveBeenCalledWith('media-del');
      expect(localStorageService.deleteFile).toHaveBeenCalledWith('user-1/file.jpg');
      expect(mediaService.remove).toHaveBeenCalledWith('media-del');
      expect(result).toEqual({ deleted: 'media-del' });
    });

    it('should throw ForbiddenException when deleting other user media', async () => {
      mediaService.findOne
        .mockResolvedValueOnce({ id: 'media-other', userId: 'user-999', metadata: {} })
        .mockResolvedValueOnce({ id: 'media-other', userId: 'user-999', metadata: {} });

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
