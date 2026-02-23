import { Module, Global } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { RedisModule } from "@suggar-daddy/redis";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { TokenRevocationService } from "./services/token-revocation.service";

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env["JWT_SECRET"],
      signOptions: {
        expiresIn: (process.env["JWT_ACCESS_EXPIRES"] ||
          "15m") as `${number}${"s" | "m" | "h" | "d" | "y"}`,
      },
    }),
    RedisModule.forRoot(),
  ],
  providers: [JwtStrategy, TokenRevocationService],
  exports: [JwtModule, PassportModule, JwtStrategy, TokenRevocationService],
})
export class AuthModule {}
