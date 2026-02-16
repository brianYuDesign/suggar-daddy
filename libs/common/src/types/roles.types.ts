/**
 * 統一的角色類型定義
 * 此檔案定義所有角色相關的類型，避免循環依賴
 */

/**
 * 業務角色：使用者註冊時選擇的身份類型
 */
export enum UserType {
  SUGAR_BABY = 'sugar_baby',
  SUGAR_DADDY = 'sugar_daddy',
}

/**
 * 權限角色：使用者在系統中的權限等級
 */
export enum PermissionRole {
  SUBSCRIBER = 'subscriber',  // 一般訂閱者
  CREATOR = 'creator',        // 內容創作者
  ADMIN = 'admin',            // 系統管理員
}

/**
 * 業務角色類型（用於類型檢查）
 */
export type UserTypeValue = `${UserType}`;

/**
 * 權限角色類型（用於類型檢查）
 */
export type PermissionRoleValue = `${PermissionRole}`;

/**
 * @deprecated 使用 PermissionRole 替代
 * 為了向後兼容保留此 type
 */
export enum UserRole {
  ADMIN = 'admin',
  CREATOR = 'creator',
  SUBSCRIBER = 'subscriber',
}
