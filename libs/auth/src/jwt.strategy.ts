import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
}

function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    const logger = new Logger('JwtStrategy');
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    logger.warn('JWT_SECRET is not set — using a random ephemeral secret. Tokens will NOT survive restarts.');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('crypto').randomBytes(32).toString('hex');
  }
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
