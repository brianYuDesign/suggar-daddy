import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { InjectLogger } from '@suggar-daddy/common';
import { CreateDiamondPackageDto } from './dto/diamond.dto';

const PACKAGES_KEY = 'diamond:packages';

export interface DiamondPackage {
  id: string;
  name: string;
  diamondAmount: number;
  bonusDiamonds: number;
  priceUsd: number;
  isActive: boolean;
  sortOrder: number;
}

const DEFAULT_PACKAGES: DiamondPackage[] = [
  { id: 'pkg-starter', name: 'Starter', diamondAmount: 100, bonusDiamonds: 0, priceUsd: 2.99, isActive: true, sortOrder: 1 },
  { id: 'pkg-value', name: 'Value', diamondAmount: 500, bonusDiamonds: 50, priceUsd: 12.99, isActive: true, sortOrder: 2 },
  { id: 'pkg-premium', name: 'Premium', diamondAmount: 1200, bonusDiamonds: 200, priceUsd: 27.99, isActive: true, sortOrder: 3 },
  { id: 'pkg-ultimate', name: 'Ultimate', diamondAmount: 3000, bonusDiamonds: 800, priceUsd: 59.99, isActive: true, sortOrder: 4 },
];

@Injectable()
export class DiamondPackageService {
  @InjectLogger() private readonly logger!: Logger;

  constructor(private readonly redis: RedisService) {}

  private genId(): string {
    return `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async getPackages(): Promise<DiamondPackage[]> {
    const raw = await this.redis.get(PACKAGES_KEY);
    if (raw) {
      const packages: DiamondPackage[] = JSON.parse(raw);
      return packages.filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    }
    // Initialize defaults
    await this.redis.set(PACKAGES_KEY, JSON.stringify(DEFAULT_PACKAGES));
    return DEFAULT_PACKAGES;
  }

  async getAllPackages(): Promise<DiamondPackage[]> {
    const raw = await this.redis.get(PACKAGES_KEY);
    if (raw) return JSON.parse(raw);
    await this.redis.set(PACKAGES_KEY, JSON.stringify(DEFAULT_PACKAGES));
    return DEFAULT_PACKAGES;
  }

  async getPackageById(packageId: string): Promise<DiamondPackage> {
    const packages = await this.getAllPackages();
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) throw new NotFoundException(`Diamond package ${packageId} not found`);
    return pkg;
  }

  async createPackage(dto: CreateDiamondPackageDto): Promise<DiamondPackage> {
    const packages = await this.getAllPackages();
    const newPkg: DiamondPackage = {
      id: this.genId(),
      name: dto.name,
      diamondAmount: dto.diamondAmount,
      bonusDiamonds: dto.bonusDiamonds,
      priceUsd: dto.priceUsd,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? packages.length + 1,
    };
    packages.push(newPkg);
    await this.redis.set(PACKAGES_KEY, JSON.stringify(packages));
    this.logger.log(`Diamond package created: ${newPkg.id} ${newPkg.name}`);
    return newPkg;
  }

  async updatePackage(packageId: string, updates: Partial<DiamondPackage>): Promise<DiamondPackage> {
    const packages = await this.getAllPackages();
    const idx = packages.findIndex(p => p.id === packageId);
    if (idx === -1) throw new NotFoundException(`Diamond package ${packageId} not found`);

    packages[idx] = { ...packages[idx], ...updates, id: packageId };
    await this.redis.set(PACKAGES_KEY, JSON.stringify(packages));
    this.logger.log(`Diamond package updated: ${packageId}`);
    return packages[idx];
  }

  async deletePackage(packageId: string): Promise<void> {
    const packages = await this.getAllPackages();
    const idx = packages.findIndex(p => p.id === packageId);
    if (idx === -1) throw new NotFoundException(`Diamond package ${packageId} not found`);

    packages[idx].isActive = false;
    await this.redis.set(PACKAGES_KEY, JSON.stringify(packages));
    this.logger.log(`Diamond package deactivated: ${packageId}`);
  }
}
