import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { SkillRepository } from './skill.repository';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import {
  SkillDto,
  UserSkillDto,
  CreateSkillDto,
  UpdateSkillDto,
  AddUserSkillDto,
  UpdateUserSkillDto,
  SkillCategory,
} from '@suggar-daddy/dto';
import { SkillEntity, UserSkillEntity } from '@suggar-daddy/database';

@Injectable()
export class SkillService {
  private readonly logger = new Logger(SkillService.name);
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_KEY_ALL_SKILLS = 'skills:all';
  private readonly CACHE_KEY_CATEGORY_PREFIX = 'skills:category:';
  private readonly CACHE_KEY_USER_SKILLS_PREFIX = 'user:skills:';

  constructor(
    private readonly skillRepo: SkillRepository,
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  // ─── Skill CRUD (Admin) ───────────────────────────────────────────

  async getAllSkills(isActive?: boolean): Promise<SkillDto[]> {
    // Try cache first for active skills
    if (isActive === true) {
      const cached = await this.redisService.get(this.CACHE_KEY_ALL_SKILLS);
      if (cached) {
        this.logger.log('Returning skills from cache');
        return JSON.parse(cached);
      }
    }

    const skills = await this.skillRepo.findAllSkills(isActive);
    const dtos = skills.map(this.toSkillDto);

    // Cache active skills
    if (isActive === true) {
      await this.redisService.set(this.CACHE_KEY_ALL_SKILLS, JSON.stringify(dtos), this.CACHE_TTL);
    }

    return dtos;
  }

  async getSkillsByCategory(category: SkillCategory, isActive = true): Promise<SkillDto[]> {
    const cacheKey = `${this.CACHE_KEY_CATEGORY_PREFIX}${category}`;
    
    // Try cache
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.log(`Returning skills for category ${category} from cache`);
      return JSON.parse(cached);
    }

    const skills = await this.skillRepo.findSkillsByCategory(category, isActive);
    const dtos = skills.map(this.toSkillDto);

    // Cache result
    await this.redisService.set(cacheKey, JSON.stringify(dtos), this.CACHE_TTL);

    return dtos;
  }

