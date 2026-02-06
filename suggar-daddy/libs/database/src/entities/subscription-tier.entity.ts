import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('subscription_tiers')
export class SubscriptionTierEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'creator_id', type: 'uuid' })
  @Index()
  creatorId: string;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'price_monthly', type: 'decimal', precision: 10, scale: 2 })
  priceMonthly: number;

  @Column({ name: 'price_yearly', type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceYearly?: number;

  @Column({ type: 'jsonb', default: '[]' })
  benefits: string[];

  @Column({ name: 'stripe_price_id', nullable: true })
  stripePriceId?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
