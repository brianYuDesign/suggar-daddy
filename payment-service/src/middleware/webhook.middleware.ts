import { Injectable, NestMiddleware, Logger, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WebhookService } from '../services/webhook.service';

@Injectable()
export class WebhookMiddleware implements NestMiddleware {
  private readonly logger = new Logger(WebhookMiddleware.name);

  constructor(private webhookService: WebhookService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // 獲取原始請求體以驗證 Stripe 簽名
    let rawBody = '';

    req.on('data', (chunk) => {
      rawBody += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const signature = req.headers['stripe-signature'] as string;

        if (!signature) {
          throw new BadRequestException('Missing stripe-signature header');
        }

        // 驗證簽名並構造事件
        const event = this.webhookService.verifyWebhookSignature(rawBody, signature);

        // 將事件附加到請求對象
        (req as any).stripeEvent = event;

        // 解析 JSON 並附加到 body
        try {
          (req as any).body = JSON.parse(rawBody);
        } catch (e) {
          this.logger.warn('Failed to parse raw body as JSON');
        }

        next();
      } catch (error) {
        this.logger.error(`Webhook middleware error: ${error.message}`);
        res.status(400).json({ error: 'Webhook error' });
      }
    });
  }
}
