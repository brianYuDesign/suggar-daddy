/**
 * 超級管理員服務
 * 提供超級管理員專屬功能：管理員帳號管理、系統設定、權限概覽
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, AuditLogEntity } from '@suggar-daddy/database';
import { PermissionRole } from '@suggar-daddy/common';
import { RedisService } from '@suggar-daddy/redis';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepo: Repository<AuditLogEntity>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 列出所有管理員帳號
   */
  async listAdmins() {
    const admins = await this.userRepo.find({
      where: [
        { permissionRole: PermissionRole.ADMIN },
        { permissionRole: PermissionRole.SUPER_ADMIN },
      ],
      order: { createdAt: 'ASC' },
    });

    return admins.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      username: u.username,
      permissionRole: u.permissionRole,
      avatarUrl: u.avatarUrl,
      lastActiveAt: u.lastActiveAt,
      createdAt: u.createdAt,
    }));
  }

  /**
   * 提升用戶為管理員
   */
  async promoteToAdmin(userId: string, targetRole: PermissionRole) {
    if (targetRole !== PermissionRole.ADMIN && targetRole !== PermissionRole.SUPER_ADMIN) {
      throw new BadRequestException('只能提升為 admin 或 super_admin');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用戶 ' + userId + ' 不存在');
    }

    const oldRole = user.permissionRole;
    user.permissionRole = targetRole;
    user.role = targetRole;
    await this.userRepo.save(user);

    this.logger.warn(`用戶提升為管理員: ${userId} (${oldRole} -> ${targetRole})`);
    return {
      success: true,
      message: `用戶 ${user.displayName} 已提升為 ${targetRole}`,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        permissionRole: user.permissionRole,
      },
    };
  }

  /**
   * 移除管理員權限（降級為 subscriber）
   */
  async demoteAdmin(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用戶 ' + userId + ' 不存在');
    }

    if (user.permissionRole === PermissionRole.SUBSCRIBER || user.permissionRole === PermissionRole.CREATOR) {
      throw new BadRequestException('該用戶不是管理員');
    }

    // 防止移除最後一個超級管理員
    if (user.permissionRole === PermissionRole.SUPER_ADMIN) {
      const superAdminCount = await this.userRepo.count({
        where: { permissionRole: PermissionRole.SUPER_ADMIN },
      });
      if (superAdminCount <= 1) {
        throw new BadRequestException('無法移除最後一個超級管理員');
      }
    }

    const oldRole = user.permissionRole;
    user.permissionRole = PermissionRole.SUBSCRIBER;
    user.role = PermissionRole.SUBSCRIBER;
    await this.userRepo.save(user);

    this.logger.warn(`管理員降級: ${userId} (${oldRole} -> subscriber)`);
    return {
      success: true,
      message: `用戶 ${user.displayName} 已降級為一般用戶`,
    };
  }

  /**
   * 取得系統權限概覽
   */
  async getPermissionOverview() {
    const roleCounts = await this.userRepo
      .createQueryBuilder('user')
      .select('user.permissionRole', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.permissionRole')
      .getRawMany();

    const totalUsers = await this.userRepo.count();

    // 最近的管理員操作
    const recentAdminActions = await this.auditLogRepo.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      totalUsers,
      roleDistribution: roleCounts.reduce(
        (acc, r) => ({ ...acc, [r.role || 'unknown']: parseInt(r.count, 10) }),
        {},
      ),
      recentAdminActions: recentAdminActions.map((a) => ({
        id: a.id,
        action: a.action,
        adminId: a.adminId,
        targetType: a.targetType,
        targetId: a.targetId,
        method: a.method,
        path: a.path,
        statusCode: a.statusCode,
        createdAt: a.createdAt,
      })),
    };
  }

  /**
   * 強制重設用戶密碼（標記需要重設）
   */
  async forcePasswordReset(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用戶 ' + userId + ' 不存在');
    }

    // 在 Redis 標記該用戶需要重設密碼
    await this.redisService.set(
      `user:force_password_reset:${userId}`,
      'true',
    );

    this.logger.warn(`強制密碼重設: ${userId} (${user.email})`);
    return {
      success: true,
      message: `用戶 ${user.displayName} 下次登入時將被要求重設密碼`,
    };
  }
}
