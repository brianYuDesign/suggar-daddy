import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';

@Entity('matches')
@Unique(['userAId', 'userBId'])
@Index('idx_matches_userA', ['userAId'])
@Index('idx_matches_userB', ['userBId'])
@Index('idx_matches_status', ['status'])
@Index('idx_matches_created', ['createdAt'])
export class MatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userAId!: string;

  @Column('uuid')
  userBId!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string; // active, unmatched, blocked

  @CreateDateColumn()
  matchedAt!: Date;
}
