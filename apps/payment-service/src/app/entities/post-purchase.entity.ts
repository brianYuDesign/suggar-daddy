import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Unique, Index } from 'typeorm';

@Entity('post_purchases')
@Unique(['postId', 'buyerId'])
@Index('idx_purchases_buyer', ['buyerId'])
@Index('idx_purchases_post', ['postId'])
export class PostPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  postId: string;

  @Column('uuid')
  buyerId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 100, nullable: true })
  stripePaymentId: string;

  @CreateDateColumn()
  createdAt: Date;
}
