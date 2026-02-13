import type { ApiClient } from './client';
import type {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  TokenResponseDto,
} from '@suggar-daddy/dto';

export class AuthApi {
  constructor(private readonly client: ApiClient) {}

  login(dto: LoginDto) {
    return this.client.post<TokenResponseDto>('/api/auth/login', dto);
  }

  register(dto: RegisterDto) {
    return this.client.post<TokenResponseDto>('/api/auth/register', dto);
  }

  refresh(dto: RefreshTokenDto) {
    return this.client.post<TokenResponseDto>('/api/auth/refresh', dto);
  }

  logout(refreshToken?: string) {
    return this.client.post<void>('/api/auth/logout', refreshToken ? { refreshToken } : undefined);
  }
}
