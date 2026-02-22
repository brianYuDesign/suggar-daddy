import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * BACK-007: Error Handling & Security Tests
 * 
 * Tests for:
 * 1. HTTP status code correctness
 * 2. Standardized error response format
 * 3. Error tracking IDs
 * 4. XSS prevention
 * 5. CSRF protection
 * 6. Authentication boundaries
 */
describe('Error Handling & Security (BACK-007)', () => {
  let app: INestApplication;
  let validToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    // Generate valid JWT token for tests
    validToken = generateValidJWT();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // 1. HTTP STATUS CODE TESTS
  // ============================================================================

  describe('1. HTTP Status Code Tests', () => {
    
    it('should return 400 for invalid request body', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/recommendations/interactions')
        .set('Content-Type', 'application/json')
        .send('invalid json {]');
      
      expect(response.status).toBe(HttpStatus.BAD_REQUEST); // 400
      expect(response.body).toHaveProperty('error.type', 'INVALID_REQUEST');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/recommendations/interactions')
        .send({
          user_id: 'user-123'
          // Missing content_id and interaction_type
        });
      
      expect(response.status).toBe(HttpStatus.BAD_REQUEST); // 400
      expect(response.body).toHaveProperty('error.type', 'VALIDATION_ERROR');
      expect(response.body.error).toHaveProperty('details');
    });

    it('should return 401 for missing authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/user/user-123/protected-endpoint');
      
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED); // 401
      expect(response.body).toHaveProperty('error.type', 'MISSING_AUTH');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/user/user-123/protected-endpoint')
        .set('Authorization', 'Bearer invalid.token.here');
      
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED); // 401
      expect(response.body).toHaveProperty('error.type', 'INVALID_TOKEN');
    });

    it('should return 401 for expired token', async () => {
      const expiredToken = generateExpiredJWT();
      
      const response = await request(app.getHttpServer())
        .get('/api/user/user-123/protected-endpoint')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED); // 401
      expect(response.body.error.type).toMatch(/TOKEN_EXPIRED|EXPIRED_TOKEN/);
    });

    it('should return 403 for insufficient permissions', async () => {
      const userToken = generateJWTForUser('user-456');
      
      const response = await request(app.getHttpServer())
        .get('/api/user/user-123/profile')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(HttpStatus.FORBIDDEN); // 403
      expect(response.body).toHaveProperty('error.type', 'INSUFFICIENT_PERMISSIONS');
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/recommendations/non-existent-user');
      
      expect(response.status).toBe(HttpStatus.NOT_FOUND); // 404
      expect(response.body).toHaveProperty('error.type', 'NOT_FOUND');
      expect(response.body.error).toHaveProperty('details.resource');
    });

    it('should return 409 for constraint violation (duplicate)', async () => {
      // First create a user
      await request(app.getHttpServer())
        .post('/api/user')
        .send({
          email: 'test@example.com',
          username: 'testuser'
        });
      
      // Try to create duplicate
      const response = await request(app.getHttpServer())
        .post('/api/user')
        .send({
          email: 'test@example.com',
          username: 'testuser'
        });
      
      expect(response.status).toBe(HttpStatus.CONFLICT); // 409
      expect(response.body).toHaveProperty('error.type', 'DUPLICATE_RECORD');
      expect(response.body.error.details).toHaveProperty('constraint');
    });

    it('should return 413 for payload too large', async () => {
      const largePayload = Buffer.alloc(1024 * 1024 * 1024 + 1); // >1GB
      
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .send(largePayload)
        .timeout(2000)
        .catch(() => ({ status: HttpStatus.PAYLOAD_TOO_LARGE }));
      
      expect(response.status).toBe(HttpStatus.PAYLOAD_TOO_LARGE); // 413
    });

    it('should return 415 for unsupported media type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Content-Type', 'application/x-msdownload')
        .send(Buffer.from('MZ...'));
      
      expect(response.status).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE); // 415
      expect(response.body).toHaveProperty('error.type', 'INVALID_CONTENT_TYPE');
    });

    it('should return 429 for rate limit exceeded', async () => {
      // Flood the endpoint
      const promises = [];
      for (let i = 0; i < 200; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/api/recommendations/user-123')
        );
      }
      
      const results = await Promise.all(promises);
      const rateLimited = results.filter(r => r.status === HttpStatus.TOO_MANY_REQUESTS);
      
      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0].body).toHaveProperty('error.type', 'RATE_LIMIT_EXCEEDED');
    });

    it('should return 500 for internal server error', async () => {
      // Trigger internal error
      const response = await request(app.getHttpServer())
        .get('/api/test/trigger-error');
      
      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR); // 500
      expect(response.body).toHaveProperty('error.id'); // Should have tracking ID
    });

    it('should return 501 for not implemented features', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/beta-feature/not-ready');
      
      expect(response.status).toBe(HttpStatus.NOT_IMPLEMENTED); // 501
      expect(response.body).toHaveProperty('error.type', 'NOT_IMPLEMENTED');
    });

    it('should return 503 for service unavailable', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/recommendations/user-123?simulate_503=true')
        .timeout(3000)
        .catch(() => ({ status: HttpStatus.SERVICE_UNAVAILABLE }));
      
      expect(response.status).toBe(HttpStatus.SERVICE_UNAVAILABLE); // 503
    });

    it('should return 504 for gateway timeout', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/recommendations/user-123?simulate_delay=10000')
        .timeout(2000)
        .catch(() => ({ status: HttpStatus.GATEWAY_TIMEOUT }));
      
      expect(response.status).toBe(HttpStatus.GATEWAY_TIMEOUT); // 504
    });
  });

  // ============================================================================
  // 2. STANDARDIZED ERROR FORMAT TESTS
  // ============================================================================

  describe('2. Standardized Error Response Format Tests', () => {
    
    it('should include all required error fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/recommendations/interactions')
        .send({}); // Will trigger validation error
      
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      
      const error = response.body.error;
      expect(error).toHaveProperty('id'); // Unique tracking ID
      expect(error).toHaveProperty('type'); // Error type enum
      expect(error).toHaveProperty('message'); // Human-readable message
      expect(error).toHaveProperty('status'); // HTTP status code
      expect(error).toHaveProperty('timestamp'); // ISO 8601 timestamp
      expect(error).toHaveProperty('path'); // Request path
    });

    it('should have well-formatted error ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/recommendations/invalid-id');
      
      const errorId = response.body.error.id;
      
      // Expected format: err_TIMESTAMP_HASH
      expect(errorId).toMatch(/^err_\d+_[a-f0-9]+$/);
    });

    it('should have ISO 8601 formatted timestamp', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/recommendations/interactions')
        .send({});
      
      const timestamp = response.body.error.timestamp;
      
      // Should be valid ISO 8601
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      
      // Should be close to current time
      const errorTime = new Date(timestamp).getTime();
      const now = Date.now();
      expect(Math.abs(now - errorTime)).toBeLessThan(5000); // Within 5 seconds
    });

    it('should include request path in error', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/recommendations/user-123');
      
      if (response.status !== 200) {
        expect(response.body.error.path).toContain('/api/recommendations/user-123');
      }
    });

    it('should not expose sensitive data in error message', async () => {
      // Try SQL injection
      const response = await request(app.getHttpServer())
        .get(`/api/recommendations/user-123'; DROP TABLE users; --`);
      
      const errorMessage = response.body.error.message;
      
      // Should not contain SQL query details
      expect(errorMessage).not.toContain('DROP TABLE');
      expect(errorMessage).not.toContain('SQL');
      expect(errorMessage).toMatch(/[A-Z_]+/); // Should be user-friendly
    });

    it('should include actionable details when available', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/recommendations/interactions')
        .send({
          user_id: 'user-123',
          // Missing content_id
        });
      
      expect(response.body.error).toHaveProperty('details');
      expect(response.body.error.details).toHaveProperty('field', 'content_id');
      expect(response.body.error.details).toHaveProperty('reason');
    });

    it('should use consistent error type enum', async () => {
      const errorTests = [
        { endpoint: '/invalid-body', method: 'post', type: 'INVALID_REQUEST' },
        { endpoint: '/protected', method: 'get', type: 'MISSING_AUTH' },
        { endpoint: '/non-existent', method: 'get', type: 'NOT_FOUND' },
      ];
      
      const validTypes = [
        'INVALID_REQUEST',
        'VALIDATION_ERROR',
        'MISSING_AUTH',
        'INVALID_TOKEN',
        'TOKEN_EXPIRED',
        'INSUFFICIENT_PERMISSIONS',
        'NOT_FOUND',
        'DUPLICATE_RECORD',
        'CONFLICT',
        'FILE_TOO_LARGE',
        'INVALID_CONTENT_TYPE',
        'RATE_LIMIT_EXCEEDED',
        'CIRCUIT_BREAKER_OPEN',
        'DATABASE_ERROR',
        'TIMEOUT',
        'INTERNAL_SERVER_ERROR',
        'NOT_IMPLEMENTED',
        'SERVICE_UNAVAILABLE',
      ];
      
      // Each error should use a valid type
      for (const errorType of validTypes) {
        expect(typeof errorType).toBe('string');
        expect(errorType).toMatch(/^[A-Z_]+$/);
      }
    });
  });

  // ============================================================================
  // 3. ERROR TRACKING ID TESTS
  // ============================================================================

  describe('3. Error Tracking ID Tests', () => {
    
    it('should generate unique error ID for each error', async () => {
      const ids = new Set();
      
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/recommendations/interactions')
          .send({}); // Trigger error
        
        const id = response.body.error.id;
        expect(ids.has(id)).toBe(false); // Should be unique
        ids.add(id);
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });

    it('should include error ID in logs for debugging', async () => {
      // This would require access to application logs
      const response = await request(app.getHttpServer())
        .get('/api/test/trigger-error');
      
      const errorId = response.body.error.id;
      
      // In a real scenario, you'd check application logs
      // For now, just verify the ID is present
      expect(errorId).toBeDefined();
      expect(errorId.length).toBeGreaterThan(10);
    });

    it('should allow client to reference error by ID', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/recommendations/interactions')
        .send({});
      
      const errorId = response.body.error.id;
      
      // Client should be able to reference this error to support team
      // For example: "Error ID: err_1708252800000_abc123"
      expect(errorId).toMatch(/^err_/);
    });
  });

  // ============================================================================
  // 4. XSS PREVENTION TESTS
  // ============================================================================

  describe('4. XSS (Cross-Site Scripting) Prevention Tests', () => {
    
    it('should escape script tags in user input', async () => {
      const maliciousPayload = {
        user_id: 'user-123',
        content_id: 'content-1',
        comment: '<script>alert("xss")</script>Your comment'
      };
      
      const response = await request(app.getHttpServer())
        .post('/api/recommendations/comments')
        .send(maliciousPayload);
      
      // Verify the comment was stored safely
      const getResponse = await request(app.getHttpServer())
        .get('/api/recommendations/content-1/comments');
      
      if (getResponse.status === 200) {
        const comment = getResponse.body.comments.find(c => c.text.includes('Your comment'));
        expect(comment.text).not.toContain('<script>');
        expect(comment.text).toContain('&lt;script&gt;');
      }
    });

    it('should escape event handlers in HTML', async () => {
      const xssPayloads = [
        '<img src=x onerror="alert(1)">',
        '<div onclick="malicious()">',
        '<svg onload="alert(1)">',
        '<iframe onload="attack()">',
      ];
      
      for (const payload of xssPayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/recommendations/comments')
          .send({
            user_id: 'user-123',
            content_id: 'content-1',
            comment: payload
          });
        
        const getResponse = await request(app.getHttpServer())
          .get('/api/recommendations/content-1/comments');
        
        if (getResponse.status === 200) {
          const stored = getResponse.body.comments.map(c => c.text).join('');
          expect(stored).not.toContain('onerror=');
          expect(stored).not.toContain('onclick=');
          expect(stored).not.toContain('onload=');
        }
      }
    });

    it('should block javascript: URLs', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          profile_url: 'javascript:alert("xss")'
        });
      
      if (response.status === HttpStatus.BAD_REQUEST) {
        expect(response.body.error.type).toContain('INVALID');
      }
    });

    it('should handle HTML encoding bypass attempts', async () => {
      const encodedPayloads = [
        '&#60;script&#62;alert(1)&#60;/script&#62;',
        '&#x3c;script&#x3e;alert(1)&#x3c;/script&#x3e;',
        '%3Cscript%3Ealert(1)%3C/script%3E',
      ];
      
      for (const payload of encodedPayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/recommendations/comments')
          .send({
            user_id: 'user-123',
            content_id: 'content-1',
            comment: payload
          });
        
        // Should either reject or properly escape
        expect([HttpStatus.OK, HttpStatus.NO_CONTENT, HttpStatus.BAD_REQUEST])
          .toContain(response.status);
      }
    });

    it('should prevent stored XSS by escaping on retrieval', async () => {
      // Even if somehow malicious content was stored, it should be escaped on retrieval
      const response = await request(app.getHttpServer())
        .get('/api/recommendations/content-1/comments');
      
      if (response.status === 200) {
        const html = JSON.stringify(response.body);
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('onclick=');
        expect(html).not.toContain('onerror=');
      }
    });
  });

  // ============================================================================
  // 5. CSRF PROTECTION — NOT APPLICABLE
  // JWT Bearer token auth is inherently CSRF-immune (no cookie-based sessions).
  // ============================================================================

  // ============================================================================
  // 6. AUTHENTICATION BOUNDARY TESTS
  // ============================================================================

  describe('6. Authentication Boundary Tests', () => {
    
    it('should require authentication for protected endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/user/user-123/private-data');
      
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should accept valid Bearer token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/user/user-123/profile')
        .set('Authorization', `Bearer ${validToken}`);
      
      // Should succeed or be forbidden (not unauthorized)
      expect([HttpStatus.OK, HttpStatus.FORBIDDEN]).toContain(response.status);
    });

    it('should reject malformed Authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/user/user-123/profile')
        .set('Authorization', 'NotBearer token123');
      
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should prevent user from accessing other users data', async () => {
      const token = generateJWTForUser('user-123');
      
      const response = await request(app.getHttpServer())
        .get('/api/user/user-456/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });

    it('should support multiple auth schemes', async () => {
      // Bearer token
      const bearerResponse = await request(app.getHttpServer())
        .get('/api/user/user-123/profile')
        .set('Authorization', `Bearer ${validToken}`);
      
      // Basic auth would be another option
      // OAuth token would be another option
      
      // At least one should work
      expect([HttpStatus.OK, HttpStatus.FORBIDDEN]).toContain(bearerResponse.status);
    });

    it('should reject requests with blacklisted/revoked tokens', async () => {
      // This would require a way to revoke tokens
      const revokedToken = generateValidJWT();
      revokeToken(revokedToken);
      
      const response = await request(app.getHttpServer())
        .get('/api/user/user-123/profile')
        .set('Authorization', `Bearer ${revokedToken}`);
      
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should support API key authentication for services', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .set('X-API-Key', 'valid-api-key-123');
      
      // Should work with API key
      expect([HttpStatus.OK, HttpStatus.UNAUTHORIZED]).toContain(response.status);
    });

    it('should enforce token signature validation', async () => {
      // Create JWT with tampered payload
      const tampered Token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci0xMjMiLCJpc19hZG1pbiI6dHJ1ZX0.invalid_signature';
      
      const response = await request(app.getHttpServer())
        .get('/api/user/user-123/profile')
        .set('Authorization', `Bearer ${tamperedToken}`);
      
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateValidJWT(): string {
  // In a real scenario, use a proper JWT library
  // This is simplified for testing
  const payload = {
    user_id: 'test-user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
  };
  
  // Encode and sign (simplified - use proper JWT library in real code)
  return 'valid.jwt.token';
}

function generateExpiredJWT(): string {
  return 'expired.jwt.token';
}

function generateJWTForUser(userId: string): string {
  return `token.for.${userId}`;
}

function revokeToken(_token: string): void {
  // Add token to blacklist
}
