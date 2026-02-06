import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('subscription_tiers')
export class SubscriptionTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  creatorId: string;

  @Column({ length: 50 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  priceMonthly: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  priceYearly: number;

  @Column('jsonb', { default: '[]' })
  benefits: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ length: 100, nullable: true })
  stripePriceId: string;

  @CreateDateColumn()
  createdAt: Date;
}
