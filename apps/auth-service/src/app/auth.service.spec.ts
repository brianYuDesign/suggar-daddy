import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { 
  ConflictException, 
  UnauthorizedException, 
  BadRequestException,
  ForbiddenException 
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { TokenRevocationService } from '@suggar-daddy/auth';
import { EmailService, AppConfigService, UserType } from '@suggar-daddy/common';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let redisService: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'setex' | 'del'>>;
  let kafkaProducer: jest.Mocked<Pick<KafkaProducerService, 'sendEvent'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;
  let tokenRevocation: jest.Mocked<TokenRevocationService>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    redisService = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };
    
    kafkaProducer = { 
      sendEvent: jest.fn().mockResolvedValue(undefined) 
    };
    
    jwtService = { 
      sign: jest.fn().mockReturnValue('mock-access-token') 
    };

    tokenRevocation = {
      revokeToken: jest.fn().mockResolvedValue(undefined),
      isRevoked: jest.fn().mockResolvedValue(false),
      revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
      isUserTokenRevoked: jest.fn().mockResolvedValue(false),
    } as any;

    emailService = {
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    } as any;

    const mockAppConfig = {
      appBaseUrl: 'http://localhost:4200',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redisService },
        { provide: KafkaProducerService, useValue: kafkaProducer },
        { provide: TokenRevocationService, useValue: tokenRevocation },
        { provide: EmailService, useValue: emailService },
        { provide: AppConfigService, useValue: mockAppConfig },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validDto = {
      email: 'Test@Example.COM',
      username: 'testuser',
      password: 'Secret123',
      userType: UserType.SUGAR_BABY,
      displayName: 'Test User',
      bio: 'Hello',
    };

    it('should register user successfully when valid data provided', async () => {
      redisService.get.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register(validDto);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(15 * 60);
      expect(redisService.set).toHaveBeenCalled();
      expect(kafkaProducer.sendEvent).toHaveBeenCalledWith(
        'user.created',
        expect.objectContaining({
          email: 'test@example.com',
          displayName: 'Test User',
          userType: UserType.SUGAR_BABY,
        })
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      redisService.get.mockResolvedValue('existing-user-id');

      await expect(service.register(validDto)).rejects.toThrow(ConflictException);
      await expect(service.register(validDto)).rejects.toThrow('Email already registered');
      expect(kafkaProducer.sendEvent).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase when registering', async () => {
      redisService.get.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      await service.register(validDto);

      expect(kafkaProducer.sendEvent).toHaveBeenCalledWith(
        'user.created',
        expect.objectContaining({
          email: 'test@example.com', // normalized
        })
      );
    });

    it('should hash password correctly when registering', async () => {
      redisService.get.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      await service.register(validDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('Secret123', 10);
    });

    it('should throw BadRequestException when password is too short', async () => {
      const shortPasswordDto = { ...validDto, password: 'Short1' };

      await expect(service.register(shortPasswordDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(shortPasswordDto)).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should throw BadRequestException when password is too long', async () => {
      const longPasswordDto = { ...validDto, password: 'A'.repeat(129) + '1a' };

      await expect(service.register(longPasswordDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(longPasswordDto)).rejects.toThrow('Password must not exceed 128 characters');
    });

    it('should throw BadRequestException when password lacks lowercase letter', async () => {
      const noLowercaseDto = { ...validDto, password: 'PASSWORD123' };

      await expect(service.register(noLowercaseDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(noLowercaseDto)).rejects.toThrow('must contain at least one lowercase letter');
    });

    it('should throw BadRequestException when password lacks uppercase letter', async () => {
      const noUppercaseDto = { ...validDto, password: 'password123' };

      await expect(service.register(noUppercaseDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(noUppercaseDto)).rejects.toThrow('must contain at least one uppercase letter');
    });

    it('should throw BadRequestException when password lacks number', async () => {
      const noNumberDto = { ...validDto, password: 'PasswordABC' };

      await expect(service.register(noNumberDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(noNumberDto)).rejects.toThrow('must contain at least one number');
    });

    it('should throw BadRequestException when email format is invalid', async () => {
      const invalidEmailDto = { ...validDto, email: 'not-an-email' };

      await expect(service.register(invalidEmailDto)).rejects.toThrow(BadRequestException);
      await expect(service.register(invalidEmailDto)).rejects.toThrow('Invalid email format');
    });

    it('should send email verification when registration succeeds', async () => {
      redisService.get.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      await service.register(validDto);

      expect(emailService.sendEmailVerification).toHaveBeenCalled();
    });

    it('should emit user.created event to Kafka when registration succeeds', async () => {
      redisService.get.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      await service.register(validDto);

      expect(kafkaProducer.sendEvent).toHaveBeenCalledWith(
        'user.created',
        expect.objectContaining({
          email: 'test@example.com',
          userType: UserType.SUGAR_BABY,
        })
      );
    });
  });

  describe('login', () => {
    const storedUser = {
      userId: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      userType: 'sugar_daddy',
      displayName: 'Test User',
      accountStatus: 'active' as const,
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };

    const loginDto = {
      email: 'test@example.com',
      password: 'ValidPassword123',
    };

    it('should login successfully when credentials are valid', async () => {
      redisService.get
        .mockResolvedValueOnce(null)                         // checkLoginRateLimit
        .mockResolvedValueOnce('user-1')                     // emailKey lookup
        .mockResolvedValueOnce(JSON.stringify(storedUser)); // user data
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(15 * 60);
      expect(redisService.get).toHaveBeenCalledWith('user:email:test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('ValidPassword123', 'hashed-password');
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      redisService.get
        .mockResolvedValueOnce(null)  // checkLoginRateLimit
        .mockResolvedValueOnce(null); // emailKey lookup - not found

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      redisService.get
        .mockResolvedValueOnce(null)                         // checkLoginRateLimit
        .mockResolvedValueOnce('user-1')                     // emailKey lookup
        .mockResolvedValueOnce(JSON.stringify(storedUser)); // user data
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should generate both access and refresh tokens when login succeeds', async () => {
      redisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('user-1')
        .mockResolvedValueOnce(JSON.stringify(storedUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should store refresh token in Redis when login succeeds', async () => {
      redisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('user-1')
        .mockResolvedValueOnce(JSON.stringify(storedUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login(loginDto);

      expect(redisService.setex).toHaveBeenCalledWith(
        expect.stringContaining('auth:refresh:'),
        7 * 24 * 60 * 60, // 7 days
        expect.any(String)
      );
    });

    it('should normalize email to lowercase when logging in', async () => {
      const uppercaseEmailDto = { ...loginDto, email: 'TEST@EXAMPLE.COM' };
      redisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('user-1')
        .mockResolvedValueOnce(JSON.stringify(storedUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login(uppercaseEmailDto);

      expect(redisService.get).toHaveBeenCalledWith('user:email:test@example.com');
    });

    it('should throw ForbiddenException when account is suspended', async () => {
      const suspendedUser = { ...storedUser, accountStatus: 'suspended' as const };
      redisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('user-1')
        .mockResolvedValueOnce(JSON.stringify(suspendedUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when account is banned', async () => {
      const bannedUser = { ...storedUser, accountStatus: 'banned' as const };
      redisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('user-1')
        .mockResolvedValueOnce(JSON.stringify(bannedUser));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh', () => {
    const storedRefreshPayload = {
      userId: 'user-1',
      email: 'test@example.com',
    };

    const storedUser = {
      accountStatus: 'active' as const,
      emailVerified: true,
    };

    it('should refresh tokens successfully when refresh token is valid', async () => {
      redisService.get
        .mockResolvedValueOnce(JSON.stringify(storedRefreshPayload)) // refresh payload
        .mockResolvedValueOnce(JSON.stringify(storedUser));          // user account check
      redisService.del.mockResolvedValue(undefined);

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh('invalid-token')).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw UnauthorizedException when refresh token is expired', async () => {
      redisService.get.mockResolvedValue(null); // Token not found = expired

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should delete old refresh token when generating new tokens', async () => {
      redisService.get
        .mockResolvedValueOnce(JSON.stringify(storedRefreshPayload))
        .mockResolvedValueOnce(JSON.stringify(storedUser));
      redisService.del.mockResolvedValue(undefined);

      await service.refresh('old-refresh-token');

      expect(redisService.del).toHaveBeenCalledWith('auth:refresh:old-refresh-token');
    });

    it('should store new refresh token in Redis when refresh succeeds', async () => {
      redisService.get
        .mockResolvedValueOnce(JSON.stringify(storedRefreshPayload))
        .mockResolvedValueOnce(JSON.stringify(storedUser));

      await service.refresh('valid-token');

      expect(redisService.setex).toHaveBeenCalledWith(
        expect.stringContaining('auth:refresh:'),
        7 * 24 * 60 * 60,
        expect.any(String)
      );
    });

    it('should throw ForbiddenException when user account is suspended', async () => {
      const suspendedUser = { ...storedUser, accountStatus: 'suspended' as const };
      redisService.get
        .mockResolvedValueOnce(JSON.stringify(storedRefreshPayload))
        .mockResolvedValueOnce(JSON.stringify(suspendedUser));

      await expect(service.refresh('valid-token')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user account is banned', async () => {
      const bannedUser = { ...storedUser, accountStatus: 'banned' as const };
      redisService.get
        .mockResolvedValueOnce(JSON.stringify(storedRefreshPayload))
        .mockResolvedValueOnce(JSON.stringify(bannedUser));

      await expect(service.refresh('valid-token')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('logout', () => {
    it('should logout successfully when refresh token exists', async () => {
      redisService.get.mockResolvedValue(JSON.stringify({ userId: 'user-1' }));
      redisService.del.mockResolvedValue(undefined);

      const result = await service.logout('valid-refresh-token');

      expect(result.success).toBe(true);
      expect(redisService.del).toHaveBeenCalledWith('auth:refresh:valid-refresh-token');
    });

    it('should return success false when refresh token does not exist', async () => {
      redisService.get.mockResolvedValue(null);
      redisService.del.mockResolvedValue(undefined);

      const result = await service.logout('non-existent-token');

      expect(result.success).toBe(false);
    });

    it('should delete refresh token from Redis when logging out', async () => {
      redisService.get.mockResolvedValue(JSON.stringify({ userId: 'user-1' }));
      redisService.del.mockResolvedValue(undefined);

      await service.logout('token-to-delete');

      expect(redisService.del).toHaveBeenCalledWith('auth:refresh:token-to-delete');
    });

    it('should handle logout gracefully when Redis delete fails', async () => {
      redisService.get.mockResolvedValue(JSON.stringify({ userId: 'user-1' }));
      redisService.del.mockRejectedValue(new Error('Redis connection failed'));

      await expect(service.logout('token')).rejects.toThrow('Redis connection failed');
    });
  });
});
