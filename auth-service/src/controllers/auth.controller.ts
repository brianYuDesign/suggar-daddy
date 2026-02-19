import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { AuthService } from '@/services';
import { RegisterDto, LoginDto, RefreshTokenDto, ChangePasswordDto, ValidateTokenDto } from '@/dtos';
import { JwtAuthGuard } from '@/guards';
import { CurrentUser } from '@/decorators';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'User registered successfully',
      data: {
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        },
        tokens: result.tokens,
      },
    };
  }

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      data: {
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          roles: result.user.roles,
        },
        tokens: result.tokens,
      },
    };
  }

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const tokens = await this.authService.refreshToken(refreshTokenDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Token refreshed successfully',
      data: tokens,
    };
  }

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: any,
    @Body('token') token: string,
  ) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    await this.authService.logout(token, user.userId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Logout successful',
    };
  }

  /**
   * Validate token
   * POST /api/v1/auth/validate
   */
  @Post('validate')
  async validateToken(@Body() validateTokenDto: ValidateTokenDto) {
    const result = await this.authService.validateToken(validateTokenDto.token);
    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  /**
   * Change password
   * POST /api/v1/auth/change-password
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.userId, changePasswordDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Password changed successfully',
    };
  }

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: any) {
    return {
      statusCode: HttpStatus.OK,
      data: user,
    };
  }
}
