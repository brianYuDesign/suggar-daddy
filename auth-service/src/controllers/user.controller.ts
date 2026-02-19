import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { UserService } from '@/services';
import { UpdateUserDto, UserResponseDto } from '@/dtos';
import { JwtAuthGuard, RolesGuard } from '@/guards';
import { Roles, CurrentUser } from '@/decorators';
import { RoleType } from '@/entities';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Get current user profile
   * GET /api/v1/users/profile
   */
  @Get('profile')
  async getProfile(@CurrentUser('userId') userId: string) {
    const user = await this.userService.getUserResponse(userId);
    return {
      statusCode: HttpStatus.OK,
      data: user,
    };
  }

  /**
   * Update current user profile
   * PATCH /api/v1/users/profile
   */
  @Patch('profile')
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    await this.userService.updateUser(userId, updateUserDto);
    const user = await this.userService.getUserResponse(userId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: user,
    };
  }

  /**
   * List all users (admin only)
   * GET /api/v1/users
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleType.ADMIN)
  async listUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const result = await this.userService.listUsers(page, limit);
    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  /**
   * Get user by ID (admin only)
   * GET /api/v1/users/:id
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleType.ADMIN)
  async getUserById(@Param('id') userId: string) {
    const user = await this.userService.getUserResponse(userId);
    return {
      statusCode: HttpStatus.OK,
      data: user,
    };
  }

  /**
   * Deactivate user (admin only)
   * POST /api/v1/users/:id/deactivate
   */
  @Post(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(RoleType.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deactivateUser(@Param('id') userId: string) {
    await this.userService.deactivateUser(userId);
    return {
      statusCode: HttpStatus.OK,
      message: 'User deactivated successfully',
    };
  }

  /**
   * Activate user (admin only)
   * POST /api/v1/users/:id/activate
   */
  @Post(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(RoleType.ADMIN)
  @HttpCode(HttpStatus.OK)
  async activateUser(@Param('id') userId: string) {
    await this.userService.activateUser(userId);
    return {
      statusCode: HttpStatus.OK,
      message: 'User activated successfully',
    };
  }

  /**
   * Delete user (admin only)
   * DELETE /api/v1/users/:id
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleType.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') userId: string) {
    await this.userService.deleteUser(userId);
    return {
      statusCode: HttpStatus.OK,
      message: 'User deleted successfully',
    };
  }
}
