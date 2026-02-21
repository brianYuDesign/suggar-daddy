import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { MESSAGING_EVENTS, InjectLogger } from '@suggar-daddy/common';
import { DiamondService } from './diamond.service';

const DM_UNLOCK_KEY = (buyerId: string, creatorId: string) =>
  `dm:unlock:${buyerId}:${creatorId}`;
const USER_KEY = (id: string) => `user:${id}`;

@Injectable()
export class DmPurchaseService {
  @InjectLogger() private readonly logger!: Logger;

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly diamondService: DiamondService,
  ) {}

  async purchaseDmAccess(
    buyerId: string,
    creatorId: string,
  ): Promise<{ purchaseId: string }> {
    // 1. Read creator's dmPrice from user record (now in diamonds)
    const creatorRaw = await this.redis.get(USER_KEY(creatorId));
    if (!creatorRaw) {
      throw new BadRequestException('Creator not found');
    }
    const creator = JSON.parse(creatorRaw);
    const dmPrice = creator.dmPrice;

    if (!dmPrice || dmPrice <= 0) {
      throw new BadRequestException(
        'This creator does not have paid DMs enabled',
      );
    }

    // 2. Check if already purchased
    const alreadyPurchased = await this.redis.exists(
      DM_UNLOCK_KEY(buyerId, creatorId),
    );
    if (alreadyPurchased) {
      throw new ConflictException('DM access already purchased');
    }

    // 3. Transfer diamonds from buyer to creator
    const { purchaseId: _pid, buyerBalance: _bb } = await this.diamondService.spendOnDmUnlock(
      buyerId,
      creatorId,
      dmPrice,
    );

    const purchaseId = `dmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // 4. Set dm:unlock permanently in Redis
    await this.redis.setPermanent(
      DM_UNLOCK_KEY(buyerId, creatorId),
      JSON.stringify({
        purchaseId,
        amount: dmPrice,
        createdAt: new Date().toISOString(),
      }),
    );

    // 5. Emit Kafka event
    try {
      await this.kafkaProducer.sendEvent(MESSAGING_EVENTS.DM_PURCHASED, {
        purchaseId,
        buyerId,
        creatorId,
        amount: dmPrice,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      this.logger.warn('Kafka DM_PURCHASED emit failed', e);
    }

    this.logger.log(
      `DM access purchased (diamonds): buyer=${buyerId} creator=${creatorId} diamonds=${dmPrice}`,
    );

    return { purchaseId };
  }
}
