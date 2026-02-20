import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * BACK-007: Edge Cases & Boundary Conditions Tests
 * 
 * Tests for:
 * 1. Large file uploads (>1GB)
 * 2. Concurrent requests (100+ simultaneous)
 * 3. High-frequency API calls (Rate limiting)
 * 4. Boundary conditions
 */
describe('Edge Cases & Boundary Conditions (BACK-007)', () => {
  let app: INestApplication;
  let testUserId = 'test-user-' + Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // 1. LARGE FILE UPLOAD TESTS
  // ============================================================================

  describe('1. Large File Upload Tests', () => {
    
    it('should reject file upload exceeding max size (>1GB)', async () => {
      // Simulate 1.1GB file request (would be done via chunking in real scenario)
      const largePayload = Buffer.alloc(1024 * 1024 * 1024 + 1); // 1GB + 1 byte
      
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Content-Type', 'application/octet-stream')
        .send(largePayload);

      expect(response.status).toBe(HttpStatus.PAYLOAD_TOO_LARGE); // 413
      expect(response.body).toHaveProperty('error.type', 'FILE_TOO_LARGE');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('id'); // Tracking ID
    });

    it('should accept valid chunked upload with 100MB chunks', async () => {
      // Simulate 5 chunks of 100MB each = 500MB total
      const chunkSize = 100 * 1024 * 1024; // 100MB
      const uploadId = 'upload-' + Date.now();
      
      // Upload chunk 1
      const chunk1 = Buffer.alloc(chunkSize);
      const response1 = await request(app.getHttpServer())
        .post('/api/upload/chunk')
        .set('X-Upload-ID', uploadId)
        .set('X-Chunk-Index', '0')
        .set('X-Total-Chunks', '5')
        .send(chunk1);
      
      expect(response1.status).toBe(HttpStatus.OK);
      expect(response1.body).toHaveProperty('chunk_index', 0);
      expect(response1.body).toHaveProperty('received_bytes', chunkSize);
    });

    it('should handle malformed chunked upload (missing chunk)', async () => {
      const uploadId = 'upload-' + Date.now();
      const chunkSize = 100 * 1024 * 1024;
      
      // Upload chunk 0
      const chunk0 = Buffer.alloc(chunkSize);
      await request(app.getHttpServer())
        .post('/api/upload/chunk')
        .set('X-Upload-ID', uploadId)
        .set('X-Chunk-Index', '0')
        .set('X-Total-Chunks', '3')
        .send(chunk0);
      
      // Skip chunk 1 and upload chunk 2
      const chunk2 = Buffer.alloc(chunkSize);
      const response = await request(app.getHttpServer())
        .post('/api/upload/chunk')
        .set('X-Upload-ID', uploadId)
        .set('X-Chunk-Index', '2')
        .set('X-Total-Chunks', '3')
        .send(chunk2);
      
      // Should fail because chunk 1 is missing
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.error.type).toBe('MISSING_CHUNK');
    });

    it('should reject upload with invalid content type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Content-Type', 'application/x-msdownload') // .exe
        .attach('file', Buffer.from('MZ...'), 'malware.exe');
      
      expect(response.status).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE); // 415
      expect(response.body.error.type).toBe('INVALID_CONTENT_TYPE');
    });

    it('should reject zero-byte file upload', async () => {
      const emptyBuffer = Buffer.alloc(0);
      
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Content-Type', 'video/mp4')
        .send(emptyBuffer);
      
      expect(response.status).toBe(HttpStatus.BAD_REQUEST); // 400
      expect(response.body.error.type).toBe('EMPTY_FILE');
    });
  });

  // ============================================================================
  // 2. CONCURRENT REQUEST TESTS
  // ============================================================================

  describe('2. Concurrent Request Tests', () => {
    
    it('should handle 100 concurrent GET requests successfully', async () => {
      const concurrencyLevel = 100;
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < concurrencyLevel; i++) {
        promises.push(
          request(app.getHttpServer())
            .get(`/api/recommendations/${testUserId}?limit=10`)
        );
      }
      
      const results = await Promise.all(promises);
      
      // All requests should succeed
      results.forEach(response => {
        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body).toHaveProperty('recommendations');
        expect(response.body).toHaveProperty('user_id');
      });
      
      // Response time should be reasonable (P50 < 100ms)
      const responseTimes = results.map(r => r.timing?.duration || 0).sort((a, b) => a - b);
      const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
      expect(p50).toBeLessThan(100); // P50 < 100ms
    });

    it('should handle 100 concurrent POST requests', async () => {
      const concurrencyLevel = 100;
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < concurrencyLevel; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/api/recommendations/interactions')
            .send({
              user_id: `${testUserId}-${i}`,
              content_id: `content-${Math.floor(Math.random() * 1000)}`,
              interaction_type: 'view'
            })
        );
      }
      
      const results = await Promise.all(promises);
      
      // Check success rate (should be high, allowing for some failures)
      const successCount = results.filter(r => r.status === HttpStatus.NO_CONTENT || r.status === HttpStatus.OK).length;
      expect(successCount).toBeGreaterThan(concurrencyLevel * 0.95); // 95% success rate
    });

    it('should reject requests when connection pool is exhausted', async () => {
      // This test requires special setup - simulate by holding connections
      const holdTimeMs = 10000; // Hold for 10 seconds
      const promises: Promise<any>[] = [];
      
      // Simulate connection exhaustion by making slow requests
      for (let i = 0; i < 25; i++) {
        promises.push(
          request(app.getHttpServer())
            .get(`/api/recommendations/${testUserId}?delay=${holdTimeMs}`)
        );
      }
      
      // Some requests should be rejected with 503
      const results = await Promise.allSettled(promises);
      const rejections = results.filter(r => 
        r.status === 'fulfilled' && (r.value.status === HttpStatus.SERVICE_UNAVAILABLE || r.value.status === HttpStatus.REQUEST_TIMEOUT)
      );
      
      expect(rejections.length).toBeGreaterThan(0);
    });

    it('should handle burst traffic spike (slow to fast)', async () => {
      const startTime = Date.now();
      let successCount = 0;
      let totalRequests = 0;
      
      // Phase 1: Slow traffic (10 requests over 5 seconds)
      for (let i = 0; i < 10; i++) {
        totalRequests++;
        const response = await request(app.getHttpServer())
          .get(`/api/recommendations/${testUserId}`);
        if (response.status === HttpStatus.OK) successCount++;
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms between requests
      }
      
      // Phase 2: Burst traffic (100 concurrent requests)
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 100; i++) {
        totalRequests++;
        promises.push(
          request(app.getHttpServer())
            .get(`/api/recommendations/${testUserId}`)
        );
      }
      const burstResults = await Promise.all(promises);
      successCount += burstResults.filter(r => r.status === HttpStatus.OK).length;
      
      const totalTime = Date.now() - startTime;
      expect(successCount / totalRequests).toBeGreaterThan(0.95); // >95% success rate
      expect(totalTime).toBeLessThan(30000); // Complete within 30 seconds
    });
  });

  // ============================================================================
  // 3. RATE LIMITING TESTS
  // ============================================================================

  describe('3. Rate Limiting Tests', () => {
    
    it('should enforce per-second rate limit', async () => {
      const promises: Promise<any>[] = [];
      
      // Send 150 requests in rapid succession (should exceed limit)
      for (let i = 0; i < 150; i++) {
        promises.push(
          request(app.getHttpServer())
            .get(`/api/recommendations/${testUserId}`)
        );
      }
      
      const results = await Promise.all(promises);
      
      // Count how many succeeded vs rate-limited
      const successCount = results.filter(r => r.status === HttpStatus.OK).length;
      const rateLimitedCount = results.filter(r => r.status === HttpStatus.TOO_MANY_REQUESTS).length;
      
      // Should have some 429 responses
      expect(rateLimitedCount).toBeGreaterThan(0);
      expect(successCount + rateLimitedCount).toBe(150); // All requests handled
    });

    it('should include Retry-After header in rate limit response', async () => {
      // First, hit the rate limit
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 200; i++) {
        promises.push(
          request(app.getHttpServer())
            .get(`/api/recommendations/${testUserId}`)
        );
      }
      
      const results = await Promise.all(promises);
      const rateLimitResponse = results.find(r => r.status === HttpStatus.TOO_MANY_REQUESTS);
      
      if (rateLimitResponse) {
        expect(rateLimitResponse.headers).toHaveProperty('retry-after');
        const retryAfter = parseInt(rateLimitResponse.headers['retry-after']);
        expect(retryAfter).toBeGreaterThan(0);
        expect(retryAfter).toBeLessThanOrEqual(60); // Within 1 minute
      }
    });

    it('should include X-RateLimit-* headers in all responses', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/recommendations/${testUserId}`);
      
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
      
      const limit = parseInt(response.headers['x-ratelimit-limit']);
      const remaining = parseInt(response.headers['x-ratelimit-remaining']);
      
      expect(remaining).toBeLessThanOrEqual(limit);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });

    it('should reset rate limit after window expires', async () => {
      // This test would need to use a shorter window for testing
      // Assuming a 1-minute window for this test scenario
      
      // Hit rate limit
      const promises1: Promise<any>[] = [];
      for (let i = 0; i < 200; i++) {
        promises1.push(
          request(app.getHttpServer())
            .get(`/api/recommendations/${testUserId}`)
        );
      }
      
      await Promise.all(promises1);
      
      // Wait for window to reset (would be configurable in test)
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second pause
      
      // Should be able to make requests again
      const response = await request(app.getHttpServer())
        .get(`/api/recommendations/${testUserId}`);
      
      expect(response.status).not.toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('should apply rate limits per endpoint', async () => {
      // Test different endpoints have different limits
      const endpoints = [
        `/api/recommendations/${testUserId}`,
        `/api/user/${testUserId}/profile`,
        `/api/content/search?q=test`
      ];
      
      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer()).get(endpoint);
        
        const limit = response.headers['x-ratelimit-limit'];
        expect(limit).toBeDefined();
        // Each endpoint should have its configured limit
      }
    });

    it('should apply higher rate limits for authenticated users', async () => {
      const authToken = 'valid-jwt-token-here';
      
      // Without auth - lower limit
      const anonResponse = await request(app.getHttpServer())
        .get(`/api/recommendations/${testUserId}`);
      const anonLimit = parseInt(anonResponse.headers['x-ratelimit-limit']);
      
      // With auth - higher limit
      const authResponse = await request(app.getHttpServer())
        .get(`/api/recommendations/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);
      const authLimit = parseInt(authResponse.headers['x-ratelimit-limit']);
      
      expect(authLimit).toBeGreaterThan(anonLimit);
    });

    it('should prevent rate limit bypass via X-Forwarded-For header spoofing', async () => {
      // Attempt to bypass rate limit by spoofing IP
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < 150; i++) {
        promises.push(
          request(app.getHttpServer())
            .get(`/api/recommendations/${testUserId}`)
            .set('X-Forwarded-For', `192.168.1.${i % 254}`) // Try different IPs
        );
      }
      
      const results = await Promise.all(promises);
      const rateLimitedCount = results.filter(r => r.status === HttpStatus.TOO_MANY_REQUESTS).length;
      
      // Should still be rate limited despite IP spoofing attempts
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 4. BOUNDARY CONDITION TESTS
  // ============================================================================

  describe('4. Boundary Condition Tests', () => {
    
    it('should handle minimum valid request (empty object)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/recommendations/interactions')
        .send({});
      
      // Should fail validation with 400
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.error).toHaveProperty('details');
    });

    it('should handle maximum valid request (all optional fields)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/recommendations/interactions')
        .send({
          user_id: testUserId,
          content_id: 'content-123',
          interaction_type: 'like',
          timestamp: new Date().toISOString(),
          metadata: {
            device: 'mobile',
            os: 'iOS',
            app_version: '1.0.0',
            session_id: 'sess-123',
            duration_seconds: 120
          }
        });
      
      expect(response.status).toBe(HttpStatus.NO_CONTENT);
    });

    it('should handle edge case: negative values', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/recommendations/interactions')
        .send({
          user_id: testUserId,
          content_id: 'content-123',
          interaction_type: 'like',
          duration_seconds: -100 // Invalid negative duration
        });
      
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.error.details).toHaveProperty('field', 'duration_seconds');
    });

    it('should handle edge case: extremely large values', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/recommendations/interactions')
        .send({
          user_id: testUserId,
          content_id: 'content-123',
          interaction_type: 'like',
          duration_seconds: Number.MAX_SAFE_INTEGER + 1
        });
      
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should handle edge case: special characters in user ID', async () => {
      const specialIds = [
        'user-123!@#$%^&*()',
        'user<script>alert(1)</script>',
        'user\'; DROP TABLE users; --',
        'user\n\r\t',
      ];
      
      for (const specialId of specialIds) {
        const response = await request(app.getHttpServer())
          .get(`/api/recommendations/${encodeURIComponent(specialId)}`);
        
        // Should not crash, should handle gracefully
        expect([HttpStatus.NOT_FOUND, HttpStatus.BAD_REQUEST]).toContain(response.status);
      }
    });

    it('should handle limit=0 (invalid boundary)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/recommendations/${testUserId}?limit=0`);
      
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should handle limit=1 (minimum valid)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/recommendations/${testUserId}?limit=1`);
      
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.recommendations.length).toBeLessThanOrEqual(1);
    });

    it('should handle limit=100 (maximum valid)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/recommendations/${testUserId}?limit=100`);
      
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.recommendations.length).toBeLessThanOrEqual(100);
    });

    it('should handle limit=101 (exceeds maximum)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/recommendations/${testUserId}?limit=101`);
      
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.error.details).toContain('limit');
    });
  });
});
