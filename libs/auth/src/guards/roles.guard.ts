import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionRole, UserRole } from '@suggar-daddy/common';

// 重新導出以保持向後兼容
export { PermissionRole, UserRole };

@Injectable()
export class RolesGuard implements CanActivate {
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
      return false;
    }

    // 支援檢查 permissionRole 或舊的 role 欄位，統一轉小寫比較
    const userRole = (user.permissionRole || user.role || '').toLowerCase();

    return requiredRoles.some((role) => userRole === role.toLowerCase());
  }
}
