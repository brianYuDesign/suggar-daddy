import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('transactions')
@Index('idx_transactions_user', ['userId', 'createdAt'])
@Index('idx_transactions_stripe', ['stripePaymentId'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ length: 50 })
  type: string; // subscription, ppv, tip

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 20 })
  status: string; // pending, succeeded, failed, refunded

  @Column({ length: 100, nullable: true })
  stripePaymentId: string;

  @Column('uuid', { nullable: true })
  relatedEntityId: string;

  @Column({ length: 50, nullable: true })
  relatedEntityType: string;

  @Column('jsonb', { nullable: true })
  metadata: object;

  @CreateDateColumn()
  createdAt: Date;
}
