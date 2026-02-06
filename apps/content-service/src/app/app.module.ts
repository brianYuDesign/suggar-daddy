import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { getDatabaseConfig } from '@suggar-daddy/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(
      getDatabaseConfig([Post, PostLike, PostComment])
    ),
    TypeOrmModule.forFeature([Post, PostLike, PostComment]),
  ],
  controllers: [AppController, PostController],
  providers: [AppService, PostService],
})
export class AppModule {}