import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('dm_purchases')
@Unique('uq_dm_purchase_pair', ['buyerId', 'creatorId'])
@Index('idx_dm_purchases_buyer', ['buyerId'])
@Index('idx_dm_purchases_creator', ['creatorId'])
export class DmPurchaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  buyerId!: string;

  @Column('uuid')
  creatorId!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column('varchar', { length: 255, nullable: true })
  stripePaymentId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
