import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type BehaviorEventType =
  | 'swipe'
  | 'view_card'
  | 'view_detail'
  | 'view_photo'
  | 'dwell_card'
  | 'dwell_detail';

@Entity('user_behavior_events')
@Index('idx_behavior_user_created', ['userId', 'createdAt'])
@Index('idx_behavior_type', ['eventType'])
export class UserBehaviorEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid', { nullable: true })
  targetUserId!: string | null;

  @Column({
    type: 'varchar',
    length: 30,
  })
  eventType!: BehaviorEventType;

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
