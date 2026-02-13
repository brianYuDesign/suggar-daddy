import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('posts')
@Index('idx_posts_creator', ['creatorId', 'createdAt'])
@Index('idx_posts_feed', ['createdAt'], { where: "visibility = 'public'" })
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  creatorId!: string;

  @Column({ length: 20 })
  contentType!: string;

  @Column('text', { nullable: true })
  caption!: string | null;

  @Column('jsonb', { default: () => "'[]'" })
  mediaUrls!: string[];

  @Column({ length: 20, default: 'public' })
  visibility!: string;

  @Column('uuid', { nullable: true })
  requiredTierId!: string | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  ppvPrice!: number | null;

  @Column('int', { default: 0 })
  likeCount!: number;

  @Column('int', { default: 0 })
  commentCount!: number;

  @Column('jsonb', { nullable: true })
  videoMeta!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
