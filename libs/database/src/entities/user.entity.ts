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
import { UserType, PermissionRole } from '@suggar-daddy/common';

// 重新導出以保持向後兼容
export { UserType, PermissionRole };

@Entity('users')
@Unique(['email'])
@Index('idx_users_location', ['latitude', 'longitude'])
@Index('idx_users_user_type', ['userType'])
@Index('idx_users_permission_role', ['permissionRole'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  email!: string;

  @Index('idx_users_username', { unique: true })
  @Column('varchar', { length: 20, unique: true, nullable: true })
  username!: string | null;

  @Exclude()
  @Column('varchar', { length: 255 })
  passwordHash!: string;

  @Column('varchar', { length: 100 })
  displayName!: string;

  /** 業務角色：sugar_baby 或 sugar_daddy */
  @Column({
    type: 'varchar',
    length: 50,
    enum: UserType,
  })
  userType!: UserType;

  /** 權限角色：subscriber, creator 或 admin */
  @Column({
    type: 'varchar',
    length: 50,
    enum: PermissionRole,
    default: PermissionRole.SUBSCRIBER,
  })
  permissionRole!: PermissionRole;

  /** @deprecated 舊的 role 欄位，將在後續版本移除。請使用 userType 和 permissionRole */
  @Column('varchar', { length: 50, default: 'subscriber', nullable: true })
  role?: string;

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

  @Column('date', { nullable: true })
  birthDate!: Date | null;

  @Column('int', { nullable: true })
  preferredAgeMin!: number | null;

  @Column('int', { nullable: true })
  preferredAgeMax!: number | null;

  @Column('int', { nullable: true, default: 50 })
  preferredDistance!: number | null;

  @Column('varchar', { length: 20, nullable: true })
  preferredUserType!: string | null;

  @Column('timestamp', { nullable: true })
  lastActiveAt!: Date | null;

  @Column('varchar', { length: 20, default: 'unverified' })
  verificationStatus!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
