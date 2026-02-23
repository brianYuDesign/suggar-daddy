import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('user_blocks')
@Unique(['blockerId', 'blockedId'])
export class UserBlockEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_user_block_blocker')
  @Column('uuid')
  blockerId!: string;

  @Column('uuid')
  blockedId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
