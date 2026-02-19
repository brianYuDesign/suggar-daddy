import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { RolePermission } from './role-permission.entity';

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  MANAGE = 'manage',
}

export enum PermissionResource {
  USER = 'user',
  ROLE = 'role',
  VIDEO = 'video',
  RECOMMENDATION = 'recommendation',
  PAYMENT = 'payment',
  SYSTEM = 'system',
}

@Entity('permissions')
@Index(['action', 'resource'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PermissionAction,
  })
  action: PermissionAction;

  @Column({
    type: 'enum',
    enum: PermissionResource,
  })
  resource: PermissionResource;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.permissions, { nullable: true })
  user: User;

  @OneToMany(
    () => RolePermission,
    (rolePermission) => rolePermission.permission,
    { cascade: true },
  )
  rolePermissions: RolePermission[];
}
