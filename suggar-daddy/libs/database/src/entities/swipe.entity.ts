import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('swipes')
@Unique(['swiperId', 'swipedId'])
export class SwipeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'swiper_id', type: 'uuid' })
  @Index()
  swiperId: string;

  @Column({ name: 'swiped_id', type: 'uuid' })
  @Index()
  swipedId: string;

  @Column({ type: 'varchar', length: 20 })
  action: 'like' | 'pass' | 'super_like';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
