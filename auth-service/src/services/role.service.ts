import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleType, RolePermission, Permission, User } from '@/entities';
import { CreateRoleDto, UpdateRoleDto } from '@/dtos';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rolePermissionsRepository: Repository<RolePermission>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Create a new role
   */
  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.rolesRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException('Role already exists');
    }

    const role = this.rolesRepository.create(createRoleDto);
    return this.rolesRepository.save(role);
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: RoleType): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { name },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    if (!role) {
      throw new NotFoundException(`Role ${name} not found`);
    }

    return role;
  }

  /**
   * List all roles
   */
  async listRoles(): Promise<Role[]> {
    return this.rolesRepository.find({
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
  }

  /**
   * Update role
   */
  async updateRole(roleId: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.getRoleById(roleId);

    Object.assign(role, updateRoleDto);
    return this.rolesRepository.save(role);
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: string, roleType: RoleType): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const role = await this.getRoleByName(roleType);

    const hasRole = user.roles.some((r) => r.id === role.id);
    if (hasRole) {
      throw new BadRequestException('User already has this role');
    }

    user.roles.push(role);
    return this.usersRepository.save(user);
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleType: RoleType): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const role = await this.getRoleByName(roleType);

    user.roles = user.roles.filter((r) => r.id !== role.id);
    return this.usersRepository.save(user);
  }

  /**
   * Assign permission to role
   */
  async assignPermissionToRole(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    const role = await this.getRoleById(roleId);

    for (const permissionId of permissionIds) {
      const permission = await this.permissionsRepository.findOne({
        where: { id: permissionId },
      });

      if (!permission) {
        throw new NotFoundException(`Permission with ID ${permissionId} not found`);
      }

      const existingAssignment = await this.rolePermissionsRepository.findOne({
        where: { role: { id: roleId }, permission: { id: permissionId } },
      });

      if (!existingAssignment) {
        const rolePermission = this.rolePermissionsRepository.create({
          role,
          permission,
        });
        await this.rolePermissionsRepository.save(rolePermission);
      }
    }
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    const rolePermission = await this.rolePermissionsRepository.findOne({
      where: { role: { id: roleId }, permission: { id: permissionId } },
    });

    if (!rolePermission) {
      throw new NotFoundException('Role permission assignment not found');
    }

    await this.rolePermissionsRepository.remove(rolePermission);
  }

  /**
   * Get role permissions
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const rolePermissions = await this.rolePermissionsRepository.find({
      where: { role: { id: roleId } },
      relations: ['permission'],
    });

    return rolePermissions.map((rp) => rp.permission);
  }
}
