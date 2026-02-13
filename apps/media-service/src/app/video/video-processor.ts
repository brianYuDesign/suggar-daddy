import { Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
}

@Injectable()
export class VideoProcessorService {
  private readonly logger = new Logger(VideoProcessorService.name);

  private getTempPath(suffix: string): string {
    return path.join(
      os.tmpdir(),
      `suggar-daddy-video-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${suffix}`,
    );
  }

  /**
   * Extract a thumbnail (JPEG) from the video at the specified second.
   */
  async extractThumbnail(
    inputPath: string,
    outputPath: string,
    atSecond = 1,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [atSecond],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '640x?',
        })
        .on('end', () => {
          this.logger.log(`Thumbnail extracted: ${outputPath}`);
          resolve();
        })
        .on('error', (err: Error) => {
          this.logger.error(`Thumbnail extraction failed: ${err.message}`);
          reject(err);
        });
    });
  }

  /**
   * Extract the first N seconds as a preview clip (MP4).
   */
  async extractPreview(
    inputPath: string,
    outputPath: string,
    durationSec = 15,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(0)
        .setDuration(durationSec)
        .output(outputPath)
        .outputOptions(['-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart'])
        .on('end', () => {
          this.logger.log(`Preview extracted: ${outputPath}`);
          resolve();
        })
        .on('error', (err: Error) => {
          this.logger.error(`Preview extraction failed: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Probe video metadata (duration, dimensions, codec).
   */
  async getMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err: Error | null, metadata: ffmpeg.FfprobeData) => {
        if (err) {
          this.logger.error(`ffprobe failed: ${err.message}`);
          return reject(err);
        }
        const videoStream = metadata.streams.find(
          (s) => s.codec_type === 'video',
        );
        resolve({
          duration: metadata.format.duration ?? 0,
          width: videoStream?.width ?? 0,
          height: videoStream?.height ?? 0,
          codec: videoStream?.codec_name ?? 'unknown',
        });
      });
    });
  }

  /**
   * Write a buffer to a temp file, returning the path.
   */
  async writeToTemp(buffer: Buffer, extension = '.mp4'): Promise<string> {
    const tmpPath = this.getTempPath(extension);
    await fs.promises.writeFile(tmpPath, buffer);
    return tmpPath;
  }

  /**
   * Clean up a temp file (best effort).
   */
  async cleanupTemp(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch {
      this.logger.warn(`Failed to cleanup temp file: ${filePath}`);
    }
  }
}
