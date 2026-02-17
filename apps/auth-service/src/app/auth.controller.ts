import { Body, Controller, Get, Logger, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { 
  LoginDto, 
  RegisterDto, 
  RefreshTokenDto, 
  ForgotPasswordDto, 
  ResetPasswordDto, 
  ChangePasswordDto,
  type TokenResponseDto 
} from '@suggar-daddy/dto';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard, type JwtUser } from '@suggar-daddy/auth';
import { UserRole } from '@suggar-daddy/common';
import { OAuthService } from '@suggar-daddy/auth';
import { AuthService } from './auth.service';
import type { Request } from 'express';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
  ) {}

  @Post('register')
  @ApiOperation({ 
    summary: 'Register new user',
    description: 'Create a new user account with email and password. User can be either a creator or a fan.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'User registered successfully',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 3600,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          userType: 'creator',
          role: 'user',
          emailVerified: false
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid input or email already exists',
    schema: {
      example: {
        statusCode: 400,
        message: 'Email already exists',
        error: 'Bad Request'
      }
    }
  })
  async register(@Body() body: RegisterDto): Promise<TokenResponseDto> {
    try {
      this.logger.log(`[CONTROLLER] register email=${body.email} userType=${body.userType}`);
      const result = await this.authService.register(body);
      this.logger.log(`[CONTROLLER] register success email=${body.email}`);
      return result;
    } catch (error) {
      this.logger.error(`[CONTROLLER] register failed email=${body.email}`, error.stack || error);
      throw error;
    }
  }

  @Post('login')
  @ApiOperation({ 
    summary: 'Login',
    description: 'Authenticate user with email and password'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 3600,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: 'user'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid credentials',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid email or password',
        error: 'Unauthorized'
      }
    }
  })
  async login(@Body() body: LoginDto): Promise<TokenResponseDto> {
    this.logger.log(`login email=${body.email}`);
    return this.authService.login(body);
  }

  @Post('refresh')
  @ApiOperation({ 
    summary: 'Refresh access token',
    description: 'Get a new access token using a refresh token'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token refreshed successfully',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 3600
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or expired refresh token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid refresh token',
        error: 'Unauthorized'
      }
    }
  })
  async refresh(@Body() body: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Logout',
    description: 'Invalidate refresh token and revoke access'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Logout successful',
    schema: {
      example: {
        success: true
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @Body() body: RefreshTokenDto,
    @CurrentUser() user: JwtUser,
  ): Promise<{ success: boolean }> {
    return this.authService.logout(body.refreshToken, user.jti);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get current user',
    description: 'Get authenticated user information from JWT token'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User information retrieved successfully',
    schema: {
      example: {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
        jti: 'jwt-token-id'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  me(@CurrentUser() user: JwtUser): JwtUser {
    return user;
  }

  // ── Email Verification ─────────────────────────────────────────────

  @Post('verify-email/:token')
  @ApiOperation({ 
    summary: 'Verify email',
    description: 'Verify user email with verification token sent via email'
  })
  @ApiParam({ name: 'token', description: 'Email verification token' })
  @ApiResponse({ 
    status: 200, 
    description: 'Email verified successfully',
    schema: {
      example: {
        success: true,
        message: 'Email verified successfully'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid or expired token',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid verification token',
        error: 'Bad Request'
      }
    }
  })
  async verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Resend verification email',
    description: 'Request a new email verification link'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Verification email sent',
    schema: {
      example: {
        success: true,
        message: 'Verification email sent'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async resendVerification(@CurrentUser() user: JwtUser) {
    return this.authService.createEmailVerificationToken(user.userId, user.email);
  }

  // ── Password Reset ─────────────────────────────────────────────────

  @Post('forgot-password')
  @ApiOperation({ 
    summary: 'Request password reset',
    description: 'Send password reset email to user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset email sent',
    schema: {
      example: {
        success: true,
        message: 'Password reset email sent'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  @ApiOperation({ 
    summary: 'Reset password',
    description: 'Reset user password using reset token'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset successfully',
    schema: {
      example: {
        success: true,
        message: 'Password reset successfully'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid or expired token',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid reset token',
        error: 'Bad Request'
      }
    }
  })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  // ── Change Password (authenticated) ────────────────────────────────

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Change password',
    description: 'Change password for authenticated user (requires old password)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Password changed successfully',
    schema: {
      example: {
        success: true,
        message: 'Password changed successfully'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid old password',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid old password',
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @CurrentUser() user: JwtUser,
    @Body() body: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, body.oldPassword, body.newPassword);
  }

  // ── Account Management (Admin) ─────────────────────────────────────

  @Post('admin/suspend/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '[Admin] Suspend user account',
    description: 'Temporarily suspend a user account. Requires ADMIN role.'
  })
  @ApiParam({ name: 'userId', description: 'User ID to suspend' })
  @ApiResponse({ 
    status: 200, 
    description: 'Account suspended successfully',
    schema: {
      example: {
        success: true,
        userId: 'user-123',
        status: 'suspended'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async suspendAccount(@Param('userId') userId: string) {
    return this.authService.suspendAccount(userId);
  }

  @Post('admin/ban/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '[Admin] Ban user account',
    description: 'Permanently ban a user account. Requires ADMIN role.'
  })
  @ApiParam({ name: 'userId', description: 'User ID to ban' })
  @ApiResponse({ 
    status: 200, 
    description: 'Account banned successfully',
    schema: {
      example: {
        success: true,
        userId: 'user-123',
        status: 'banned'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async banAccount(@Param('userId') userId: string) {
    return this.authService.banAccount(userId);
  }

  @Post('admin/reactivate/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '[Admin] Reactivate user account',
    description: 'Reactivate a suspended or banned user account. Requires ADMIN role.'
  })
  @ApiParam({ name: 'userId', description: 'User ID to reactivate' })
  @ApiResponse({ 
    status: 200, 
    description: 'Account reactivated successfully',
    schema: {
      example: {
        success: true,
        userId: 'user-123',
        status: 'active'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async reactivateAccount(@Param('userId') userId: string) {
    return this.authService.reactivateAccount(userId);
  }

  // ── OAuth (Google) ───────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ 
    summary: 'Google OAuth login',
    description: 'Initiate Google OAuth authentication flow'
  })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth' })
  googleAuth() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ 
    summary: 'Google OAuth callback',
    description: 'Handle Google OAuth callback and return JWT tokens'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'OAuth authentication successful',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 3600,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          provider: 'google'
        }
      }
    }
  })
  async googleAuthCallback(@Req() req: Request) {
    return this.oauthService.handleOAuthLogin(req.user as any);
  }

  // ── OAuth (Apple) ────────────────────────────────────────────────

  @Post('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ 
    summary: 'Apple OAuth login',
    description: 'Initiate Apple Sign In authentication flow'
  })
  @ApiResponse({ status: 302, description: 'Redirect to Apple Sign In' })
  appleAuth() {
    // Passport redirects to Apple
  }

  @Post('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ 
    summary: 'Apple OAuth callback',
    description: 'Handle Apple Sign In callback and return JWT tokens'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'OAuth authentication successful',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 3600,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          provider: 'apple'
        }
      }
    }
  })
  async appleAuthCallback(@Req() req: Request) {
    return this.oauthService.handleOAuthLogin(req.user as any);
  }
}
