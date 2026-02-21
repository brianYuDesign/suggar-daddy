import axios from 'axios';

describe('GET /', () => {
  it('should return a message', async () => {
    // Verify axios is configured with baseURL
    if (!axios.defaults.baseURL) {
      console.error('[E2E Test] axios.defaults.baseURL is not set!');
      console.error('[E2E Test] Environment:', {
        HOST: process.env.HOST,
        PORT: process.env.PORT,
        API_HOST: process.env.API_HOST,
        API_PORT: process.env.API_PORT,
      });
      throw new Error('axios.defaults.baseURL is not configured. Check test-setup.ts');
    }
    
    console.log(`[E2E Test] Using baseURL: ${axios.defaults.baseURL}`);
    
    // API Gateway root endpoint - check service is up
    const res = await axios.get(`/`);

    expect(res.status).toBe(200);
    // API Gateway returns gateway info with available routes
    expect(res.data).toHaveProperty('service');
    expect(res.data).toHaveProperty('message');
  });
});
