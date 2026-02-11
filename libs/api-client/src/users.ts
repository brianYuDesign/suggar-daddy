import type { ApiClient } from './client';
import type { UserProfileDto, UpdateProfileDto } from '@suggar-daddy/dto';

export class UsersApi {
  constructor(private readonly client: ApiClient) {}

  getProfile(userId: string) {
    return this.client.get<UserProfileDto>(`/api/v1/users/${userId}`);
  }

  getMe() {
    return this.client.get<UserProfileDto>('/api/v1/users/me');
  }

  updateProfile(dto: UpdateProfileDto) {
    return this.client.patch<UserProfileDto>('/api/v1/users/me', dto);
  }
}
