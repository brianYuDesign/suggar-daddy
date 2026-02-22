import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('profile_views')
@Index('idx_pv_viewed', ['viewedUserId', 'viewedAt'])
@Index('idx_pv_viewer', ['viewerId'])
export class ProfileViewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  viewedUserId!: string;

  @Column('uuid')
  viewerId!: string;

  @CreateDateColumn()
  viewedAt!: Date;
}
