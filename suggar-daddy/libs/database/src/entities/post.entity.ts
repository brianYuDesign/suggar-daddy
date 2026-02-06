import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('posts')
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'creator_id', type: 'uuid' })
  @Index()
  creatorId: string;

  @Column({ name: 'content_type', type: 'varchar', length: 20 })
  contentType: 'text' | 'image' | 'video';

  @Column({ type: 'text', nullable: true })
  caption?: string;

  @Column({ name: 'media_urls', type: 'jsonb', default: '[]' })
  mediaUrls: string[];

  @Column({ type: 'varchar', length: 20, default: 'public' })
  visibility: 'public' | 'subscribers' | 'tier_specific' | 'ppv';

  @Column({ name: 'required_tier_id', type: 'uuid', nullable: true })
  requiredTierId?: string;

  @Column({ name: 'ppv_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  ppvPrice?: number;

  @Column({ name: 'like_count', default: 0 })
  likeCount: number;

  @Column({ name: 'comment_count', default: 0 })
  commentCount: number;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
