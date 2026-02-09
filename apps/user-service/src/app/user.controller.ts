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
import { CurrentUser, Public } from '@suggar-daddy/common';
import type { CurrentUserData } from '@suggar-daddy/common';
import { UserService } from './user.service';

@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /** 取得當前用戶完整資料（從 JWT 取 userId） */
  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserData) {
    const uid = user.userId;
    this.logger.log(`getMe request userId=${uid}`);
    const profile = await this.userService.getMe(uid);
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    return profile;
  }

  /** 取得推薦用卡片（exclude 逗號分隔的 userId，供 matching-service 使用） */
  @Public()
  @Get('cards')
  async getCards(
    @Query('exclude') excludeStr?: string,
    @Query('limit') limitStr?: string
  ) {
    const exclude = excludeStr ? excludeStr.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10) || 20));
    return this.userService.getCardsForRecommendation(exclude, limit);
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

  /** 更新當前用戶資料（從 JWT 取 userId） */
  @Put('profile')
  async updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() body: UpdateProfileDto
  ) {
    const uid = user.userId;
    this.logger.log(`updateProfile request userId=${uid}`);
    return this.userService.updateProfile(uid, body);
  }

  /** 創建用戶（註冊用；允許未登入，由 auth 或 gateway 呼叫） */
  @Public()
  @Post()
  async create(@Body() body: CreateUserDto) {
    this.logger.log(`create user request role=${body.role} displayName=${body.displayName}`);
    const user = await this.userService.create(body);
    this.logger.log(`create user result id=${user.id}`);
    return user;
  }
}
