/**
 * Shared Content Entity
 * 
 * 注意：这是一个简化版的内容实体，用于跨服务共享。
 */

export enum ContentType {
  VIDEO = 'video',
  IMAGE = 'image',
  POST = 'post',
  STORY = 'story',
}

export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  MODERATING = 'moderating',
}

export interface IContent {
  id: string;
  title: string;
  description?: string;
  type: ContentType;
  status: ContentStatus;
  creatorId: string;
  mediaUrls: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class ContentEntity implements IContent {
  id!: string;
  title!: string;
  description?: string;
  type!: ContentType;
  status!: ContentStatus;
  creatorId!: string;
  mediaUrls!: string[];
  tags?: string[];
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<ContentEntity>) {
    Object.assign(this, partial);
  }
}
