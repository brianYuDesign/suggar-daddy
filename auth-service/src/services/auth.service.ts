import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User, Role, RoleType } from '@/entities';
import { RegisterDto, LoginDto, RefreshTokenDto, ChangePasswordDto } from '@/dtos';
import { TokenBlacklistService } from './token-blacklist.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<{ user: User; tokens: any }> {
    const { username, email, firstName, lastName, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ConflictException('User already exists with this email or username');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = this.usersRepository.create({
      username,
      email,
      firstName,
      lastName,
      password: hashedPassword,
    });

    // Assign default USER role
    const userRole = await this.rolesRepository.findOne({
      where: { name: RoleType.USER },
    });

    if (!userRole) {
      throw new NotFoundException('Default USER role not found');
    }

    user.roles = [userRole];

    // Save user
    const savedUser = await this.usersRepository.save(user);

    // Generate tokens
    const tokens = this.generateTokens(savedUser);

    return {
      user: savedUser,
      tokens,
    };
  }

  /**
   * Login user with email and password
   */
  async login(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;

    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['roles', 'roles.rolePermissions', 'roles.rolePermissions.permission'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.validatePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.usersRepository.save(user);

    const tokens = this.generateTokens(user);

    return {
      user,
      tokens,
    };
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['roles'],
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await this.validatePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<any> {
    try {
      const decoded = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersRepository.findOne({
        where: { id: decoded.sub },
        relations: ['roles', 'roles.rolePermissions', 'roles.rolePermissions.permission'],
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const tokens = this.generateTokens(user);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user - add token to blacklist
   */
  async logout(token: string, userId: string): Promise<void> {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      await this.tokenBlacklistService.addToBlacklist(
        token,
        userId,
        'access',
        new Date(decoded.exp * 1000),
      );
    } catch (error) {
      throw new BadRequestException('Invalid token');
    }
  }

  /**
   * Validate token
   */
  async validateToken(token: string): Promise<any> {
    try {
      const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(
        token,
      );

      if (isBlacklisted) {
        return {
          isValid: false,
          message: 'Token has been revoked',
        };
      }

      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      return {
        isValid: true,
        userId: decoded.sub,
        email: decoded.email,
        roles: decoded.roles,
        expiresAt: new Date(decoded.exp * 1000),
      };
    } catch (error) {
      return {
        isValid: false,
        message: 'Invalid token',
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { oldPassword, newPassword, confirmPassword } = changePasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await this.validatePassword(
      oldPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = await this.hashPassword(newPassword);
    await this.usersRepository.save(user);
  }

  /**
   * Generate JWT and Refresh tokens
   */
  private generateTokens(user: User): any {
    const roleNames = user.roles?.map((role) => role.name) || [];

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: roleNames,
      permissions: [],
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRATION'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get('JWT_EXPIRATION'),
      tokenType: 'Bearer',
    };
  }

  /**
   * Hash password with bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(
      parseInt(this.configService.get('BCRYPT_ROUNDS'), 10),
    );
    return bcrypt.hash(password, salt);
  }

  /**
   * Validate password against hash
   */
  private async validatePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
