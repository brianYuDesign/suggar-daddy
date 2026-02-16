import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '@suggar-daddy/auth';
import { UserRole } from '@suggar-daddy/common';
import { AuditLogService } from './audit-log.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /** GET /api/admin/audit-logs */
  @Get()
  listLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('action') action?: string,
    @Query('adminId') adminId?: string,
    @Query('targetType') targetType?: string,
  ) {
    return this.auditLogService.listLogs(page, limit, action, adminId, targetType);
  }

  /** GET /api/admin/audit-logs/:logId */
  @Get(':logId')
  async getLog(@Param('logId') logId: string) {
    const log = await this.auditLogService.getLog(logId);
    if (!log) {
      throw new NotFoundException('Audit log not found: ' + logId);
    }
    return log;
  }
}
