# Kafka Integration Guide

## Overview

This project uses Apache Kafka for event-driven communication between microservices. Each service can produce and consume events asynchronously.

## Architecture

```
┌─────────────────────┐
│ Subscription Service│──┐
└─────────────────────┘  │
                         │
┌─────────────────────┐  │    ┌─────────────┐
│  Content Service    │──┼───▶│    Kafka    │
└─────────────────────┘  │    └─────────────┘
                         │          │
┌─────────────────────┐  │          │
│  Payment Service    │──┤          │
└─────────────────────┘  │          ▼
                         │    [Event Topics]
┌─────────────────────┐  │
│   Media Service     │──┘
└─────────────────────┘
```

## Event Topics

### Subscription Events
- `subscription.created` - New subscription created
- `subscription.updated` - Subscription modified
- `subscription.cancelled` - Subscription cancelled
- `subscription.tier.created` - New tier created
- `subscription.tier.updated` - Tier modified

### Payment Events
- `payment.completed` - Payment successful
- `payment.failed` - Payment failed
- `payment.tip.sent` - Tip sent to creator
- `payment.post.purchased` - PPV post purchased

### Content Events
- `content.post.created` - New post created
- `content.post.updated` - Post modified
- `content.post.deleted` - Post deleted
- `content.post.liked` - Post liked by user
- `content.post.unliked` - Post unliked by user
- `content.comment.created` - New comment added

### Media Events
- `media.uploaded` - Media file uploaded
- `media.deleted` - Media file deleted
- `media.processed` - Media processing completed

## Setup

### 1. Install Kafka

#### Using Docker Compose

```yaml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

Start Kafka:
```bash
docker-compose up -d
```

### 2. Environment Variables

Add to each service's `.env`:

```env
KAFKA_BROKERS=localhost:9092
```

For production with multiple brokers:
```env
KAFKA_BROKERS=broker1:9092,broker2:9092,broker3:9092
```

### 3. Module Configuration

Each service integrates Kafka via the shared module:

```typescript
// app.module.ts
import { KafkaModule } from '@suggar-daddy/common';

@Module({
  imports: [
    KafkaModule.register({
      name: 'KAFKA_SERVICE',
      clientId: 'subscription-service',
      groupId: 'subscription-consumer-group',
    }),
    // ... other imports
  ],
})
export class AppModule {}
```

## Usage Examples

### Producing Events

```typescript
// subscription.service.ts
import { SubscriptionProducer } from './events/subscription.producer';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionProducer: SubscriptionProducer,
  ) {}

  async create(dto: CreateSubscriptionDto) {
    const subscription = await this.repository.save(dto);
    
    // Emit event
    await this.subscriptionProducer.emitSubscriptionCreated({
      subscriptionId: subscription.id,
      subscriberId: subscription.subscriberId,
      creatorId: subscription.creatorId,
      tierId: subscription.tierId,
      startDate: subscription.startDate,
    });
    
    return subscription;
  }
}
```

### Consuming Events

```typescript
// payment.consumer.ts
import { EventPattern, Payload } from '@nestjs/microservices';
import { PAYMENT_EVENTS, PaymentCompletedEvent } from '@suggar-daddy/common';

@Injectable()
export class PaymentConsumer {
  @EventPattern(PAYMENT_EVENTS.PAYMENT_COMPLETED)
  async handlePaymentCompleted(@Payload() event: PaymentCompletedEvent) {
    console.log('Payment completed:', event);
    
    // Process the payment event
    if (event.type === 'subscription') {
      // Activate subscription
    }
  }
}
```

## Service Integration

### Subscription Service

**Produces:**
- Subscription lifecycle events
- Tier management events

**Consumes:**
- `payment.completed` - Update subscription status after payment

### Payment Service

**Produces:**
- Payment completion/failure events
- Tip and purchase events

**Consumes:**
- `subscription.created` - Initiate subscription payment
- `content.post.created` - Enable PPV purchases

### Content Service

**Produces:**
- Post lifecycle events
- Engagement events (likes, comments)

**Consumes:**
- `payment.post.purchased` - Grant access to PPV content
- `subscription.created` - Show subscriber-only content

### Media Service

**Produces:**
- Media upload/processing events

**Consumes:**
- `content.post.deleted` - Delete associated media files

## Best Practices

### 1. Event Schema

Always define event interfaces in `libs/common/src/kafka/kafka.events.ts`:

```typescript
export interface MyCustomEvent {
  id: string;
  timestamp: Date;
  userId: string;
  // ... other fields
}
```

### 2. Error Handling

```typescript
@EventPattern('my.event')
async handleEvent(@Payload() event: MyEvent) {
  try {
    await this.processEvent(event);
  } catch (error) {
    console.error('Event processing failed:', error);
    // Implement retry logic or dead letter queue
  }
}
```

### 3. Idempotency

Ensure consumers are idempotent - processing the same event multiple times should be safe:

```typescript
async handleEvent(event: MyEvent) {
  // Check if already processed
  const exists = await this.checkIfProcessed(event.id);
  if (exists) return;
  
  // Process event
  await this.process(event);
  
  // Mark as processed
  await this.markProcessed(event.id);
}
```

### 4. Event Versioning

Include version in events for backward compatibility:

```typescript
export interface MyEvent {
  version: '1.0' | '2.0';
  // ... fields
}
```

## Monitoring

### View Topics
```bash
docker exec -it <kafka-container> kafka-topics --list --bootstrap-server localhost:9092
```

### View Consumer Groups
```bash
docker exec -it <kafka-container> kafka-consumer-groups --list --bootstrap-server localhost:9092
```

### View Messages
```bash
docker exec -it <kafka-container> kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic subscription.created \
  --from-beginning
```

## Troubleshooting

### Connection Issues
- Verify Kafka is running: `docker ps`
- Check `KAFKA_BROKERS` environment variable
- Ensure firewall allows port 9092

### Consumer Not Receiving Messages
- Check consumer group ID is unique per service
- Verify topic exists and has messages
- Check consumer is registered in module

### Message Lag
- Monitor consumer lag: `kafka-consumer-groups --describe`
- Scale consumers if needed
- Optimize event processing logic

## Production Considerations

1. **High Availability**: Use multiple Kafka brokers
2. **Replication**: Set `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR` ≥ 3
3. **Monitoring**: Use tools like Kafka Manager or Confluent Control Center
4. **Security**: Enable SSL/SASL authentication
5. **Retention**: Configure topic retention policies
6. **Partitioning**: Use partition keys for ordered processing