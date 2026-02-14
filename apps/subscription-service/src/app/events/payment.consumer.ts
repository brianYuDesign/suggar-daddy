import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PAYMENT_EVENTS, PaymentCompletedEvent } from '@suggar-daddy/common';
import { SubscriptionService } from '../subscription.service';

@Injectable()
export class PaymentConsumer {
  private readonly logger = new Logger(PaymentConsumer.name);

  constructor(private readonly subscriptionsService: SubscriptionService) {}

  @EventPattern(PAYMENT_EVENTS.PAYMENT_COMPLETED)
  async handlePaymentCompleted(@Payload() event: PaymentCompletedEvent) {
    this.logger.log('Payment completed event received:', event);

    // If this is a subscription payment, update subscription status
    if (event.type === 'subscription' && event.metadata?.subscriptionId) {
      try {
        // You can implement logic to activate or extend subscription
        // For example:
        // await this.subscriptionsService.activateSubscription(
        //   event.metadata.subscriptionId
        // );
        this.logger.log(
          `Subscription ${event.metadata.subscriptionId} payment processed`,
        );
      } catch (error) {
        this.logger.error('Error processing subscription payment:', error);
      }
    }
  }
}