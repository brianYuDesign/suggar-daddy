/**
 * Setup for Next.js Middleware Tests
 * Polyfills for Next.js Request/Response in Jest environment
 */

// Polyfill for Next.js Request/Response
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Mock Request and Response for Next.js
if (typeof Request === 'undefined') {
  global.Request = class Request {
    url: string;
    method: string;
    headers: Headers;
    
    constructor(input: string | URL, init?: RequestInit) {
      this.url = typeof input === 'string' ? input : input.toString();
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
    }
  } as any;
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    status: number;
    headers: Headers;
    body: any;
    
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Headers(init?.headers);
    }
    
    json() {
      return Promise.resolve(JSON.parse(this.body as string));
    }
  } as any;
}

if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    private map = new Map<string, string>();
    
    set(key: string, value: string) {
      this.map.set(key.toLowerCase(), value);
    }
    
    get(key: string) {
      return this.map.get(key.toLowerCase()) || null;
    }
    
    has(key: string) {
      return this.map.has(key.toLowerCase());
    }
    
    delete(key: string) {
      this.map.delete(key.toLowerCase());
    }
  } as any;
}
