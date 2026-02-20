/**
 * Shared User Entity
 * 
 * 注意：这是一个简化版的用户实体，用于跨服务共享。
 * 各服务可以根据需要扩展此实体。
 */

export interface IUser {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserEntity implements IUser {
  id!: string;
  email!: string;
  username!: string;
  displayName?: string;
  avatarUrl?: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
