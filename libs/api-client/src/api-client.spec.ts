import axios from 'axios';
import { ApiClient } from './client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let client: ApiClient;
  let mockGet: jest.Mock;
  let mockPost: jest.Mock;
  let mockPut: jest.Mock;
  let mockPatch: jest.Mock;
  let mockDelete: jest.Mock;
  let mockDefaults: { headers: { common: Record<string, string> } };

  beforeEach(() => {
    mockGet = jest.fn();
    mockPost = jest.fn();
    mockPut = jest.fn();
    mockPatch = jest.fn();
    mockDelete = jest.fn();
    mockDefaults = { headers: { common: {} } };

    mockedAxios.create.mockReturnValue({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      patch: mockPatch,
      delete: mockDelete,
      defaults: mockDefaults,
    } as any);

    client = new ApiClient({ baseURL: 'http://localhost:3000' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with baseURL', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:3000',
        })
      );
    });

    it('should use default timeout of 30000', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    it('should use custom timeout when provided', () => {
      new ApiClient({ baseURL: 'http://test.com', timeout: 5000 });
      expect(mockedAxios.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });

    it('should set Content-Type to application/json', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('setToken', () => {
    it('should set Authorization header with Bearer token', () => {
      client.setToken('my-jwt-token');
      expect(mockDefaults.headers.common['Authorization']).toBe(
        'Bearer my-jwt-token'
      );
    });
  });

  describe('clearToken', () => {
    it('should remove Authorization header', () => {
      client.setToken('my-jwt-token');
      client.clearToken();
      expect(mockDefaults.headers.common['Authorization']).toBeUndefined();
    });
  });

  describe('get', () => {
    it('should call axios.get and return data', async () => {
      const responseData = { id: 1, name: 'Test' };
      mockGet.mockResolvedValue({ data: responseData });

      const result = await client.get('/users/1');
      expect(mockGet).toHaveBeenCalledWith('/users/1', undefined);
      expect(result).toEqual(responseData);
    });

    it('should pass config to axios.get', async () => {
      mockGet.mockResolvedValue({ data: {} });
      const config = { params: { page: 1 } };

      await client.get('/users', config);
      expect(mockGet).toHaveBeenCalledWith('/users', config);
    });

    it('should propagate errors', async () => {
      mockGet.mockRejectedValue(new Error('Network Error'));
      await expect(client.get('/fail')).rejects.toThrow('Network Error');
    });
  });

  describe('post', () => {
    it('should call axios.post and return data', async () => {
      const responseData = { id: 2 };
      mockPost.mockResolvedValue({ data: responseData });

      const result = await client.post('/users', { name: 'New User' });
      expect(mockPost).toHaveBeenCalledWith(
        '/users',
        { name: 'New User' },
        undefined
      );
      expect(result).toEqual(responseData);
    });
  });

  describe('put', () => {
    it('should call axios.put and return data', async () => {
      const responseData = { id: 1, name: 'Updated' };
      mockPut.mockResolvedValue({ data: responseData });

      const result = await client.put('/users/1', { name: 'Updated' });
      expect(mockPut).toHaveBeenCalledWith(
        '/users/1',
        { name: 'Updated' },
        undefined
      );
      expect(result).toEqual(responseData);
    });
  });

  describe('patch', () => {
    it('should call axios.patch and return data', async () => {
      const responseData = { id: 1, name: 'Patched' };
      mockPatch.mockResolvedValue({ data: responseData });

      const result = await client.patch('/users/1', { name: 'Patched' });
      expect(mockPatch).toHaveBeenCalledWith(
        '/users/1',
        { name: 'Patched' },
        undefined
      );
      expect(result).toEqual(responseData);
    });
  });

  describe('delete', () => {
    it('should call axios.delete and return data', async () => {
      mockDelete.mockResolvedValue({ data: { success: true } });

      const result = await client.delete('/users/1');
      expect(mockDelete).toHaveBeenCalledWith('/users/1', undefined);
      expect(result).toEqual({ success: true });
    });
  });
});
