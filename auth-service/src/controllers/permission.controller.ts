import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import { PermissionService } from '@/services';
import { CreatePermissionDto } from '@/dtos';
import { JwtAuthGuard, RolesGuard } from '@/guards';
import { Roles, CurrentUser } from '@/decorators';
import { RoleType, PermissionResource } from '@/entities';

@Controller('api/permissions')
@UseGuards(JwtAuthGuard)
export class PermissionController {
  constructor(private permissionService: PermissionService) {}

  /**
   * Create new permission (admin only)
   * POST /api/permissions
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleType.ADMIN)
  async createPermission(@Body() createPermissionDto: CreatePermissionDto) {
    const permission = await this.permissionService.createPermission(
      createPermissionDto,
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Permission created successfully',
      data: permission,
    };
  }

  /**
   * List all permissions
   * GET /api/permissions
   */
  @Get()
  async listPermissions() {
    const permissions = await this.permissionService.listPermissions();
    return {
      statusCode: HttpStatus.OK,
      data: permissions,
    };
  }

  /**
   * Get permission by ID
   * GET /api/permissions/:id
   */
  @Get(':id')
  async getPermissionById(@Param('id') permissionId: string) {
    const permission = await this.permissionService.getPermissionById(
      permissionId,
    );
    return {
      statusCode: HttpStatus.OK,
      data: permission,
    };
  }

  /**
   * List permissions by resource
   * GET /api/permissions/resource/:resource
   */
  @Get('resource/:resource')
  async listPermissionsByResource(@Param('resource') resource: PermissionResource) {
    const permissions = await this.permissionService.listPermissionsByResource(
      resource,
    );
    return {
      statusCode: HttpStatus.OK,
      data: permissions,
    };
  }

  /**
   * Get current user's permissions
   * GET /api/permissions/me
   */
  @Get('me')
  async getUserPermissions(@CurrentUser('userId') userId: string) {
    const permissions = await this.permissionService.getUserPermissions(userId);
    return {
      statusCode: HttpStatus.OK,
      data: permissions,
    };
  }

  /**
   * Check if user has specific permission
   * GET /api/permissions/check?action=read&resource=user
   */
  @Get('check')
  async checkPermission(
    @CurrentUser('userId') userId: string,
    @Query('action') action: string,
    @Query('resource') resource: string,
  ) {
    const hasPermission = await this.permissionService.userHasPermission(
      userId,
      action as any,
      resource as any,
    );
    return {
      statusCode: HttpStatus.OK,
      data: {
        hasPermission,
      },
    };
  }

  /**
   * Deactivate permission (admin only)
   * POST /api/permissions/:id/deactivate
   */
  @Post(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(RoleType.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deactivatePermission(@Param('id') permissionId: string) {
    await this.permissionService.deactivatePermission(permissionId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Permission deactivated successfully',
    };
  }

  /**
   * Activate permission (admin only)
   * POST /api/permissions/:id/activate
   */
  @Post(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(RoleType.ADMIN)
  @HttpCode(HttpStatus.OK)
  async activatePermission(@Param('id') permissionId: string) {
    await this.permissionService.activatePermission(permissionId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Permission activated successfully',
    };
  }
}
