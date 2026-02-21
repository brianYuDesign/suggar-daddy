import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PermissionRole } from '@suggar-daddy/common';

/**
 * SuperAdminGuard - 僅允許超級管理員存取
 * 用於保護超級管理員專屬端點（如：提升/降級管理員、查看所有聊天室等）
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    const userRole = (user.permissionRole || user.role || '').toLowerCase();
    return userRole === PermissionRole.SUPER_ADMIN;
  }
}
