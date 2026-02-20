import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('media_files')
@Index('idx_media_user', ['userId', 'createdAt'])
@Index('idx_media_type', ['fileType'])
export class MediaFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ length: 50 })
  fileType: string; // image, video, audio

  @Column('text')
  originalUrl: string;

  @Column('text', { nullable: true })
  thumbnailUrl: string;

  @Column('text', { nullable: true })
  processedUrl: string;

  @Column({ length: 100 })
  fileName: string;

  @Column({ length: 50, nullable: true })
  mimeType: string;

  @Column('bigint', { nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  width: number;

  @Column({ nullable: true })
  height: number;

  @Column({ nullable: true })
  duration: number;

  @Column({ length: 20, default: 'pending' })
  processingStatus: string; // pending, processing, completed, failed

  @Column('jsonb', { nullable: true })
  metadata: object;

  @CreateDateColumn()
  createdAt: Date;
}
