import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        replication: {
          master: {
            host: configService.get('DB_MASTER_HOST', 'localhost'),
            port: configService.get('DB_MASTER_PORT', 5432),
            username: configService.get('DB_USERNAME', 'sugar_admin'),
            password: configService.get('DB_PASSWORD', 'sugar_password'),
            database: configService.get('DB_DATABASE', 'sugar_daddy'),
          },
          slaves: [
            {
              host: configService.get('DB_REPLICA_HOST', 'localhost'),
              port: configService.get('DB_REPLICA_PORT', 5433),
              username: configService.get('DB_USERNAME', 'sugar_admin'),
              password: configService.get('DB_PASSWORD', 'sugar_password'),
              database: configService.get('DB_DATABASE', 'sugar_daddy'),
            },
          ],
        },
        entities: [__dirname + '/entities/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('DB_LOGGING', false),
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
