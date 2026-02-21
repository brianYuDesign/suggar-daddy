import { Entity, Column, PrimaryColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm';

@Entity('diamond_balances')
export class DiamondBalanceEntity {
  @PrimaryColumn('uuid')
  userId!: string;

  @Column('int', { default: 0 })
  balance!: number;

  @Column('int', { default: 0 })
  totalPurchased!: number;

  @Column('int', { default: 0 })
  totalSpent!: number;

  @Column('int', { default: 0 })
  totalReceived!: number;

  @Column('int', { default: 0 })
  totalConverted!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
