import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('swipes')
@Unique(['swiperId', 'swipedId'])
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
