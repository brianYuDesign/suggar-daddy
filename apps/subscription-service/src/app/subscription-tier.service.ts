import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionTier } from './entities/subscription-tier.entity';
import { CreateSubscriptionTierDto, UpdateSubscriptionTierDto } from './dto/subscription-tier.dto';

@Injectable()
export class SubscriptionTierService {
  constructor(
    @InjectRepository(SubscriptionTier)
    private readonly tierRepository: Repository<SubscriptionTier>,
  ) {}

  async create(createDto: CreateSubscriptionTierDto): Promise<SubscriptionTier> {
    const tier = this.tierRepository.create(createDto);
    return this.tierRepository.save(tier);
  }

  async findAll(): Promise<SubscriptionTier[]> {
    return this.tierRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByCreator(creatorId: string): Promise<SubscriptionTier[]> {
    return this.tierRepository.find({
      where: { creatorId, isActive: true },
      order: { priceMonthly: 'ASC' },
    });
  }

  async findOne(id: string): Promise<SubscriptionTier> {
    const tier = await this.tierRepository.findOne({ where: { id } });
    if (!tier) {
      throw new NotFoundException(`Subscription tier with ID ${id} not found`);
    }
    return tier;
  }

  async update(id: string, updateDto: UpdateSubscriptionTierDto): Promise<SubscriptionTier> {
    const tier = await this.findOne(id);
    Object.assign(tier, updateDto);
    return this.tierRepository.save(tier);
  }

  async remove(id: string): Promise<void> {
    const tier = await this.findOne(id);
    tier.isActive = false;
    await this.tierRepository.save(tier);
  }
}
