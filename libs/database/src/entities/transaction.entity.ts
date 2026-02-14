import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('transactions')
@Index('idx_transactions_user', ['userId', 'createdAt'])
@Index('idx_transactions_stripe', ['stripePaymentId'])
@Index('idx_transactions_status', ['status'])
@Index('idx_transactions_type', ['type'])
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ length: 50 })
  type!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column({ length: 20 })
  status!: string;

  @Column({ length: 100, nullable: true })
  stripePaymentId!: string | null;

  @Column('uuid', { nullable: true })
  relatedEntityId!: string | null;

  @Column({ length: 50, nullable: true })
  relatedEntityType!: string | null;

  @Column('jsonb', { nullable: true })
  metadata!: object | null;

  @CreateDateColumn()
  createdAt!: Date;
}
