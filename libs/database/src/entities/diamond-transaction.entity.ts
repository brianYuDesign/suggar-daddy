import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('diamond_transactions')
@Index('idx_diamond_tx_user', ['userId', 'createdAt'])
@Index('idx_diamond_tx_type', ['type'])
@Index('idx_diamond_tx_ref', ['referenceType', 'referenceId'])
export class DiamondTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ length: 30 })
  type!: string; // 'purchase' | 'spend' | 'credit' | 'transfer_in' | 'transfer_out' | 'conversion'

  @Column('int')
  amount!: number; // positive for credit, negative for debit

  @Column({ length: 50, nullable: true })
  referenceId!: string | null;

  @Column({ length: 50, nullable: true })
  referenceType!: string | null; // 'tip' | 'ppv' | 'dm_unlock' | 'super_like' | 'boost' | 'diamond_purchase' | 'cash_conversion'

  @Column({ length: 500, nullable: true })
  description!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
