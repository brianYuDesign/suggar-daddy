import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Optional JWT guard: sets req.user when valid Bearer token present,
 * does NOT throw when token is missing or invalid (req.user = undefined).
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext): Observable<boolean> {
    return (super.canActivate(context) as Observable<boolean>).pipe(
      map((ok) => Boolean(ok)),
      catchError(() => of(true)),
    );
  }
}