  async getSkillById(id: string): Promise<SkillDto> {
    const skill = await this.skillRepo.findSkillById(id);
    if (!skill) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }
    return this.toSkillDto(skill);
  }

  async createSkill(data: CreateSkillDto): Promise<SkillDto> {
    const skill = await this.skillRepo.createSkill({
      ...data,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    });

    // Publish Kafka event
    await this.kafkaProducer.send('skill.created', [
      {
        key: skill.id,
        value: JSON.stringify({
          skillId: skill.id,
          category: skill.category,
          name: skill.name,
          timestamp: new Date().toISOString(),
        }),
      },
    ]);

    // Clear cache
    await this.clearSkillCache(skill.category);

    return this.toSkillDto(skill);
  }

  async updateSkill(id: string, data: UpdateSkillDto): Promise<SkillDto> {
    const existing = await this.skillRepo.findSkillById(id);
    if (!existing) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }

    const updated = await this.skillRepo.updateSkill(id, data);
    if (!updated) {
      throw new NotFoundException(`Skill with ID ${id} not found after update`);
    }

    // Publish Kafka event
    await this.kafkaProducer.send('skill.updated', [
      {
        key: id,
        value: JSON.stringify({
          skillId: id,
          updates: data,
          timestamp: new Date().toISOString(),
        }),
      },
    ]);

    // Clear cache
    await this.clearSkillCache(updated.category);

    return this.toSkillDto(updated);
  }

  async deleteSkill(id: string): Promise<void> {
    const skill = await this.skillRepo.findSkillById(id);
    if (!skill) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }

    const deleted = await this.skillRepo.deleteSkill(id);
    if (!deleted) {
      throw new BadRequestException(`Failed to delete skill ${id}`);
    }

    // Publish Kafka event
    await this.kafkaProducer.send('skill.deleted', [
      {
        key: id,
        value: JSON.stringify({
          skillId: id,
          timestamp: new Date().toISOString(),
        }),
      },
    ]);

    // Clear cache
    await this.clearSkillCache(skill.category);
  }

  // ─── User Skills ──────────────────────────────────────────────────

  async getUserSkills(userId: string): Promise<UserSkillDto[]> {
    const cacheKey = `${this.CACHE_KEY_USER_SKILLS_PREFIX}${userId}`;
    
    // Try cache
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.log(`Returning user skills for ${userId} from cache`);
      return JSON.parse(cached);
    }

    const userSkills = await this.skillRepo.findUserSkills(userId);
    const dtos = userSkills.map(this.toUserSkillDto);

    // Cache result (shorter TTL for user data)
    await this.redisService.set(cacheKey, JSON.stringify(dtos), 300); // 5 minutes

    return dtos;
  }

  async addUserSkill(userId: string, data: AddUserSkillDto): Promise<UserSkillDto> {
    // Verify skill exists and is active
    const skill = await this.skillRepo.findSkillById(data.skillId);
    if (!skill || !skill.isActive) {
      throw new BadRequestException('Skill not found or inactive');
    }

    // Check if already exists
    const existing = await this.skillRepo.findUserSkillById(userId, data.skillId);
    if (existing) {
      throw new ConflictException('User already has this skill');
    }

    // Check highlight limit (max 5)
    if (data.isHighlight) {
      const highlightCount = await this.skillRepo.countHighlightSkills(userId);
      if (highlightCount >= 5) {
        throw new BadRequestException('Cannot highlight more than 5 skills');
      }
    }

    const userSkill = await this.skillRepo.createUserSkill({
      userId,
      skillId: data.skillId,
      proficiencyLevel: data.proficiencyLevel ?? null,
      isHighlight: data.isHighlight ?? false,
    });

    // Publish Kafka event
    await this.kafkaProducer.send('user.skill.added', [
      {
        key: userId,
        value: JSON.stringify({
          userId,
          skillId: data.skillId,
          proficiencyLevel: data.proficiencyLevel,
          isHighlight: data.isHighlight,
          timestamp: new Date().toISOString(),
        }),
      },
    ]);

    // Clear user cache
    await this.clearUserSkillCache(userId);

    return this.toUserSkillDto(userSkill);
  }

  async updateUserSkill(
    userId: string,
    skillId: string,
    data: UpdateUserSkillDto,
  ): Promise<UserSkillDto> {
    const existing = await this.skillRepo.findUserSkillById(userId, skillId);
    if (!existing) {
      throw new NotFoundException('User skill not found');
    }

    // Check highlight limit if changing to highlight
    if (data.isHighlight === true && !existing.isHighlight) {
      const highlightCount = await this.skillRepo.countHighlightSkills(userId);
      if (highlightCount >= 5) {
        throw new BadRequestException('Cannot highlight more than 5 skills');
      }
    }

    const updated = await this.skillRepo.updateUserSkill(userId, skillId, data);
    if (!updated) {
      throw new NotFoundException('User skill not found after update');
    }

    // Publish Kafka event
    await this.kafkaProducer.send('user.skill.updated', [
      {
        key: userId,
        value: JSON.stringify({
          userId,
          skillId,
          updates: data,
          timestamp: new Date().toISOString(),
        }),
      },
    ]);

    // Clear user cache
    await this.clearUserSkillCache(userId);

    return this.toUserSkillDto(updated);
  }

  async deleteUserSkill(userId: string, skillId: string): Promise<void> {
    const existing = await this.skillRepo.findUserSkillById(userId, skillId);
    if (!existing) {
      throw new NotFoundException('User skill not found');
    }

    const deleted = await this.skillRepo.deleteUserSkill(userId, skillId);
    if (!deleted) {
      throw new BadRequestException('Failed to delete user skill');
    }

    // Publish Kafka event
    await this.kafkaProducer.send('user.skill.removed', [
      {
        key: userId,
        value: JSON.stringify({
          userId,
          skillId,
          timestamp: new Date().toISOString(),
        }),
      },
    ]);

    // Clear user cache
    await this.clearUserSkillCache(userId);
  }

  // ─── Cache Management ─────────────────────────────────────────────

  private async clearSkillCache(category: string): Promise<void> {
    await Promise.all([
      this.redisService.del(this.CACHE_KEY_ALL_SKILLS),
      this.redisService.del(`${this.CACHE_KEY_CATEGORY_PREFIX}${category}`),
    ]);
    this.logger.log(`Cleared skill cache for category ${category}`);
  }

  private async clearUserSkillCache(userId: string): Promise<void> {
    await this.redisService.del(`${this.CACHE_KEY_USER_SKILLS_PREFIX}${userId}`);
    this.logger.log(`Cleared user skill cache for ${userId}`);
  }

  // ─── Mappers ──────────────────────────────────────────────────────

  private toSkillDto(entity: SkillEntity): SkillDto {
    return {
      id: entity.id,
      category: entity.category as SkillCategory,
      name: entity.name,
      nameEn: entity.nameEn,
      nameZhTw: entity.nameZhTw,
      icon: entity.icon ?? undefined,
      isActive: entity.isActive,
      sortOrder: entity.sortOrder,
    };
  }

  private toUserSkillDto(entity: UserSkillEntity): UserSkillDto {
    return {
      id: entity.id,
      userId: entity.userId,
      skillId: entity.skillId,
      proficiencyLevel: entity.proficiencyLevel ?? undefined,
      isHighlight: entity.isHighlight,
      skill: entity.skill ? this.toSkillDto(entity.skill) : undefined,
      createdAt: entity.createdAt,
    };
  }
}
