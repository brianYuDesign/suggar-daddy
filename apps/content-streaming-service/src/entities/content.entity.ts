import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ModerationLog } from './moderation-log.entity';

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

@Entity('contents')
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

  @Column({ default: false })
  is_published: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => ModerationLog, (log) => log.content, { cascade: true })
  moderation_logs: ModerationLog[];
}
