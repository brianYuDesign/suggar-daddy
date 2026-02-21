import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('diamond_purchases')
@Index('idx_diamond_purchase_user', ['userId', 'createdAt'])
@Index('idx_diamond_purchase_stripe', ['stripePaymentId'])
export class DiamondPurchaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ length: 50 })
  packageId!: string;

  @Column('int')
  diamondAmount!: number;

  @Column('int', { default: 0 })
  bonusDiamonds!: number;

  @Column('int')
  totalDiamonds!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amountUsd!: number;

  @Column({ length: 100, nullable: true })
  stripePaymentId!: string | null;

  @Column({ length: 20, default: 'completed' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
