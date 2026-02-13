import { Body, Controller, Get, Logger, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto, RegisterDto, RefreshTokenDto, type TokenResponseDto } from '@suggar-daddy/dto';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard, UserRole, type JwtUser } from '@suggar-daddy/auth';
import { OAuthService } from '@suggar-daddy/auth';
import { AuthService } from './auth.service';
import type { Request } from 'express';

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
  ) {}

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
  @UseGuards(JwtAuthGuard)
  async logout(
    @Body() body: RefreshTokenDto,
    @CurrentUser() user: JwtUser,
  ): Promise<{ success: boolean }> {
    return this.authService.logout(body.refreshToken, user.jti);
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

  // ── OAuth (Google) ───────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request) {
    return this.oauthService.handleOAuthLogin(req.user as any);
  }

  // ── OAuth (Apple) ────────────────────────────────────────────────

  @Post('apple')
  @UseGuards(AuthGuard('apple'))
  appleAuth() {
    // Passport redirects to Apple
  }

  @Post('apple/callback')
  @UseGuards(AuthGuard('apple'))
  async appleAuthCallback(@Req() req: Request) {
    return this.oauthService.handleOAuthLogin(req.user as any);
  }
}
