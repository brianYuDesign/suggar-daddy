// Jest setup file
import 'reflect-metadata';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'content_streaming_test';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_BUCKET = 'test-bucket';
process.env.CLOUDFLARE_DOMAIN = 'test.example.com';
