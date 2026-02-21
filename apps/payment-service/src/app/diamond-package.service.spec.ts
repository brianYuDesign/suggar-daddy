import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DiamondPackageService } from './diamond-package.service';
import { RedisService } from '@suggar-daddy/redis';

describe('DiamondPackageService', () => {
  let service: DiamondPackageService;
  let redis: Record<string, jest.Mock>;

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiamondPackageService,
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get(DiamondPackageService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getPackages', () => {
    it('should return active packages sorted by sortOrder', async () => {
      const packages = [
        { id: 'pkg-1', name: 'A', isActive: true, sortOrder: 2, diamondAmount: 500, bonusDiamonds: 50, priceUsd: 12.99 },
        { id: 'pkg-2', name: 'B', isActive: false, sortOrder: 1, diamondAmount: 100, bonusDiamonds: 0, priceUsd: 2.99 },
        { id: 'pkg-3', name: 'C', isActive: true, sortOrder: 1, diamondAmount: 100, bonusDiamonds: 0, priceUsd: 2.99 },
      ];
      redis.get.mockResolvedValue(JSON.stringify(packages));

      const result = await service.getPackages();
      expect(result).toHaveLength(2); // only active
      expect(result[0].id).toBe('pkg-3'); // sortOrder 1
      expect(result[1].id).toBe('pkg-1'); // sortOrder 2
    });

    it('should initialize default packages when none exist', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.getPackages();
      expect(result).toHaveLength(4);
      expect(result[0].name).toBe('Starter');
      expect(redis.set).toHaveBeenCalledWith('diamond:packages', expect.any(String));
    });
  });

  describe('getPackageById', () => {
    it('should return package by id', async () => {
      const packages = [
        { id: 'pkg-1', name: 'Starter', isActive: true, sortOrder: 1, diamondAmount: 100, bonusDiamonds: 0, priceUsd: 2.99 },
      ];
      redis.get.mockResolvedValue(JSON.stringify(packages));

      const result = await service.getPackageById('pkg-1');
      expect(result.name).toBe('Starter');
    });

    it('should throw NotFoundException for unknown package', async () => {
      redis.get.mockResolvedValue(JSON.stringify([]));

      await expect(service.getPackageById('pkg-unknown'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('createPackage', () => {
    it('should create and persist a new package', async () => {
      redis.get.mockResolvedValue(JSON.stringify([]));

      const dto = { name: 'Test', diamondAmount: 200, bonusDiamonds: 20, priceUsd: 4.99 };
      const result = await service.createPackage(dto as any);

      expect(result.id).toMatch(/^pkg-/);
      expect(result.name).toBe('Test');
      expect(result.diamondAmount).toBe(200);
      expect(result.isActive).toBe(true);
      expect(redis.set).toHaveBeenCalledWith('diamond:packages', expect.any(String));
    });
  });

  describe('updatePackage', () => {
    it('should update existing package', async () => {
      const packages = [
        { id: 'pkg-1', name: 'Old', isActive: true, sortOrder: 1, diamondAmount: 100, bonusDiamonds: 0, priceUsd: 2.99 },
      ];
      redis.get.mockResolvedValue(JSON.stringify(packages));

      const result = await service.updatePackage('pkg-1', { name: 'Updated', priceUsd: 3.99 });
      expect(result.name).toBe('Updated');
      expect(result.priceUsd).toBe(3.99);
      expect(result.id).toBe('pkg-1'); // id preserved
    });

    it('should throw NotFoundException for unknown package', async () => {
      redis.get.mockResolvedValue(JSON.stringify([]));

      await expect(service.updatePackage('pkg-unknown', { name: 'X' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deletePackage', () => {
    it('should soft-delete by setting isActive to false', async () => {
      const packages = [
        { id: 'pkg-1', name: 'Starter', isActive: true, sortOrder: 1, diamondAmount: 100, bonusDiamonds: 0, priceUsd: 2.99 },
      ];
      redis.get.mockResolvedValue(JSON.stringify(packages));

      await service.deletePackage('pkg-1');
      expect(redis.set).toHaveBeenCalledWith(
        'diamond:packages',
        expect.stringContaining('"isActive":false'),
      );
    });

    it('should throw NotFoundException for unknown package', async () => {
      redis.get.mockResolvedValue(JSON.stringify([]));

      await expect(service.deletePackage('pkg-unknown'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
