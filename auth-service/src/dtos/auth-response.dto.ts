export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export class TokenValidationDto {
  isValid: boolean;
  userId?: string;
  email?: string;
  roles?: string[];
  expiresAt?: Date;
  message?: string;
}

export class LogoutResponseDto {
  message: string;
  timestamp: Date;
}

export class RefreshTokenResponseDto {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}
