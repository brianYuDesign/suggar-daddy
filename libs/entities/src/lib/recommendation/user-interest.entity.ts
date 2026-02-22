import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../user/user.entity';
import { ContentTag } from './content-tag.entity';

@Entity('user_interests')
@Index('idx_user_interest_user_tag', ['user_id', 'tag_id'])
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
