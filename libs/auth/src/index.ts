// Module
export { AuthModule } from './auth.module';
export { OAuthModule } from './oauth.module';

// Services
export { TokenRevocationService } from './services/token-revocation.service';
export { OAuthService } from './services/oauth.service';

// Strategy & types
export { JwtStrategy } from './strategies/jwt.strategy';
export type { JwtPayload, JwtUser, CurrentUserData } from './strategies/jwt.strategy';
export { GoogleStrategy } from './strategies/oauth-google.strategy';
export type { OAuthUser } from './strategies/oauth-google.strategy';
export { AppleStrategy } from './strategies/oauth-apple.strategy';

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { OptionalJwtGuard } from './guards/optional-jwt.guard';
export { RolesGuard } from './guards/roles.guard';
export { SuperAdminGuard } from './guards/super-admin.guard';

// Decorators
export { CurrentUser } from './decorators/current-user.decorator';
export { Public, IS_PUBLIC_KEY } from './decorators/public.decorator';
export { Roles, ROLES_KEY } from './decorators/roles.decorator';
