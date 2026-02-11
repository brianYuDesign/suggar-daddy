import { ApiClient, AuthApi, AdminApi } from '@suggar-daddy/api-client';
import { getToken, clearToken } from './auth';

const client = new ApiClient({ baseURL: '' });

// Wrap each method to attach token and handle 401
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withAuth(fn: (...args: any[]) => Promise<any>): (...args: any[]) => Promise<any> {
  return (...args: unknown[]) => {
    const token = getToken();
    if (token) client.setToken(token);
    return fn(...args).catch((err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 && typeof window !== 'undefined') {
        clearToken();
        window.location.href = '/login';
      }
      throw err;
    });
  };
}

client.get = withAuth(client.get.bind(client)) as typeof client.get;
client.post = withAuth(client.post.bind(client)) as typeof client.post;
client.put = withAuth(client.put.bind(client)) as typeof client.put;
client.patch = withAuth(client.patch.bind(client)) as typeof client.patch;
client.delete = withAuth(client.delete.bind(client)) as typeof client.delete;

export const authApi = new AuthApi(client);
export const adminApi = new AdminApi(client);
export { client };
