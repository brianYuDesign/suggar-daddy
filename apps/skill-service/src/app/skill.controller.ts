import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { SkillService } from './skill.service';
import {
  CurrentUser,
  Public,
  Roles,
  OptionalJwtGuard,
  JwtAuthGuard,
  type CurrentUserData,
} from '@suggar-daddy/auth';
import { PermissionRole } from '@suggar-daddy/common';
import {
  SkillDto,
  UserSkillDto,
  CreateSkillDto,
  UpdateSkillDto,
  AddUserSkillDto,
  UpdateUserSkillDto,
  SkillCategory,
} from '@suggar-daddy/dto';

@Controller()
export class SkillController {
  private readonly logger = new Logger(SkillController.name);

  constructor(private readonly skillService: SkillService) {}

  // ─── Public Skills API ────────────────────────────────────────────

  @UseGuards(OptionalJwtGuard)
  @Get()
  async getSkills(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ): Promise<SkillDto[]> {
    this.logger.log(`getSkills category=${category} isActive=${isActive}`);

    if (category) {
      return this.skillService.getSkillsByCategory(
        category as SkillCategory,
        isActive !== 'false',
      );
    }

    const activeFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.skillService.getAllSkills(activeFilter);
  }

  @UseGuards(OptionalJwtGuard)
  @Get(':id')
  async getSkillById(@Param('id') id: string): Promise<SkillDto> {
    this.logger.log(`getSkillById id=${id}`);
    return this.skillService.getSkillById(id);
  }

  // ─── User Skills API ──────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('users/:userId')
  async getUserSkills(@Param('userId') userId: string): Promise<UserSkillDto[]> {
    this.logger.log(`getUserSkills userId=${userId}`);
    return this.skillService.getUserSkills(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/me/my-skills')
  async getMySkills(@CurrentUser() user: CurrentUserData): Promise<UserSkillDto[]> {
    this.logger.log(`getMySkills userId=${user.userId}`);
    return this.skillService.getUserSkills(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('users/me')
  async addMySkill(
    @CurrentUser() user: CurrentUserData,
    @Body() data: AddUserSkillDto,
  ): Promise<UserSkillDto> {
    this.logger.log(`addMySkill userId=${user.userId} skillId=${data.skillId}`);
    return this.skillService.addUserSkill(user.userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('users/me/:skillId')
  async updateMySkill(
    @CurrentUser() user: CurrentUserData,
    @Param('skillId') skillId: string,
    @Body() data: UpdateUserSkillDto,
  ): Promise<UserSkillDto> {
    this.logger.log(`updateMySkill userId=${user.userId} skillId=${skillId}`);
    return this.skillService.updateUserSkill(user.userId, skillId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('users/me/:skillId')
  async deleteMySkill(
    @CurrentUser() user: CurrentUserData,
    @Param('skillId') skillId: string,
  ): Promise<{ success: boolean }> {
    this.logger.log(`deleteMySkill userId=${user.userId} skillId=${skillId}`);
    await this.skillService.deleteUserSkill(user.userId, skillId);
    return { success: true };
  }

  // ─── Admin Skills API ─────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Roles(PermissionRole.ADMIN)
  @Get('admin/all')
  async getAllSkillsAdmin(
    @Query('isActive') isActive?: string,
  ): Promise<SkillDto[]> {
    this.logger.log(`getAllSkillsAdmin isActive=${isActive}`);
    const activeFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.skillService.getAllSkills(activeFilter);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(PermissionRole.ADMIN)
  @Post('admin/skills')
  async createSkill(@Body() data: CreateSkillDto): Promise<SkillDto> {
    this.logger.log(`createSkill category=${data.category} name=${data.name}`);
    return this.skillService.createSkill(data);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(PermissionRole.ADMIN)
  @Patch('admin/skills/:id')
  async updateSkill(
    @Param('id') id: string,
    @Body() data: UpdateSkillDto,
  ): Promise<SkillDto> {
    this.logger.log(`updateSkill id=${id}`);
    return this.skillService.updateSkill(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(PermissionRole.ADMIN)
  @Delete('admin/skills/:id')
  async deleteSkill(@Param('id') id: string): Promise<{ success: boolean }> {
    this.logger.log(`deleteSkill id=${id}`);
    await this.skillService.deleteSkill(id);
    return { success: true };
  }
}
