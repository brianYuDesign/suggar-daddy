import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@/config/config.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const s3Config = configService.getS3();
    this.s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });
    this.bucket = s3Config.bucket;
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<{ key: string; url: string; size: number }> {
    const key = this.generateS3Key(filename);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: metadata || {},
      });

      await this.s3Client.send(command);

      const url = await this.getObjectUrl(key);
      return {
        key,
        url,
        size: file.length,
      };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async getObjectUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      throw new InternalServerErrorException(`Failed to generate S3 URL: ${error.message}`);
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      // Note: In production, use DeleteObjectCommand
      // await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      throw new InternalServerErrorException(`Failed to delete object from S3: ${error.message}`);
    }
  }

  private generateS3Key(filename: string): string {
    const timestamp = Date.now();
    const random = uuidv4().substring(0, 8);
    const ext = filename.substring(filename.lastIndexOf('.'));
    return `videos/${timestamp}/${random}${ext}`;
  }

  async initiateMultipartUpload(filename: string, contentType: string): Promise<{ uploadId: string; key: string }> {
    const key = this.generateS3Key(filename);
    // In production, use CreateMultipartUploadCommand
    return {
      uploadId: uuidv4(),
      key,
    };
  }
}
