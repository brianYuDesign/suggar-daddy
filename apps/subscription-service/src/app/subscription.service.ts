import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  async create(createDto: CreateSubscriptionDto): Promise<Subscription> {
    const subscription = this.subscriptionRepository.create({
      ...createDto,
      status: 'active',
    });
    return this.subscriptionRepository.save(subscription);
  }

  async findAll(): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findBySubscriber(subscriberId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { subscriberId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  async findByCreator(creatorId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { creatorId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({ where: { id } });
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    return subscription;
  }

  async update(id: string, updateDto: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = await this.findOne(id);
    Object.assign(subscription, updateDto);
    return this.subscriptionRepository.save(subscription);
  }

  async cancel(id: string): Promise<Subscription> {
    const subscription = await this.findOne(id);
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    return this.subscriptionRepository.save(subscription);
  }
}
