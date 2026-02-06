import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('posts')
@Index('idx_posts_creator', ['creatorId', 'createdAt'])
@Index('idx_posts_feed', ['createdAt'], { where: "visibility = 'public'" })
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  creatorId: string;

  @Column({ length: 20 })
  contentType: string; // text, image, video

  @Column('text', { nullable: true })
  caption: string;

  @Column('jsonb', { default: '[]' })
  mediaUrls: string[];

  @Column({ length: 20, default: 'public' })
  visibility: string; // public, subscribers, tier_specific, ppv

  @Column('uuid', { nullable: true })
  requiredTierId: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  ppvPrice: number;

  @Column({ default: 0 })
  likeCount: number;

  @Column({ default: 0 })
  commentCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
