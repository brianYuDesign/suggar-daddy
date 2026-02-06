import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  findAll() {
    this.logger.log('Finding all subscriptions');
    return [];
  }
}