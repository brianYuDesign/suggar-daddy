import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: 'sugar_baby' })
  role: 'sugar_daddy' | 'sugar_baby' | 'creator' | 'subscriber';

  @Column({ name: 'display_name', length: 100 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ type: 'jsonb', default: '[]' })
  photos: string[];

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: Date;

  @Column({ type: 'float', nullable: true })
  lat?: number;

  @Column({ type: 'float', nullable: true })
  lng?: number;

  @Column({ type: 'jsonb', default: '{}' })
  preferences: Record<string, unknown>;

  @Column({
    name: 'verification_status',
    type: 'varchar',
    length: 20,
    default: 'unverified',
  })
  verificationStatus: 'unverified' | 'pending' | 'verified';

  @Column({ name: 'stripe_customer_id', nullable: true })
  stripeCustomerId?: string;

  @Column({ name: 'stripe_account_id', nullable: true })
  stripeAccountId?: string;

  @Column({ name: 'last_active_at', type: 'timestamp', default: () => 'NOW()' })
  @Index()
  lastActiveAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
