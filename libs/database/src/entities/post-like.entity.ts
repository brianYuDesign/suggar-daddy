import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('post_likes')
@Unique(['postId', 'userId'])
@Index('idx_likes_post', ['postId'])
@Index('idx_likes_user', ['userId'])
export class PostLikeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  postId!: string;

  @Column('uuid')
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
