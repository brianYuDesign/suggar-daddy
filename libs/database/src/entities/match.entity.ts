import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('matches')
@Unique(['userAId', 'userBId'])
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
