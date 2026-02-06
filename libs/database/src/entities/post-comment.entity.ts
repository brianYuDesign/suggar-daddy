import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('post_comments')
@Index('idx_comments_post', ['postId', 'createdAt'])
@Index('idx_comments_user', ['userId'])
export class PostCommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  postId!: string;

  @Column('uuid')
  userId!: string;

  @Column('text')
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
