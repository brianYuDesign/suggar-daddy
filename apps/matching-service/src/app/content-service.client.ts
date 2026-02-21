import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { PostPreviewDto } from '@suggar-daddy/dto';

@Injectable()
export class ContentServiceClient {
  private readonly logger = new Logger(ContentServiceClient.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config
      .get<string>('CONTENT_SERVICE_URL', 'http://localhost:3006')
      .replace(/\/$/, '');
  }

  async getUserRecentPosts(
    userId: string,
    limit: number,
  ): Promise<PostPreviewDto[]> {
    try {
      const url = `${this.baseUrl}/posts/user/${userId}/recent`;
      this.logger.debug(
        `getUserRecentPosts userId=${userId} limit=${limit}`,
      );

      const res = await axios.get<PostPreviewDto[]>(url, {
        params: { limit },
        timeout: 5000,
      });

      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      this.logger.warn(
        `Failed to get recent posts userId=${userId}, returning empty`,
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  }
}
