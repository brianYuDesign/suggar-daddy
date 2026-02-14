import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, of, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Optional JWT guard: sets req.user when valid Bearer token present,
 * does NOT throw when token is missing or invalid (req.user = undefined).
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext): Observable<boolean> {
    const result = super.canActivate(context);
    
    // Convert Promise or boolean to Observable
    const observable$ = result instanceof Observable 
      ? result 
      : from(Promise.resolve(result));
    
    return observable$.pipe(
      map((ok) => Boolean(ok)),
      catchError(() => of(true)),
    );
  }

  override handleRequest(err: any, user: any) {
    // Return user if available, otherwise return undefined (don't throw)
    return user || undefined;
  }
}
