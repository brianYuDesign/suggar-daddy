import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('content_appeals')
@Index('idx_appeal_content', ['content_id'])
@Index('idx_appeal_status', ['status'])
@Index('idx_appeal_user', ['user_id'])
export class ContentAppeal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content_id: string;

  @Column()
  content_type: string;

  @Column()
  user_id: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  reviewed_at: Date;

  @Column({ nullable: true })
  reviewed_by: string;

  @Column({ nullable: true })
  resolution_note: string;

  @CreateDateColumn()
  created_at: Date;
}
