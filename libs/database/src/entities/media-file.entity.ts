import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('media_files')
@Index('idx_media_user', ['userId', 'createdAt'])
@Index('idx_media_type', ['fileType'])
export class MediaFileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ length: 50 })
  fileType!: string;

  @Column('text')
  originalUrl!: string;

  @Column('text', { nullable: true })
  thumbnailUrl!: string | null;

  @Column('text', { nullable: true })
  processedUrl!: string | null;

  @Column('varchar', { length: 100 })
  fileName!: string;

  @Column({ length: 50, nullable: true })
  mimeType!: string | null;

  @Column('bigint', { nullable: true })
  fileSize!: number | null;

  @Column('int', { nullable: true })
  width!: number | null;

  @Column('int', { nullable: true })
  height!: number | null;

  @Column('int', { nullable: true })
  duration!: number | null;

  @Column({ length: 20, default: 'pending' })
  processingStatus!: string;

  @Column('jsonb', { nullable: true })
  metadata!: object | null;

  @CreateDateColumn()
  createdAt!: Date;
}
