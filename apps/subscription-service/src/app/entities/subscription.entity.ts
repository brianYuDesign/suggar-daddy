import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('subscriptions')
@Index('idx_subs_subscriber', ['subscriberId'], { where: "status = 'active'" })
@Index('idx_subs_creator', ['creatorId'], { where: "status = 'active'" })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  subscriberId: string;

  @Column('uuid')
  creatorId: string;

  @Column('uuid')
  tierId: string;

  @Column({ length: 20, default: 'active' })
  status: string; // active, cancelled, expired

  @Column({ length: 100, nullable: true })
  stripeSubscriptionId: string;

  @Column('timestamp', { nullable: true })
  currentPeriodStart: Date;

  @Column('timestamp', { nullable: true })
  currentPeriodEnd: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column('timestamp', { nullable: true })
  cancelledAt: Date;
}
