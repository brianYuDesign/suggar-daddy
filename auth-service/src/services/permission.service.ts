import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission, PermissionAction, PermissionResource, Role, User } from '@/entities';
import { CreatePermissionDto } from '@/dtos';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Create a new permission
   */
  async createPermission(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    const existingPermission = await this.permissionsRepository.findOne({
      where: {
        action: createPermissionDto.action,
        resource: createPermissionDto.resource,
      },
    });

    if (existingPermission) {
      throw new ConflictException('Permission already exists');
    }

    const permission = this.permissionsRepository.create(createPermissionDto);
    return this.permissionsRepository.save(permission);
  }

  /**
   * Get permission by ID
   */
  async getPermissionById(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return permission;
  }

  /**
   * Get permission by action and resource
   */
  async getPermissionByActionResource(
    action: PermissionAction,
    resource: PermissionResource,
  ): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { action, resource },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  /**
   * List all permissions
   */
  async listPermissions(): Promise<Permission[]> {
    return this.permissionsRepository.find();
  }

  /**
   * List permissions by resource
   */
  async listPermissionsByResource(resource: PermissionResource): Promise<Permission[]> {
    return this.permissionsRepository.find({
      where: { resource },
    });
  }

  /**
   * Check if user has specific permission
   */
  async userHasPermission(
    userId: string,
    action: PermissionAction,
    resource: PermissionResource,
  ): Promise<boolean> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.rolePermissions', 'roles.rolePermissions.permission'],
    });

    if (!user) {
      return false;
    }

    for (const role of user.roles) {
      for (const rolePermission of role.rolePermissions) {
        const permission = rolePermission.permission;
        if (permission.action === action && permission.resource === resource && permission.isActive) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if user has multiple permissions
   */
  async userHasPermissions(
    userId: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    if (requiredPermissions.length === 0) {
      return true;
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.rolePermissions', 'roles.rolePermissions.permission'],
    });

    if (!user) {
      return false;
    }

    for (const requiredPerm of requiredPermissions) {
      const [action, resource] = requiredPerm.split(':');
      let hasPermission = false;

      for (const role of user.roles) {
        for (const rolePermission of role.rolePermissions) {
          const permission = rolePermission.permission;
          if (
            permission.action === action &&
            permission.resource === resource &&
            permission.isActive
          ) {
            hasPermission = true;
            break;
          }
        }
        if (hasPermission) break;
      }

      if (!hasPermission) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all permissions for a user (aggregated from roles)
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.rolePermissions', 'roles.rolePermissions.permission'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissionsSet = new Set<string>();
    const permissions: Permission[] = [];

    for (const role of user.roles) {
      for (const rolePermission of role.rolePermissions) {
        const permissionKey = `${rolePermission.permission.action}:${rolePermission.permission.resource}`;
        if (!permissionsSet.has(permissionKey) && rolePermission.permission.isActive) {
          permissionsSet.add(permissionKey);
          permissions.push(rolePermission.permission);
        }
      }
    }

    return permissions;
  }

  /**
   * Deactivate permission
   */
  async deactivatePermission(permissionId: string): Promise<void> {
    const permission = await this.getPermissionById(permissionId);
    permission.isActive = false;
    await this.permissionsRepository.save(permission);
  }

  /**
   * Activate permission
   */
  async activatePermission(permissionId: string): Promise<void> {
    const permission = await this.getPermissionById(permissionId);
    permission.isActive = true;
    await this.permissionsRepository.save(permission);
  }
}
