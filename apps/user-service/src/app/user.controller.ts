import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { CreateUserDto, UpdateProfileDto } from '@suggar-daddy/dto';
import { UserService } from './user.service';

@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /** 取得當前用戶完整資料 */
  @Get('me')
  async getMe(@Query('userId') userId: string) {
    const uid = userId || 'mock-user-id';
    this.logger.log(`getMe request userId=${uid}`);
    const profile = await this.userService.getMe(uid);
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    return profile;
  }

  /** 取得指定用戶對外資料 */
  @Get('profile/:userId')
  async getProfile(@Param('userId') userId: string) {
    this.logger.log(`getProfile request userId=${userId}`);
    const profile = await this.userService.getProfile(userId);
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    return profile;
  }

  /** 更新當前用戶資料 */
  @Put('profile')
  async updateProfile(
    @Query('userId') userId: string,
    @Body() body: UpdateProfileDto
  ) {
    const uid = userId || 'mock-user-id';
    this.logger.log(`updateProfile request userId=${uid}`);
    return this.userService.updateProfile(uid, body);
  }

  /** 創建用戶（註冊） */
  @Post()
  async create(@Body() body: CreateUserDto) {
    this.logger.log(`create user request role=${body.role} displayName=${body.displayName}`);
    const user = await this.userService.create(body);
    this.logger.log(`create user result id=${user.id}`);
    return user;
  }
}
