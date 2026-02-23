import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('content_reports')
@Index('idx_report_post', ['post_id'])
@Index('idx_report_reporter', ['reporter_id'])
@Index('idx_report_status', ['status'])
export class ContentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reporter_id: string;

  @Column()
  post_id: string;

  @Column()
  reason: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  severity: string;

  @Column({ nullable: true })
  reviewed_at: Date;

  @Column({ nullable: true })
  reviewed_by: string;

  @Column({ nullable: true })
  resolution_note: string;

  @CreateDateColumn()
  created_at: Date;
}
