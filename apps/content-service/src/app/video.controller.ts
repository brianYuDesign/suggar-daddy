import {
  Controller,
  Get,
  Param,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, type CurrentUserData } from '@suggar-daddy/auth';
import { CloudFrontSignedUrlService } from '@suggar-daddy/common';
import { PostService } from './post.service';
import { SubscriptionServiceClient } from './subscription-service.client';
import { RedisService } from '@suggar-daddy/redis';

@Controller('videos')
export class VideoController {
  constructor(
    private readonly postService: PostService,
    private readonly cloudfront: CloudFrontSignedUrlService,
    private readonly subscriptionClient: SubscriptionServiceClient,
    private readonly redis: RedisService,
  ) {}

  /**
   * GET /videos/:postId/stream
   * Returns a CloudFront Signed URL for the video (15 min validity).
   * Requires JWT + access verification (creator / PPV unlock / subscription).
   */
  @Get(':postId/stream')
  @UseGuards(JwtAuthGuard)
  async getStreamUrl(
    @Param('postId') postId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const post = await this.postService.findOne(postId);

    // Must be a video post with videoMeta
    if (post.contentType !== 'video' || !post.videoMeta) {
      throw new BadRequestException('This post does not contain a video');
    }

    if (post.videoMeta.processingStatus !== 'ready') {
      throw new BadRequestException('Video is still processing');
    }

    // Access check
    const userId = user.userId;
    const isCreator = post.creatorId === userId;

    if (!isCreator) {
      // Check visibility-based access
      if (post.visibility === 'subscribers') {
        const hasAccess = await this.subscriptionClient.hasActiveSubscription(
          userId,
          post.creatorId,
        );
        if (!hasAccess) {
          throw new ForbiddenException('Subscription required to view this video');
        }
      } else if (post.visibility === 'tier_specific' && post.requiredTierId) {
        const hasAccess = await this.subscriptionClient.hasActiveSubscription(
          userId,
          post.creatorId,
          post.requiredTierId,
        );
        if (!hasAccess) {
          throw new ForbiddenException('Subscription to the required tier is needed');
        }
      }

      // Check PPV unlock
      const isPpv = post.ppvPrice != null && Number(post.ppvPrice) > 0;
      if (isPpv) {
        const unlockKey = `post:unlock:${postId}:${userId}`;
        const unlocked = await this.redis.get(unlockKey);
        if (!unlocked) {
          throw new ForbiddenException('Purchase required to view this video');
        }
      }
    }

    // Generate signed URL (15 min)
    const expiresInSeconds = 900;
    const signedUrl = this.cloudfront.getSignedVideoUrl(
      post.videoMeta.s3Key,
      expiresInSeconds,
    );

    return {
      url: signedUrl,
      expiresIn: expiresInSeconds,
    };
  }
}
