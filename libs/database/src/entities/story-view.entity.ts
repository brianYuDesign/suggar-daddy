import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('story_views')
@Unique('uq_story_view', ['storyId', 'viewerId'])
@Index('idx_story_views_story', ['storyId'])
@Index('idx_story_views_viewer', ['viewerId'])
export class StoryViewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  storyId!: string;

  @Column('uuid')
  viewerId!: string;

  @CreateDateColumn()
  viewedAt!: Date;
}
