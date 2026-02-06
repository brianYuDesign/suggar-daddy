import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('matches')
@Unique(['userAId', 'userBId'])
export class MatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_a_id', type: 'uuid' })
  @Index()
  userAId: string;

  @Column({ name: 'user_b_id', type: 'uuid' })
  @Index()
  userBId: string;

  @CreateDateColumn({ name: 'matched_at' })
  matchedAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'unmatched' | 'blocked';
}
