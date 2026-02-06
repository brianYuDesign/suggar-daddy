import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('subscriptions')
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subscriber_id', type: 'uuid' })
  @Index()
  subscriberId: string;

  @Column({ name: 'creator_id', type: 'uuid' })
  @Index()
  creatorId: string;

  @Column({ name: 'tier_id', type: 'uuid' })
  tierId: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'cancelled' | 'expired';

  @Column({ name: 'stripe_subscription_id', nullable: true })
  stripeSubscriptionId?: string;

  @Column({ name: 'current_period_start', type: 'timestamp' })
  currentPeriodStart: Date;

  @Column({ name: 'current_period_end', type: 'timestamp' })
  currentPeriodEnd: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;
}
