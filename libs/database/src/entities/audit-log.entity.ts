import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
@Index('idx_audit_logs_admin', ['adminId', 'createdAt'])
@Index('idx_audit_logs_action', ['action'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  action!: string;

  @Column('uuid')
  adminId!: string;

  @Column({ length: 50, nullable: true })
  targetType!: string | null;

  @Column('uuid', { nullable: true })
  targetId!: string | null;

  @Column('text', { nullable: true })
  details!: string | null;

  @Column({ length: 10 })
  method!: string;

  @Column({ length: 500 })
  path!: string;

  @Column('int', { nullable: true })
  statusCode!: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}
