import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadSession } from '@suggar-daddy/entities';
import { InitiateUploadDto } from '@suggar-daddy/dto';

@Injectable()
export class ChunkedUploadService {
  private readonly logger = new Logger(ChunkedUploadService.name);

  constructor(
    @InjectRepository(UploadSession)
    private readonly uploadSessionRepo: Repository<UploadSession>,
  ) {}

  async initiateUpload(
    creatorId: string,
    dto: InitiateUploadDto,
  ): Promise<{ session_id: string; chunk_size: number; total_chunks: number }> {
    const chunkSize = dto.chunk_size || 5 * 1024 * 1024; // 5MB default
    const totalChunks = Math.ceil(dto.file_size / chunkSize);

    const session = this.uploadSessionRepo.create({
      creator_id: creatorId,
      filename: dto.filename,
      content_type: dto.content_type,
      file_size: dto.file_size,
      chunk_size: chunkSize,
      total_chunks: totalChunks,
      uploaded_chunks: [],
      is_completed: false,
    });

    const saved = await this.uploadSessionRepo.save(session);
    this.logger.log(`Upload session initiated id=${saved.id} creator=${creatorId}`);

    return {
      session_id: saved.id,
      chunk_size: chunkSize,
      total_chunks: totalChunks,
    };
  }

  async getUploadSession(sessionId: string): Promise<UploadSession> {
    const session = await this.uploadSessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Upload session ${sessionId} not found`);
    }
    return session;
  }

  async markChunkUploaded(
    sessionId: string,
    chunkIndex: number,
  ): Promise<void> {
    const session = await this.getUploadSession(sessionId);
    const chunks = new Set(session.uploaded_chunks);
    chunks.add(chunkIndex.toString());
    session.uploaded_chunks = Array.from(chunks);
    await this.uploadSessionRepo.save(session);
  }

  async completeUpload(sessionId: string, s3Key: string): Promise<void> {
    const session = await this.getUploadSession(sessionId);
    session.is_completed = true;
    session.completed_at = new Date();
    session.s3_key = s3Key;
    await this.uploadSessionRepo.save(session);
    this.logger.log(`Upload session completed id=${sessionId}`);
  }

  async isUploadComplete(sessionId: string): Promise<boolean> {
    const session = await this.getUploadSession(sessionId);
    return session.uploaded_chunks.length >= session.total_chunks;
  }
}
