import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
@Unique(['email'])
@Index('idx_users_location', ['latitude', 'longitude'])
@Index('idx_users_role', ['role'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  email!: string;

  @Exclude()
  @Column('varchar', { length: 255 })
  passwordHash!: string;

  @Column('varchar', { length: 100 })
  displayName!: string;

  @Column('varchar', { length: 50, default: 'subscriber' })
  role!: string;

  @Column('text', { nullable: true })
  bio!: string | null;

  @Column('varchar', { length: 500, nullable: true })
  avatarUrl!: string | null;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitude!: number | null;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitude!: number | null;

  @Column('varchar', { length: 100, nullable: true })
  city!: string | null;

  @Column('varchar', { length: 100, nullable: true })
  country!: string | null;

  @Column('timestamp', { nullable: true })
  locationUpdatedAt!: Date | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  dmPrice!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
