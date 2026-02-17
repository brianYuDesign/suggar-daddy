import React, { useCallback } from 'react';
import { getToken, getTokenPayload } from '@/lib/auth';
import { useRouter } from 'next/navigation';

/**
 * Admin 權限列表
 */
export enum AdminPermission {
  VIEW_USERS = 'view_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  VIEW_CONTENT = 'view_content',
  MODERATE_CONTENT = 'moderate_content',
  DELETE_CONTENT = 'delete_content',
  VIEW_PAYMENTS = 'view_payments',
  APPROVE_WITHDRAWALS = 'approve_withdrawals',
  VIEW_SUBSCRIPTIONS = 'view_subscriptions',
  VIEW_ANALYTICS = 'view_analytics',
  VIEW_AUDIT_LOG = 'view_audit_log',
  MANAGE_SYSTEM = 'manage_system',
}

/**
 * 權限配置 - 定義哪些角色擁有哪些權限
 */
const ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  ADMIN: Object.values(AdminPermission), // 管理員擁有所有權限
  MODERATOR: [
    AdminPermission.VIEW_USERS,
    AdminPermission.VIEW_CONTENT,
    AdminPermission.MODERATE_CONTENT,
    AdminPermission.DELETE_CONTENT,
    AdminPermission.VIEW_PAYMENTS,
    AdminPermission.VIEW_SUBSCRIPTIONS,
  ],
  VIEWER: [
    AdminPermission.VIEW_USERS,
    AdminPermission.VIEW_CONTENT,
    AdminPermission.VIEW_PAYMENTS,
    AdminPermission.VIEW_SUBSCRIPTIONS,
    AdminPermission.VIEW_ANALYTICS,
  ],
};

/**
 * 權限檢查 Hook
 * 
 * 使用範例：
 * ```tsx
 * const { hasPermission, requirePermission } = usePermissions();
 * 
 * // 檢查權限
 * if (hasPermission(AdminPermission.EDIT_USERS)) {
 *   return <EditButton />;
 * }
 * 
 * // 強制要求權限（無權限則跳轉）
 * requirePermission(AdminPermission.MANAGE_SYSTEM);
 * ```
 */
export function usePermissions() {
  const router = useRouter();

  /**
   * 獲取當前用戶角色
   */
  const getUserRole = useCallback((): string | null => {
    const token = getToken();
    if (!token) return null;

    const payload = getTokenPayload(token);
    return payload?.role || null;
  }, []);

  /**
   * 獲取當前用戶的所有權限
   */
  const getUserPermissions = useCallback((): AdminPermission[] => {
    const role = getUserRole();
    if (!role) return [];

    return ROLE_PERMISSIONS[role] || [];
  }, [getUserRole]);

  /**
   * 檢查用戶是否擁有指定權限
   */
  const hasPermission = useCallback(
    (permission: AdminPermission): boolean => {
      const permissions = getUserPermissions();
      return permissions.includes(permission);
    },
    [getUserPermissions]
  );

  /**
   * 檢查用戶是否擁有任一權限
   */
  const hasAnyPermission = useCallback(
    (permissions: AdminPermission[]): boolean => {
      return permissions.some((p) => hasPermission(p));
    },
    [hasPermission]
  );

  /**
   * 檢查用戶是否擁有所有權限
   */
  const hasAllPermissions = useCallback(
    (permissions: AdminPermission[]): boolean => {
      return permissions.every((p) => hasPermission(p));
    },
    [hasPermission]
  );

  /**
   * 要求用戶擁有指定權限，否則跳轉到首頁
   */
  const requirePermission = useCallback(
    (permission: AdminPermission, redirectTo: string = '/') => {
      if (!hasPermission(permission)) {
        console.warn('[Permission] Access denied:', {
          permission,
          userRole: getUserRole(),
        });
        router.replace(redirectTo);
        return false;
      }
      return true;
    },
    [hasPermission, getUserRole, router]
  );

  /**
   * 檢查是否為超級管理員
   */
  const isSuperAdmin = useCallback((): boolean => {
    const role = getUserRole();
    return role === 'ADMIN';
  }, [getUserRole]);

  return {
    getUserRole,
    getUserPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    requirePermission,
    isSuperAdmin,
  };
}

/**
 * 權限守衛 HOC
 * 
 * 使用範例：
 * ```tsx
 * const ProtectedPage = withPermission(
 *   MyPage,
 *   AdminPermission.MANAGE_SYSTEM
 * );
 * ```
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: AdminPermission
) {
  return function ProtectedComponent(props: P) {
    const { requirePermission } = usePermissions();

    // 在組件渲染時檢查權限
    if (!requirePermission(requiredPermission)) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">無權訪問</h1>
            <p className="mt-2 text-sm text-gray-600">
              您沒有權限訪問此頁面
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
