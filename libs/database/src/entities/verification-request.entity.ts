import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('verification_requests')
@Index('idx_vr_user', ['userId'])
@Index('idx_vr_status', ['status'])
export class VerificationRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('varchar', { length: 500 })
  selfieUrl!: string;

  @Column('varchar', { length: 20, default: 'pending' })
  status!: string;

  @Column('text', { nullable: true })
  rejectionReason!: string | null;

  @Column('uuid', { nullable: true })
  reviewedBy!: string | null;

  @Column('timestamp', { nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
