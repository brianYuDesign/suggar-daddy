import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from '../user/user.entity';
import { Content } from '../content/content.entity';

export enum InteractionType {
  VIEW = 'view',
  LIKE = 'like',
  SHARE = 'share',
  COMMENT = 'comment',
  SKIP = 'skip',
}

@Entity('user_interactions')
@Index(['user_id', 'content_id'])
@Index(['user_id', 'created_at'])
export class UserInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.interactions, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  user_id: string;

  @ManyToOne(() => Content, (content) => content.interactions, { onDelete: 'CASCADE' })
  content: Content;

  @Column()
  content_id: string;

  @Column({ type: 'enum', enum: InteractionType })
  interaction_type: InteractionType;

  @Column({ type: 'int', default: 1 })
  weight: number;

  @CreateDateColumn()
  created_at: Date;
}
