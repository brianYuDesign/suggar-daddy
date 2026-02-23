import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectLogger } from '@suggar-daddy/common';
import type { NsfwResult } from '@suggar-daddy/moderation';

@Injectable()
export class NsfwClientService {
  @InjectLogger() private readonly logger!: Logger;
  private readonly mlServiceUrl: string;

  constructor(private readonly config: ConfigService) {
    this.mlServiceUrl = this.config.get<string>('ML_SERVICE_URL', 'http://localhost:5000');
  }

  async checkImage(imageUrl: string): Promise<NsfwResult> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.mlServiceUrl}/api/moderation/nsfw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`NSFW API returned ${response.status}`);
      }

      const data = await response.json();
      return {
        nsfwScore: data.nsfw_score,
        category: data.category,
        safe: data.safe,
        processingTimeMs: data.processing_time_ms,
      };
    } catch (error) {
      this.logger.warn(`NSFW check failed for ${imageUrl}: ${error}`);
      // Fail open: treat as safe if service unavailable
      return {
        nsfwScore: 0,
        category: 'safe',
        safe: true,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  async checkImages(imageUrls: string[]): Promise<NsfwResult[]> {
    const results = await Promise.all(
      imageUrls.map((url) => this.checkImage(url)),
    );
    return results;
  }
}
