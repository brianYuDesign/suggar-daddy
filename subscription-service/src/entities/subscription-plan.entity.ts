import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('subscription_plans')
@Index(['name'])
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  yearlyPrice: number;

  @Column({ type: 'integer' })
  maxVideos: number;

  @Column({ type: 'integer' })
  maxStorageGB: number;

  @Column({
    type: 'enum',
    enum: ['free', 'basic', 'pro', 'premium'],
  })
  tier: string;

  @Column({ type: 'json' })
  features: string[];

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
