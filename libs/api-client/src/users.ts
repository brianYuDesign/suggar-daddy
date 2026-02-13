import type { ApiClient } from './client';
import type { UserProfileDto, UpdateProfileDto } from '@suggar-daddy/dto';

export interface ReportDto {
  targetType: 'user' | 'post' | 'comment';
  targetId: string;
  reason: string;
  description?: string;
}

export class UsersApi {
  constructor(private readonly client: ApiClient) {}

  getProfile(userId: string) {
    return this.client.get<UserProfileDto>(`/api/users/profile/${userId}`);
  }

  getMe() {
    return this.client.get<UserProfileDto>('/api/users/me');
  }

  updateProfile(dto: UpdateProfileDto) {
    return this.client.put<UserProfileDto>('/api/users/profile', dto);
  }

  blockUser(targetId: string) {
    return this.client.post<{ success: boolean }>(`/api/users/block/${targetId}`);
  }

  unblockUser(targetId: string) {
    return this.client.delete<{ success: boolean }>(`/api/users/block/${targetId}`);
  }

  getBlockedUsers() {
    return this.client.get<string[]>('/api/users/blocked');
  }

  report(dto: ReportDto) {
    return this.client.post<{ id: string }>('/api/users/report', dto);
  }
}
