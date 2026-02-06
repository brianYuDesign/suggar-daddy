import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * 可選 JWT：有 Bearer 且有效時設定 req.user，無 token 或無效時不拋錯、req.user 為 undefined。
 * 用於需「登入則做權限判斷、未登入則給預設」的 API（如 GET /posts/:id）。
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext): Observable<boolean> {
    return (super.canActivate(context) as Observable<boolean>).pipe(
      map((ok) => Boolean(ok)),
      catchError(() => of(true))
    );
  }
}
