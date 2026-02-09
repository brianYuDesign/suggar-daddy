import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, UserRole } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user: { role?: string } | null): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('allows when no roles required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(createMockContext({ role: 'subscriber' }))).toBe(true);
  });

  it('allows when user has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.CREATOR, UserRole.ADMIN]);
    expect(guard.canActivate(createMockContext({ role: UserRole.CREATOR }))).toBe(true);
    expect(guard.canActivate(createMockContext({ role: UserRole.ADMIN }))).toBe(true);
  });

  it('denies when user lacks required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    expect(guard.canActivate(createMockContext({ role: UserRole.SUBSCRIBER }))).toBe(false);
  });

  it('denies when user is missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.CREATOR]);
    expect(guard.canActivate(createMockContext(null))).toBe(false);
  });
});
