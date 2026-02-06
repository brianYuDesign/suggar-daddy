import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('subscriptions')
@Index('idx_subs_subscriber', ['subscriberId'])
@Index('idx_subs_creator', ['creatorId'])
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  subscriberId!: string;

  @Column('uuid')
  creatorId!: string;

  @Column('uuid')
  tierId!: string;

  @Column({ length: 20, default: 'active' })
  status!: string;

  @Column({ length: 100, nullable: true })
  stripeSubscriptionId!: string | null;

  @Column('timestamp', { nullable: true })
  currentPeriodStart!: Date | null;

  @Column('timestamp', { nullable: true })
  currentPeriodEnd!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column('timestamp', { nullable: true })
  cancelledAt!: Date | null;
}
