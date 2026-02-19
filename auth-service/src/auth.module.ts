import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { User, Role, Permission, RolePermission, TokenBlacklist } from '@/entities';
import {
  AuthService,
  UserService,
  RoleService,
  PermissionService,
  TokenBlacklistService,
} from '@/services';
import {
  AuthController,
  UserController,
  RoleController,
  PermissionController,
} from '@/controllers';
import { JwtStrategy, JwtRefreshStrategy, LocalStrategy } from '@/strategies';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      RolePermission,
      TokenBlacklist,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION'),
        },
      }),
    }),
  ],
  controllers: [AuthController, UserController, RoleController, PermissionController],
  providers: [
    AuthService,
    UserService,
    RoleService,
    PermissionService,
    TokenBlacklistService,
    JwtStrategy,
    JwtRefreshStrategy,
    LocalStrategy,
  ],
  exports: [AuthService, UserService, RoleService, PermissionService],
})
export class AuthModule {}
