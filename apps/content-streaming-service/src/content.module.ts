import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from '@/entities/content.entity';
import { ModerationLog } from '@/entities/moderation-log.entity';
import { ContentController } from '@/controllers/content.controller';
import { ModerationController } from '@/controllers/moderation.controller';
import { ModerationService } from '@/services/moderation.service';
import { RolesGuard } from '@/common/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Content, ModerationLog]),
  ],
  controllers: [
    ContentController,
    ModerationController,
  ],
  providers: [
    ModerationService,
    RolesGuard,
  ],
  exports: [
    ModerationService,
  ],
})
export class ContentModule {}
