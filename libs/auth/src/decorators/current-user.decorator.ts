import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtUser } from '../strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext): JwtUser | string => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = request.user as JwtUser | undefined;
    if (!user) return null as unknown as JwtUser;
    return data ? user[data] : user;
  }
);
