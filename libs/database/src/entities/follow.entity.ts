import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('follows')
@Unique('uq_follows_pair', ['followerId', 'followedId'])
@Index('idx_follows_follower', ['followerId'])
@Index('idx_follows_followed', ['followedId'])
export class FollowEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  followerId!: string;

  @Column('uuid')
  followedId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
