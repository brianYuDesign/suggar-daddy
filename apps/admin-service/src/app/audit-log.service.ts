import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '@suggar-daddy/database';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepo: Repository<AuditLogEntity>,
  ) {}

  async createLog(data: {
    action: string;
    adminId: string;
    targetType?: string;
    targetId?: string;
    details?: string;
    method: string;
    path: string;
    statusCode?: number;
  }) {
    const log = this.auditLogRepo.create({
      action: data.action,
      adminId: data.adminId,
      targetType: data.targetType || null,
      targetId: data.targetId || null,
      details: data.details || null,
      method: data.method,
      path: data.path,
      statusCode: data.statusCode || null,
    });
    return this.auditLogRepo.save(log);
  }

  async listLogs(
    page: number,
    limit: number,
    action?: string,
    adminId?: string,
    targetType?: string,
  ) {
    const qb = this.auditLogRepo.createQueryBuilder('log');

    if (action) {
      qb.andWhere('log.action = :action', { action });
    }
    if (adminId) {
      qb.andWhere('log.adminId = :adminId', { adminId });
    }
    if (targetType) {
      qb.andWhere('log.targetType = :targetType', { targetType });
    }

    qb.orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getLog(logId: string) {
    return this.auditLogRepo.findOne({ where: { id: logId } });
  }
}
