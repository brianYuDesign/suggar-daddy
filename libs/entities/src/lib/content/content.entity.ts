import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, Index } from 'typeorm';
import { ModerationLog } from './moderation-log.entity';
import { ContentTag } from '../recommendation/content-tag.entity';
import { UserInteraction } from '../recommendation/user-interaction.entity';

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

@Entity('contents')
@Index('idx_content_creator', ['creator_id'])
@Index('idx_content_moderation', ['moderation_status'])
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  creator_id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  media_url: string;

  @Column({ nullable: true })
  thumbnail_url: string;

  @Column({
    type: 'enum',
    enum: ModerationStatus,
    default: ModerationStatus.PENDING,
  })
  moderation_status: ModerationStatus;

  @Column({ nullable: true })
  moderation_reason: string;

  @Column({ nullable: true })
  moderated_by: string;

  @Column({ nullable: true })
  moderated_at: Date;

  @Column({ default: 0 })
  report_count: number;

  @Column({ nullable: true })
  auto_moderation_status: string;

  @Column({ type: 'jsonb', nullable: true })
  moderation_metadata: Record<string, unknown>;

  @Column({ default: false })
  is_published: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => ModerationLog, (log) => log.content, { cascade: true })
  moderation_logs: ModerationLog[];

  // Recommendation relations
  @ManyToMany(() => ContentTag, (tag) => tag.contents)
  tags: ContentTag[];

  @OneToMany(() => UserInteraction, (interaction) => interaction.content)
  interactions: UserInteraction[];
}
