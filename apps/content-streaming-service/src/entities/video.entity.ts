import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { VideoQuality } from './video-quality.entity';
import { TranscodingJob } from './transcoding-job.entity';

export enum VideoStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  creator_id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  original_filename: string;

  @Column()
  s3_key: string;

  @Column()
  mime_type: string;

  @Column('bigint')
  file_size: number;

  @Column()
  duration_seconds: number;

  @Column({ type: 'enum', enum: VideoStatus, default: VideoStatus.UPLOADING })
  status: VideoStatus;

  @Column({ nullable: true })
  thumbnail_url: string;

  @Column({ nullable: true })
  preview_url: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  is_published: boolean;

  @Column({ nullable: true })
  subscription_level: number; // 0: free, 1: premium_1, 2: premium_2

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => VideoQuality, (quality) => quality.video, { cascade: true })
  qualities: VideoQuality[];

  @OneToMany(() => TranscodingJob, (job) => job.video, { cascade: true })
  transcoding_jobs: TranscodingJob[];
}
