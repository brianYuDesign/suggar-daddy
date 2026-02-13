import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('bookmarks')
@Unique('uq_bookmarks_pair', ['userId', 'postId'])
@Index('idx_bookmarks_user_created', ['userId', 'createdAt'])
@Index('idx_bookmarks_post', ['postId'])
export class BookmarkEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  postId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
