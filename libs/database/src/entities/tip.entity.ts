import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('tips')
@Index('idx_tips_from', ['fromUserId', 'createdAt'])
@Index('idx_tips_to', ['toUserId', 'createdAt'])
export class TipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  fromUserId!: string;

  @Column('uuid')
  toUserId!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount!: number;

  @Column('text', { nullable: true })
  message!: string | null;

  @Column({ length: 100, nullable: true })
  stripePaymentId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
