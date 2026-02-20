import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
  EXPIRED = 'expired',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  QUARTERLY = 'quarterly',
}

@Entity('subscriptions')
@Index(['userId', 'status'])
@Index(['stripeSubscriptionId'])
@Index(['nextBillingDate'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column()
  planId: string; // Premium, Plus, etc.

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  status: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: BillingCycle,
    default: BillingCycle.MONTHLY,
  })
  billingCycle: BillingCycle;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column()
  stripeSubscriptionId: string;

  @Column({ nullable: true })
  stripeCustomerId?: string;

  @Column()
  startDate: Date;

  @Column({ nullable: true })
  nextBillingDate?: Date;

  @Column({ nullable: true })
  currentPeriodEnd?: Date;

  @Column({ nullable: true })
  cancelledAt?: Date;

  @Column({ nullable: true })
  cancelReason?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  autoRenew: boolean;

  @Column({ type: 'int', default: 0 })
  renewalCount: number;

  @Column({ nullable: true })
  lastRenewalDate?: Date;

  @Column({ nullable: true })
  failedRenewalAttempts?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
