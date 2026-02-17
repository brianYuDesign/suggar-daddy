import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  SkillEntity,
  UserSkillEntity,
  SkillRequestEntity,
  SkillRequestStatus,
  SkillCategory,
} from '@suggar-daddy/database';

@Injectable()
export class SkillRepository {
  constructor(
    @InjectRepository(SkillEntity)
    private readonly skillRepo: Repository<SkillEntity>,
    @InjectRepository(UserSkillEntity)
    private readonly userSkillRepo: Repository<UserSkillEntity>,
    @InjectRepository(SkillRequestEntity)
    private readonly skillRequestRepo: Repository<SkillRequestEntity>,
  ) {}

  // ─── Skill CRUD ──────────────────────────────────────────────────

  async findAllSkills(isActive?: boolean): Promise<SkillEntity[]> {
    const where = isActive !== undefined ? { isActive } : {};
    return this.skillRepo.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findSkillsByCategory(
    category: SkillCategory,
    isActive = true,
  ): Promise<SkillEntity[]> {
    return this.skillRepo.find({
      where: { category, isActive },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findSkillById(id: string): Promise<SkillEntity | null> {
    return this.skillRepo.findOne({ where: { id } });
  }

  async createSkill(data: Partial<SkillEntity>): Promise<SkillEntity> {
    const skill = this.skillRepo.create(data);
    return this.skillRepo.save(skill);
  }

  async updateSkill(
    id: string,
    data: Partial<SkillEntity>,
  ): Promise<SkillEntity | null> {
    await this.skillRepo.update(id, data);
    return this.findSkillById(id);
  }

  async deleteSkill(id: string): Promise<boolean> {
    const result = await this.skillRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ─── User Skills ──────────────────────────────────────────────────

  async findUserSkills(userId: string): Promise<UserSkillEntity[]> {
    return this.userSkillRepo.find({
      where: { userId },
      relations: ['skill'],
      order: { isHighlight: 'DESC', createdAt: 'ASC' },
    });
  }

  async findUserSkillsByIds(
    userId: string,
    skillIds: string[],
  ): Promise<UserSkillEntity[]> {
    if (skillIds.length === 0) return [];
    return this.userSkillRepo.find({
      where: { userId, skillId: In(skillIds) },
      relations: ['skill'],
    });
  }

  async findUserSkillById(
    userId: string,
    skillId: string,
  ): Promise<UserSkillEntity | null> {
    return this.userSkillRepo.findOne({
      where: { userId, skillId },
      relations: ['skill'],
    });
  }

  async createUserSkill(
    data: Partial<UserSkillEntity>,
  ): Promise<UserSkillEntity> {
    const userSkill = this.userSkillRepo.create(data);
    return this.userSkillRepo.save(userSkill);
  }

  async updateUserSkill(
    userId: string,
    skillId: string,
    data: Partial<UserSkillEntity>,
  ): Promise<UserSkillEntity | null> {
    await this.userSkillRepo.update({ userId, skillId }, data);
    return this.findUserSkillById(userId, skillId);
  }

  async deleteUserSkill(userId: string, skillId: string): Promise<boolean> {
    const result = await this.userSkillRepo.delete({ userId, skillId });
    return (result.affected ?? 0) > 0;
  }

  async countUserSkills(userId: string): Promise<number> {
    return this.userSkillRepo.count({ where: { userId } });
  }

  async countHighlightSkills(userId: string): Promise<number> {
    return this.userSkillRepo.count({
      where: { userId, isHighlight: true },
    });
  }

  // ─── Skill Requests ───────────────────────────────────────────────

  async findSkillRequestById(id: string): Promise<SkillRequestEntity | null> {
    return this.skillRequestRepo.findOne({
      where: { id },
      relations: ['user', 'reviewer', 'createdSkill'],
    });
  }

  async findSkillRequestsByUser(
    userId: string,
  ): Promise<SkillRequestEntity[]> {
    return this.skillRequestRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingSkillRequests(): Promise<SkillRequestEntity[]> {
    return this.skillRequestRepo.find({
      where: { status: SkillRequestStatus.PENDING },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async createSkillRequest(
    data: Partial<SkillRequestEntity>,
  ): Promise<SkillRequestEntity> {
    const request = this.skillRequestRepo.create(data);
    return this.skillRequestRepo.save(request);
  }

  async updateSkillRequest(
    id: string,
    data: Partial<SkillRequestEntity>,
  ): Promise<SkillRequestEntity | null> {
    await this.skillRequestRepo.update(id, data);
    return this.findSkillRequestById(id);
  }
}
