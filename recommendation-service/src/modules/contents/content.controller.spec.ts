import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentController } from '../modules/contents/content.controller';
import { Content, ContentTag } from '../database/entities';

describe('ContentController', () => {
  let controller: ContentController;
  let contentRepo: jest.Mocked<Repository<Content>>;
  let tagRepo: jest.Mocked<Repository<ContentTag>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        {
          provide: getRepositoryToken(Content),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ContentTag),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ContentController>(ContentController);
    contentRepo = module.get(getRepositoryToken(Content)) as jest.Mocked<Repository<Content>>;
    tagRepo = module.get(getRepositoryToken(ContentTag)) as jest.Mocked<Repository<ContentTag>>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllContents', () => {
    it('should return list of contents', async () => {
      const mockContents: Content[] = [
        {
          id: 'content-1',
          title: 'Test Content',
          description: 'Test',
          creator_id: 'creator-1',
          view_count: 10,
          like_count: 5,
          share_count: 2,
          engagement_score: 0.5,
          created_at: new Date(),
          updated_at: new Date(),
          is_featured: false,
          newness_score: 0.8,
          tags: [],
          interactions: [],
        },
      ];

      contentRepo.find.mockResolvedValue(mockContents);

      const result = await controller.getAllContents('10');

      expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'content-1' })]));
      expect(contentRepo.find).toHaveBeenCalled();
    });
  });

  describe('getContent', () => {
    it('should return single content by ID', async () => {
      const mockContent: Content = {
        id: 'content-1',
        title: 'Test Content',
        description: 'Test',
        creator_id: 'creator-1',
        view_count: 10,
        like_count: 5,
        share_count: 2,
        engagement_score: 0.5,
        created_at: new Date(),
        updated_at: new Date(),
        is_featured: false,
        newness_score: 0.8,
        tags: [],
        interactions: [],
      };

      contentRepo.findOne.mockResolvedValue(mockContent);

      const result = await controller.getContent('content-1');

      expect(result).toEqual(expect.objectContaining({ id: 'content-1' }));
    });

    it('should throw error if content not found', async () => {
      contentRepo.findOne.mockResolvedValue(null);

      await expect(controller.getContent('non-existent')).rejects.toThrow();
    });
  });

  describe('createContent', () => {
    it('should create new content', async () => {
      const dto = {
        title: 'New Content',
        description: 'Test',
        creator_id: 'creator-1',
        tags: ['tag1', 'tag2'],
      };

      const mockTag: ContentTag = {
        id: 'tag-1',
        name: 'tag1',
        description: '',
        usage_count: 1,
        contents: [],
      };

      const mockContent: Content = {
        id: 'content-1',
        title: dto.title,
        description: dto.description,
        creator_id: dto.creator_id,
        view_count: 0,
        like_count: 0,
        share_count: 0,
        engagement_score: 0,
        created_at: new Date(),
        updated_at: new Date(),
        is_featured: false,
        newness_score: 0,
        tags: [mockTag],
        interactions: [],
      };

      contentRepo.create.mockReturnValue(mockContent);
      tagRepo.findOne.mockResolvedValue(mockTag);
      tagRepo.create.mockReturnValue(mockTag);
      tagRepo.save.mockResolvedValue(mockTag);
      contentRepo.save.mockResolvedValue(mockContent);

      const result = await controller.createContent(dto);

      expect(result.title).toBe(dto.title);
      expect(contentRepo.save).toHaveBeenCalled();
    });
  });

  describe('recordView', () => {
    it('should increment view count', async () => {
      const mockContent: Content = {
        id: 'content-1',
        title: 'Test',
        description: '',
        creator_id: 'creator-1',
        view_count: 10,
        like_count: 0,
        share_count: 0,
        engagement_score: 0,
        created_at: new Date(),
        updated_at: new Date(),
        is_featured: false,
        newness_score: 0,
        tags: [],
        interactions: [],
      };

      contentRepo.findOne.mockResolvedValue(mockContent);
      contentRepo.save.mockResolvedValue({ ...mockContent, view_count: 11 });

      await controller.recordView('content-1');

      expect(contentRepo.save).toHaveBeenCalledWith(expect.objectContaining({ view_count: 11 }));
    });
  });

  describe('deleteContent', () => {
    it('should delete content by ID', async () => {
      contentRepo.delete.mockResolvedValue({ affected: 1, raw: {} });

      await controller.deleteContent('content-1');

      expect(contentRepo.delete).toHaveBeenCalledWith('content-1');
    });
  });
});
