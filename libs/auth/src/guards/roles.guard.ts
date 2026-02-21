import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionRole, UserRole, PERMISSION_ROLE_HIERARCHY } from '@suggar-daddy/common';

// 重新導出以保持向後兼容
export { PermissionRole, UserRole };

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<(PermissionRole | UserRole)[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      this.logger.warn(`[RolesGuard] DENIED: no user on request. required=${JSON.stringify(requiredRoles)}`);
      return false;
    }

    // 支援檢查 permissionRole 或舊的 role 欄位，統一轉小寫比較
    const userRole = (user.permissionRole || user.role || '').toLowerCase();

    this.logger.debug(`[RolesGuard] user=${user.userId} permissionRole=${user.permissionRole} role=${user.role} resolved=${userRole} required=${JSON.stringify(requiredRoles)}`);

    // super_admin 擁有所有權限，直接放行
    if (userRole === PermissionRole.SUPER_ADMIN) {
      return true;
    }

    // 層級式權限檢查：使用者的權限等級 >= 所需的最低權限等級即可
    const userLevel = PERMISSION_ROLE_HIERARCHY[userRole as PermissionRole] ?? -1;

    const result = requiredRoles.some((role) => {
      const requiredLevel = PERMISSION_ROLE_HIERARCHY[role.toLowerCase() as PermissionRole];
      // 如果有定義層級，使用層級比較；否則回退到精確匹配
      if (requiredLevel !== undefined && userLevel >= 0) {
        return userLevel >= requiredLevel;
      }
      return userRole === role.toLowerCase();
    });

    if (!result) {
      this.logger.warn(`[RolesGuard] DENIED: user=${user.userId} userRole=${userRole} userLevel=${userLevel} required=${JSON.stringify(requiredRoles)}`);
    }

    return result;
  }
}
