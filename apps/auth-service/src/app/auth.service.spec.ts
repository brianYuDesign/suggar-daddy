import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'setex' | 'del'>>;
  let kafka: jest.Mocked<Pick<KafkaProducerService, 'sendEvent'>>;
  let jwt: jest.Mocked<Pick<JwtService, 'sign'>>;

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };
    kafka = { sendEvent: jest.fn() };
    jwt = { sign: jest.fn().mockReturnValue('access-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwt },
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = {
      email: '  Test@Example.COM  ',
      password: 'secret',
      role: 'sugar_baby' as const,
      displayName: 'Test User',
      bio: 'Hello',
    };

    it('應註冊成功並回傳 tokens', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.register(dto);

      expect(result.accessToken).toBe('access-token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(15 * 60);
      expect(redis.set).toHaveBeenCalled();
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'user.created',
        expect.objectContaining({
          email: 'test@example.com',
          displayName: 'Test User',
          role: 'sugar_baby',
        })
      );
    });

    it('應在 email 已註冊時拋出 ConflictException', async () => {
      (redis.get as jest.Mock).mockResolvedValue('user-123');

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      await expect(service.register(dto)).rejects.toThrow('Email already registered');
      expect(kafka.sendEvent).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('應在密碼正確時回傳 tokens', async () => {
      (redis.get as jest.Mock)
        .mockResolvedValueOnce('user-1')
        .mockResolvedValueOnce(JSON.stringify({
          userId: 'user-1',
          email: 'a@b.com',
          passwordHash: 'hashed',
          role: 'sugar_daddy',
          displayName: 'User',
          createdAt: new Date().toISOString(),
        }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'a@b.com', password: 'pwd' });

      expect(result.accessToken).toBe('access-token');
      expect(redis.get).toHaveBeenCalledWith('user:email:a@b.com');
      expect(redis.get).toHaveBeenCalledWith('user:user-1');
    });

    it('應在 email 不存在時拋出 UnauthorizedException', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@x.com', password: 'pwd' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('應在密碼錯誤時拋出 UnauthorizedException', async () => {
      (redis.get as jest.Mock)
        .mockResolvedValueOnce('user-1')
        .mockResolvedValueOnce(JSON.stringify({
          userId: 'user-1',
          email: 'a@b.com',
          passwordHash: 'hashed',
          role: 'sugar_daddy',
          displayName: 'User',
          createdAt: new Date().toISOString(),
        }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'a@b.com', password: 'wrong' })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('應在有效 refresh token 時回傳新 tokens', async () => {
      (redis.get as jest.Mock).mockResolvedValue(
        JSON.stringify({ userId: 'user-1', email: 'a@b.com' })
      );
      (redis.del as jest.Mock).mockResolvedValue(undefined);

      const result = await service.refresh('rt-valid');

      expect(result.accessToken).toBe('access-token');
      expect(redis.del).toHaveBeenCalled();
    });

    it('應在無效或過期 refresh token 時拋出 UnauthorizedException', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      await expect(service.refresh('rt-invalid')).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.refresh('rt-invalid')).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });
  });

  describe('logout', () => {
    it('應刪除 refresh 並回傳 success: true 當 key 存在', async () => {
      (redis.get as jest.Mock).mockResolvedValue('{}');
      (redis.del as jest.Mock).mockResolvedValue(undefined);

      const result = await service.logout('rt-xxx');

      expect(result.success).toBe(true);
      expect(redis.del).toHaveBeenCalled();
    });

    it('應回傳 success: false 當 key 不存在', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.del as jest.Mock).mockResolvedValue(undefined);

      const result = await service.logout('rt-missing');

      expect(result.success).toBe(false);
    });
  });
});
