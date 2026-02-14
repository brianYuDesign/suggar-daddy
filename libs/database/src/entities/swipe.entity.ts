import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';

@Entity('swipes')
@Unique(['swiperId', 'swipedId'])
@Index('idx_swipes_swiper_created', ['swiperId', 'createdAt'])
@Index('idx_swipes_swiped_created', ['swipedId', 'createdAt'])
export class SwipeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  swiperId!: string;

  @Column('uuid')
  swipedId!: string;

  @Column({ type: 'varchar', length: 20 })
  action!: string; // like, pass, super_like

  @CreateDateColumn()
  createdAt!: Date;
}
