import { ConfigService } from '@/config/config.service';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(() => {
    service = new ConfigService();
  });

  describe('Config Loading', () => {
    it('should load database configuration', () => {
      const dbConfig = service.getDatabase();
      expect(dbConfig).toBeDefined();
      expect(dbConfig.type).toBe('postgres');
      expect(dbConfig.host).toBeDefined();
      expect(dbConfig.port).toBeGreaterThan(0);
    });

    it('should load S3 configuration', () => {
      const s3Config = service.getS3();
      expect(s3Config).toBeDefined();
      expect(s3Config.bucket).toBeDefined();
      expect(s3Config.region).toBeDefined();
    });

    it('should load Cloudflare configuration', () => {
      const cfConfig = service.getCloudflare();
      expect(cfConfig).toBeDefined();
      expect(cfConfig.domain).toBeDefined();
    });

    it('should load transcoding configuration', () => {
      const tcConfig = service.getTranscoding();
      expect(tcConfig).toBeDefined();
      expect(tcConfig.qualities).toHaveLength(4);
      expect(tcConfig.qualities[0].name).toBe('720p');
    });
  });

  describe('Port Configuration', () => {
    it('should return a valid port number', () => {
      const port = service.getPort();
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThan(65536);
    });
  });

  describe('Node Environment', () => {
    it('should return node environment', () => {
      const env = service.getNodeEnv();
      expect(['development', 'production', 'test']).toContain(env);
    });
  });
});
