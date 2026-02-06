import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('subscription_tiers')
@Index('idx_subscription_tiers_creator', ['creatorId'])
export class SubscriptionTierEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  creatorId!: string;

  @Column({ length: 50 })
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('decimal', { precision: 10, scale: 2 })
  priceMonthly!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  priceYearly!: number | null;

  @Column('jsonb', { default: () => "'[]'" })
  benefits!: string[];

  @Column('boolean', { default: true })
  isActive!: boolean;

  @Column({ length: 100, nullable: true })
  stripePriceId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
