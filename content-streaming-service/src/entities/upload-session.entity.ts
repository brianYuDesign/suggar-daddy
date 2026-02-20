import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('upload_sessions')
@Index(['creator_id', 'created_at'])
export class UploadSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  creator_id: string;

  @Column()
  filename: string;

  @Column()
  content_type: string;

  @Column('bigint')
  file_size: number;

  @Column()
  chunk_size: number;

  @Column()
  total_chunks: number;

  @Column('text', { array: true, default: () => 'ARRAY[]::text[]' })
  uploaded_chunks: string[];

  @Column({ nullable: true })
  s3_key: string;

  @Column({ default: false })
  is_completed: boolean;

  @Column({ nullable: true })
  completed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
