import { Injectable } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PAYMENT_EVENTS, PaymentCompletedEvent } from '@suggar-daddy/common';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class PaymentConsumer {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @EventPattern(PAYMENT_EVENTS.PAYMENT_COMPLETED)
  async handlePaymentCompleted(@Payload() event: PaymentCompletedEvent) {
    console.log('Payment completed event received:', event);

    // If this is a subscription payment, update subscription status
    if (event.type === 'subscription' && event.metadata?.subscriptionId) {
      try {
        // You can implement logic to activate or extend subscription
        // For example:
        // await this.subscriptionsService.activateSubscription(
        //   event.metadata.subscriptionId
        // );
        console.log(
          `Subscription ${event.metadata.subscriptionId} payment processed`,
        );
      } catch (error) {
        console.error('Error processing subscription payment:', error);
      }
    }
  }
}