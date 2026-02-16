/**
 * Utils Test
 * 
 * Tests for utility functions:
 * - JWT decoding
 * - Token expiration check
 * - Time formatting
 */

import { decodeJwtPayload, isTokenExpired, timeAgo } from './utils';

describe('Utils', () => {
  describe('decodeJwtPayload', () => {
    it('should decode valid JWT token', () => {
      // JWT token: { "sub": "1234", "name": "John Doe", "exp": 1234567890 }
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0IiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxMjM0NTY3ODkwfQ.signature';

      const payload = decodeJwtPayload(token);

      expect(payload).toEqual({
        sub: '1234',
        name: 'John Doe',
        exp: 1234567890,
      });
    });

    it('should return null for invalid JWT format', () => {
      const invalidToken = 'not-a-jwt-token';
      const payload = decodeJwtPayload(invalidToken);

      expect(payload).toBeNull();
    });

    it('should return null for malformed JWT', () => {
      const malformedToken = 'header.invalid-base64.signature';
      const payload = decodeJwtPayload(malformedToken);

      expect(payload).toBeNull();
    });

    it('should return null for empty string', () => {
      const payload = decodeJwtPayload('');
      expect(payload).toBeNull();
    });

    it('should decode JWT with special characters', () => {
      // JWT with email: { "email": "test@example.com", "exp": 1234567890 }
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJleHAiOjEyMzQ1Njc4OTB9.signature';

      const payload = decodeJwtPayload(token);

      expect(payload).toHaveProperty('email', 'test@example.com');
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for non-expired token', () => {
      // Create a token that expires 1 hour from now
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const token = createMockToken({ exp: futureExp });

      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for expired token', () => {
      // Create a token that expired 1 hour ago
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      const token = createMockToken({ exp: pastExp });

      expect(isTokenExpired(token)).toBe(true);
    });

    it('should consider buffer time', () => {
      // Create a token that expires 30 seconds from now
      const nearFutureExp = Math.floor(Date.now() / 1000) + 30;
      const token = createMockToken({ exp: nearFutureExp });

      // With default buffer (60s), should be considered expired
      expect(isTokenExpired(token)).toBe(true);

      // With no buffer, should not be expired
      expect(isTokenExpired(token, 0)).toBe(false);
    });

    it('should return true for token without exp claim', () => {
      const token = createMockToken({ sub: '1234' });

      expect(isTokenExpired(token)).toBe(true);
    });

    it('should return true for invalid token', () => {
      const invalidToken = 'invalid-token';

      expect(isTokenExpired(invalidToken)).toBe(true);
    });

    it('should handle custom buffer times', () => {
      const exp = Math.floor(Date.now() / 1000) + 100;
      const token = createMockToken({ exp });

      // With 50s buffer, should not be expired
      expect(isTokenExpired(token, 50)).toBe(false);

      // With 150s buffer, should be expired
      expect(isTokenExpired(token, 150)).toBe(true);
    });
  });

  describe('timeAgo', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return "剛剛" for time less than 60 seconds ago', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

      expect(timeAgo(thirtySecondsAgo)).toBe('剛剛');
    });

    it('should return minutes for time less than 1 hour ago', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      expect(timeAgo(fiveMinutesAgo)).toBe('5 分鐘前');
    });

    it('should return hours for time less than 1 day ago', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      expect(timeAgo(threeHoursAgo)).toBe('3 小時前');
    });

    it('should return days for time less than 30 days ago', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      expect(timeAgo(sevenDaysAgo)).toBe('7 天前');
    });

    it('should return months for time less than 12 months ago', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      expect(timeAgo(twoMonthsAgo)).toBe('2 個月前');
    });

    it('should return years for time more than 12 months ago', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

      expect(timeAgo(twoYearsAgo)).toBe('2 年前');
    });

    it('should handle string input', () => {
      const fiveMinutesAgo = new Date('2024-01-15T11:55:00Z');

      expect(timeAgo(fiveMinutesAgo.toISOString())).toBe('5 分鐘前');
    });

    it('should handle edge case at boundary (59 seconds)', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const fiftyNineSecondsAgo = new Date(now.getTime() - 59 * 1000);

      expect(timeAgo(fiftyNineSecondsAgo)).toBe('剛剛');
    });

    it('should handle edge case at boundary (60 seconds)', () => {
      const now = new Date('2024-01-15T12:00:00Z');
      const sixtySecondsAgo = new Date(now.getTime() - 60 * 1000);

      expect(timeAgo(sixtySecondsAgo)).toBe('1 分鐘前');
    });
  });
});

// Helper function to create mock JWT tokens
function createMockToken(payload: Record<string, unknown>): string {
  const base64Payload = btoa(JSON.stringify(payload));
  return `header.${base64Payload}.signature`;
}
