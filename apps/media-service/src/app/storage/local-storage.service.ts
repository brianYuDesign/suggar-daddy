import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.baseUrl = process.env.MEDIA_BASE_URL || 'http://localhost:3008';
  }

  private async ensureDir(dir: string): Promise<void> {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  async saveFile(
    buffer: Buffer,
    userId: string,
    originalname: string,
  ): Promise<string> {
    const ext = path.extname(originalname) || '.bin';
    const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 8);
    const filename = `${Date.now()}-${hash}${ext}`;
    const dir = path.join(this.uploadDir, userId);
    await this.ensureDir(dir);
    const filePath = path.join(dir, filename);
    await fs.promises.writeFile(filePath, buffer);
    const relativePath = path.join(userId, filename);
    this.logger.log(`File saved: ${relativePath}`);
    return relativePath;
  }

  async saveVideoOriginal(
    buffer: Buffer,
    userId: string,
    mediaId: string,
    ext: string,
  ): Promise<string> {
    const dir = path.join(this.uploadDir, userId, mediaId);
    await this.ensureDir(dir);
    const filePath = path.join(dir, `original${ext}`);
    await fs.promises.writeFile(filePath, buffer);
    const relativePath = path.join(userId, mediaId, `original${ext}`);
    this.logger.log(`Video original saved: ${relativePath}`);
    return relativePath;
  }

  async saveThumbnail(
    buffer: Buffer,
    userId: string,
    mediaId: string,
  ): Promise<string> {
    const dir = path.join(this.uploadDir, userId, mediaId);
    await this.ensureDir(dir);
    const filePath = path.join(dir, 'thumb.jpg');
    await fs.promises.writeFile(filePath, buffer);
    const relativePath = path.join(userId, mediaId, 'thumb.jpg');
    this.logger.log(`Thumbnail saved: ${relativePath}`);
    return relativePath;
  }

  async savePreview(
    buffer: Buffer,
    userId: string,
    mediaId: string,
  ): Promise<string> {
    const dir = path.join(this.uploadDir, userId, mediaId);
    await this.ensureDir(dir);
    const filePath = path.join(dir, 'preview.mp4');
    await fs.promises.writeFile(filePath, buffer);
    const relativePath = path.join(userId, mediaId, 'preview.mp4');
    this.logger.log(`Preview saved: ${relativePath}`);
    return relativePath;
  }

  async deleteFile(relativePath: string): Promise<void> {
    const filePath = path.join(this.uploadDir, relativePath);
    try {
      await fs.promises.unlink(filePath);
      this.logger.log(`File deleted: ${relativePath}`);
    } catch (err) {
      this.logger.warn(`Failed to delete file: ${relativePath}`, err);
    }
  }

  getPublicUrl(relativePath: string): string {
    return `${this.baseUrl}/uploads/${relativePath.replace(/\\/g, '/')}`;
  }
}
