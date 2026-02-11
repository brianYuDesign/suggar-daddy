import { Body, Controller, Get, Logger, Param, Post, UseGuards } from '@nestjs/common';
import { LoginDto, RegisterDto, RefreshTokenDto } from '@suggar-daddy/dto';
import type { TokenResponseDto } from '@suggar-daddy/dto';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard, UserRole } from '@suggar-daddy/auth';
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

  // ── Email Verification ─────────────────────────────────────────────

  @Post('verify-email/:token')
  async verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  async resendVerification(@CurrentUser() user: JwtUser) {
    return this.authService.createEmailVerificationToken(user.userId, user.email);
  }

  // ── Password Reset ─────────────────────────────────────────────────

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  // ── Change Password (authenticated) ────────────────────────────────

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: JwtUser,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(user.userId, body.oldPassword, body.newPassword);
  }

  // ── Account Management (Admin) ─────────────────────────────────────

  @Post('admin/suspend/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async suspendAccount(@Param('userId') userId: string) {
    return this.authService.suspendAccount(userId);
  }

  @Post('admin/ban/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async banAccount(@Param('userId') userId: string) {
    return this.authService.banAccount(userId);
  }

  @Post('admin/reactivate/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async reactivateAccount(@Param('userId') userId: string) {
    return this.authService.reactivateAccount(userId);
  }
}
