import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { PermissionAction, PermissionResource } from '@/entities/permission.entity';
import { RoleType } from '@/entities/role.entity';

export class CreateRoleDto {
  @IsString()
  name: RoleType;

  @IsString()
  description: string;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePermissionDto {
  @IsString()
  action: PermissionAction;

  @IsString()
  resource: PermissionResource;

  @IsString()
  description: string;
}

export class AssignPermissionToRoleDto {
  @IsString()
  roleId: string;

  @IsArray()
  permissionIds: string[];
}

export class RoleResponseDto {
  id: string;
  name: RoleType;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions?: Array<{
    id: string;
    action: PermissionAction;
    resource: PermissionResource;
    description: string;
  }>;
}

export class PermissionResponseDto {
  id: string;
  action: PermissionAction;
  resource: PermissionResource;
  description: string;
  isActive: boolean;
  createdAt: Date;
}
