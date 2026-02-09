import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  controllers: [AppController, ProxyController],
  providers: [ProxyService],
})
export class AppModule {}
