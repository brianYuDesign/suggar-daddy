import { Injectable } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import { AppConfigService } from '../config/app.config';

@Injectable()
export class CloudFrontSignedUrlService {
  private readonly domain: string;
  private readonly keyPairId: string;
  private readonly privateKey: string;

  constructor(private readonly config: AppConfigService) {
    this.domain = config.cloudfrontDomain;
    this.keyPairId = config.cloudfrontKeyPairId;

    // Private key is stored as base64-encoded PEM
    const rawKey = config.cloudfrontPrivateKey;
    this.privateKey = rawKey
      ? Buffer.from(rawKey, 'base64').toString('utf-8')
      : '';
  }

  /**
   * Generate a CloudFront Signed URL for the given S3 key.
   * @param s3Key - The S3 object key (e.g. videos/userId/mediaId/original.mp4)
   * @param expiresInSeconds - URL validity duration (default 900 = 15 min)
   */
  getSignedVideoUrl(s3Key: string, expiresInSeconds = 900): string {
    const url = `https://${this.domain}/${s3Key}`;
    const dateLessThan = new Date(
      Date.now() + expiresInSeconds * 1000,
    ).toISOString();

    return getSignedUrl({
      url,
      keyPairId: this.keyPairId,
      privateKey: this.privateKey,
      dateLessThan,
    });
  }
}
