import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Video } from './video.entity';

export enum TranscodingJobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('transcoding_jobs')
@Index(['video_id', 'status'])
export class TranscodingJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  video_id: string;

  @Column()
  quality_name: string;

  @Column({ type: 'enum', enum: TranscodingJobStatus, default: TranscodingJobStatus.PENDING })
  status: TranscodingJobStatus;

  @Column({ nullable: true })
  progress_percent: number;

  @Column({ nullable: true })
  error_message: string;

  @Column({ nullable: true })
  started_at: Date;

  @Column({ nullable: true })
  completed_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  output_metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Video, (video) => video.transcoding_jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id' })
  video: Video;
}
