import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { ContentTag } from './content-tag.entity';

@Entity('user_interests')
export class UserInterest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.interests, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  user_id: string;

  @ManyToOne(() => ContentTag, { onDelete: 'CASCADE' })
  tag: ContentTag;

  @Column()
  tag_id: string;

  @Column({ type: 'float', default: 0.5 })
  interest_score: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
