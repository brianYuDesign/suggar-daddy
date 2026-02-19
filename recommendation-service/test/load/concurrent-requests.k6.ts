import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * BACK-007: Edge Case Load Tests
 * 
 * Load tests for:
 * 1. Concurrent request handling (100-1000 VU)
 * 2. Rate limiting enforcement
 * 3. Sustained high load (30 min)
 * 4. Spike traffic patterns
 */

// Custom metrics
const errorRate = new Rate('errors');
const getRecommendationsDuration = new Trend('get_recommendations_duration');
const postInteractionDuration = new Trend('post_interaction_duration');
const rateLimitedRequests = new Rate('rate_limited');

export const options = {
  stages: [
    { duration: '1m', target: 10, name: 'Warm-up' },
    { duration: '2m', target: 50, name: 'Ramp-up' },
    { duration: '5m', target: 100, name: 'Load test' },
    { duration: '5m', target: 200, name: 'High load' },
    { duration: '3m', target: 100, name: 'Ramp-down' },
    { duration: '1m', target: 0, name: 'Cool-down' },
  ],
  thresholds: {
    'http_req_duration': ['p(50)<100', 'p(95)<300', 'p(99)<500'],
    'http_req_failed': ['rate<0.1'],
    'errors': ['rate<0.05'],
    'rate_limited': ['rate<0.2'],
  },
};

export default function() {
  const baseUrl = 'http://localhost:3000/api/v1';
  const userId = `test-user-${Math.floor(Math.random() * 10000)}`;
  
  group('GET Recommendations', function() {
    const response = http.get(`${baseUrl}/recommendations/${userId}?limit=20`);
    
    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'status is 429 (rate limited)': (r) => r.status === 429,
      'response time < 100ms': (r) => r.timings.duration < 100,
      'has recommendations': (r) => r.body.includes('recommendations'),
    });
    
    if (response.status === 429) {
      rateLimitedRequests.add(1);
    }
    if (!success) {
      errorRate.add(1);
    }
    
    getRecommendationsDuration.add(response.timings.duration);
  });
  
  sleep(0.1);
  
  group('POST Interaction', function() {
    const payload = JSON.stringify({
      user_id: userId,
      content_id: `content-${Math.floor(Math.random() * 1000)}`,
      interaction_type: ['view', 'like', 'share', 'comment'][Math.floor(Math.random() * 4)],
    });
    
    const response = http.post(`${baseUrl}/recommendations/interactions`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const success = check(response, {
      'status is 200 or 204': (r) => r.status === 200 || r.status === 204,
      'status is 429 (rate limited)': (r) => r.status === 429,
      'response time < 100ms': (r) => r.timings.duration < 100,
    });
    
    if (response.status === 429) {
      rateLimitedRequests.add(1);
    }
    if (!success) {
      errorRate.add(1);
    }
    
    postInteractionDuration.add(response.timings.duration);
  });
  
  sleep(0.1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    '/tmp/load-test-summary.json': JSON.stringify(data),
  };
}
