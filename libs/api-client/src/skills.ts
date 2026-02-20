import type { ApiClient } from './client';

// ==================== Types ====================

export interface Skill {
  id: string;
  category: string;
  name: string;
  nameEn: string;
  nameZhTw: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface UserSkill {
  id: string;
  userId: string;
  skillId: string;
  proficiencyLevel?: number;
  isHighlight: boolean;
  skill?: Skill;
  createdAt: string;
}

export interface AddUserSkillDto {
  skillId: string;
  proficiencyLevel?: number;
  isHighlight?: boolean;
}

export interface UpdateUserSkillDto {
  proficiencyLevel?: number;
  isHighlight?: boolean;
}

// ==================== API Class ====================

export class SkillsApi {
  constructor(private readonly client: ApiClient) {}

  /**
   * 取得所有技能（可篩選分類）
   */
  getSkills(category?: string) {
    const params = category ? { category } : undefined;
    return this.client.get<Skill[]>('/api/skills', { params });
  }

  /**
   * 取得單一技能
   */
  getSkill(skillId: string) {
    return this.client.get<Skill>(`/api/skills/${skillId}`);
  }

  /**
   * 取得指定用戶的技能
   */
  getUserSkills(userId: string) {
    return this.client.get<UserSkill[]>(`/api/skills/users/${userId}`);
  }

  /**
   * 取得當前用戶的技能
   */
  getMySkills() {
    return this.client.get<UserSkill[]>('/api/skills/users/me/my-skills');
  }

  /**
   * 新增當前用戶的技能
   */
  addMySkill(dto: AddUserSkillDto) {
    return this.client.post<UserSkill>('/api/skills/users/me', dto);
  }

  /**
   * 更新當前用戶的技能
   */
  updateMySkill(skillId: string, dto: UpdateUserSkillDto) {
    return this.client.patch<UserSkill>(`/api/skills/users/me/${skillId}`, dto);
  }

  /**
   * 移除當前用戶的技能
   */
  removeMySkill(skillId: string) {
    return this.client.delete<void>(`/api/skills/users/me/${skillId}`);
  }
}
