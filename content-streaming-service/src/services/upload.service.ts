import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadSession } from '@/entities/upload-session.entity';
import { v4 as uuidv4 } from 'uuid';
import { InitiateUploadDto } from '@/dtos/video.dto';

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(UploadSession)
    private uploadSessionRepository: Repository<UploadSession>,
  ) {}

  async initiateUpload(
    creatorId: string,
    initiateUploadDto: InitiateUploadDto,
  ): Promise<{ session_id: string; chunk_size: number; total_chunks: number }> {
    const chunkSize = initiateUploadDto.chunk_size || 5 * 1024 * 1024; // 5MB default
    const totalChunks = Math.ceil(initiateUploadDto.file_size / chunkSize);

    const session = this.uploadSessionRepository.create({
      creator_id: creatorId,
      filename: initiateUploadDto.filename,
      content_type: initiateUploadDto.content_type,
      file_size: initiateUploadDto.file_size,
      chunk_size: chunkSize,
      total_chunks: totalChunks,
      uploaded_chunks: [],
      is_completed: false,
    });

    const saved = await this.uploadSessionRepository.save(session);

    return {
      session_id: saved.id,
      chunk_size: chunkSize,
      total_chunks: totalChunks,
    };
  }

  async getUploadSession(sessionId: string): Promise<UploadSession> {
    return await this.uploadSessionRepository.findOne({
      where: { id: sessionId },
    });
  }

  async markChunkUploaded(sessionId: string, chunkIndex: number): Promise<void> {
    const session = await this.getUploadSession(sessionId);
    if (session) {
      session.uploaded_chunks.push(chunkIndex.toString());
      session.uploaded_chunks = Array.from(new Set(session.uploaded_chunks));
      await this.uploadSessionRepository.save(session);
    }
  }

  async completeUpload(sessionId: string, s3Key: string): Promise<void> {
    const session = await this.getUploadSession(sessionId);
    if (session) {
      session.is_completed = true;
      session.completed_at = new Date();
      session.s3_key = s3Key;
      await this.uploadSessionRepository.save(session);
    }
  }

  async isUploadComplete(sessionId: string): Promise<boolean> {
    const session = await this.getUploadSession(sessionId);
    if (!session) return false;
    return session.uploaded_chunks.length === session.total_chunks;
  }
}
