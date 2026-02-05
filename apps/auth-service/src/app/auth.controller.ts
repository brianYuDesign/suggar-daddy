import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
import type {
  LoginDto,
  RegisterDto,
  TokenResponseDto,
  RefreshTokenDto,
} from '@suggar-daddy/dto';
import { JwtAuthGuard, CurrentUser } from '@suggar-daddy/auth';
import type { JwtUser } from '@suggar-daddy/auth';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto): Promise<TokenResponseDto> {
    this.logger.log(`register email=${body.email} role=${body.role}`);
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: LoginDto): Promise<TokenResponseDto> {
    this.logger.log(`login email=${body.email}`);
    return this.authService.login(body);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  async logout(@Body() body: RefreshTokenDto): Promise<{ success: boolean }> {
    return this.authService.logout(body.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtUser): JwtUser {
    return user;
  }
}
