import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { RoleService } from '@/services';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionToRoleDto } from '@/dtos';
import { JwtAuthGuard, RolesGuard } from '@/guards';
import { Roles } from '@/decorators';
import { RoleType } from '@/entities';

@Controller('api/roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN)
export class RoleController {
  constructor(private roleService: RoleService) {}

  /**
   * Create new role
   * POST /api/roles
   */
  @Post()
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    const role = await this.roleService.createRole(createRoleDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Role created successfully',
      data: role,
    };
  }

  /**
   * List all roles
   * GET /api/roles
   */
  @Get()
  async listRoles() {
    const roles = await this.roleService.listRoles();
    return {
      statusCode: HttpStatus.OK,
      data: roles,
    };
  }

  /**
   * Get role by ID
   * GET /api/roles/:id
   */
  @Get(':id')
  async getRoleById(@Param('id') roleId: string) {
    const role = await this.roleService.getRoleById(roleId);
    return {
      statusCode: HttpStatus.OK,
      data: role,
    };
  }

  /**
   * Update role
   * PATCH /api/roles/:id
   */
  @Patch(':id')
  async updateRole(
    @Param('id') roleId: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    const role = await this.roleService.updateRole(roleId, updateRoleDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Role updated successfully',
      data: role,
    };
  }

  /**
   * Assign permission to role
   * POST /api/roles/:id/permissions
   */
  @Post(':id/permissions')
  @HttpCode(HttpStatus.OK)
  async assignPermission(
    @Param('id') roleId: string,
    @Body() assignPermissionDto: AssignPermissionToRoleDto,
  ) {
    await this.roleService.assignPermissionToRole(
      roleId,
      assignPermissionDto.permissionIds,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Permissions assigned successfully',
    };
  }

  /**
   * Remove permission from role
   * DELETE /api/roles/:id/permissions/:permissionId
   */
  @HttpCode(HttpStatus.OK)
  async removePermission(
    @Param('id') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    await this.roleService.removePermissionFromRole(roleId, permissionId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Permission removed successfully',
    };
  }

  /**
   * Get role permissions
   * GET /api/roles/:id/permissions
   */
  @Get(':id/permissions')
  async getRolePermissions(@Param('id') roleId: string) {
    const permissions = await this.roleService.getRolePermissions(roleId);
    return {
      statusCode: HttpStatus.OK,
      data: permissions,
    };
  }
}
