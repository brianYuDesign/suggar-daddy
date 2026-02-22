import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Content } from './content.entity';

export enum ModerationAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  FLAG = 'flag',
  UNFLAG = 'unflag',
}

@Entity('moderation_logs')
@Index('idx_modlog_content', ['content_id'])
export class ModerationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content_id: string;

  @Column({
    type: 'enum',
    enum: ModerationAction,
  })
  action: ModerationAction;

  @Column({ nullable: true })
  reason: string;

  @Column()
  performed_by: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Content, (content) => content.moderation_logs)
  @JoinColumn({ name: 'content_id' })
  content: Content;
}
