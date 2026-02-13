import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('stories')
@Index('idx_stories_creator', ['creatorId', 'createdAt'])
@Index('idx_stories_expires', ['expiresAt'])
export class StoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  creatorId!: string;

  @Column('varchar', { length: 50 })
  contentType!: string;

  @Column('varchar', { length: 500 })
  mediaUrl!: string;

  @Column('text', { nullable: true })
  caption!: string | null;

  @Column('int', { default: 0 })
  viewCount!: number;

  @Column('timestamp')
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
