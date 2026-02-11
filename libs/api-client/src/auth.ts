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
    return this.client.post<TokenResponseDto>('/api/v1/auth/login', dto);
  }

  register(dto: RegisterDto) {
    return this.client.post<TokenResponseDto>('/api/v1/auth/register', dto);
  }

  refresh(dto: RefreshTokenDto) {
    return this.client.post<TokenResponseDto>('/api/v1/auth/refresh', dto);
  }

  logout() {
    return this.client.post<void>('/api/v1/auth/logout');
  }
}
