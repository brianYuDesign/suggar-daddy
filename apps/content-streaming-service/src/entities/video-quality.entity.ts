import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Video } from './video.entity';

@Entity('video_qualities')
@Index(['video_id', 'quality_name'])
export class VideoQuality {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  video_id: string;

  @Column()
  quality_name: string; // 720p, 480p, 360p, 240p

  @Column()
  s3_key: string;

  @Column('bigint')
  file_size: number;

  @Column()
  width: number;

  @Column()
  height: number;

  @Column()
  bitrate: string;

  @Column()
  codec: string;

  @Column()
  fps: number;

  @Column({ nullable: true })
  cdn_url: string;

  @Column({ default: false })
  is_ready: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Video, (video) => video.qualities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'video_id' })
  video: Video;
}
