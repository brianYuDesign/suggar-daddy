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
    return this.client.get<UserProfileDto>(`/api/v1/users/profile/${userId}`);
  }

  getMe() {
    return this.client.get<UserProfileDto>('/api/v1/users/me');
  }

  updateProfile(dto: UpdateProfileDto) {
    return this.client.put<UserProfileDto>('/api/v1/users/profile', dto);
  }

  blockUser(targetId: string) {
    return this.client.post<{ success: boolean }>(`/api/v1/users/block/${targetId}`);
  }

  unblockUser(targetId: string) {
    return this.client.delete<{ success: boolean }>(`/api/v1/users/block/${targetId}`);
  }

  getBlockedUsers() {
    return this.client.get<string[]>('/api/v1/users/blocked');
  }

  report(dto: ReportDto) {
    return this.client.post<{ id: string }>('/api/v1/users/report', dto);
  }
}
