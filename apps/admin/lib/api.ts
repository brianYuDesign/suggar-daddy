import { ApiClient, AuthApi, AdminApi, ApiError } from '@suggar-daddy/api-client';
import { getToken, setToken, setRefreshToken, getRefreshToken, clearToken } from './auth';

const client = new ApiClient({ baseURL: '' });

// Token refresh lock to prevent concurrent refresh requests
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    // Use a raw AuthApi to avoid the interceptor loop
    const rawClient = new ApiClient({ baseURL: '' });
    const rawAuth = new AuthApi(rawClient);
    const res = await rawAuth.refresh({ refreshToken });
    setToken(res.accessToken);
    if (res.refreshToken) {
      setRefreshToken(res.refreshToken);
    }
    return true;
  } catch {
    return false;
  }
}

// Wrap each method to attach token and handle 401 with refresh
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withAuth(fn: (...args: any[]) => Promise<any>): (...args: any[]) => Promise<any> {
  return async (...args: unknown[]) => {
    const token = getToken();
    if (token) client.setToken(token);

    try {
      return await fn(...args);
    } catch (err: unknown) {
      const status = ApiError.getStatusCode(err);
      if (status !== 401 || typeof window === 'undefined') {
        throw err;
      }

      // Attempt token refresh with lock to avoid concurrent refreshes
      if (!refreshPromise) {
        refreshPromise = tryRefreshToken().finally(() => {
          refreshPromise = null;
        });
      }

      const refreshed = await refreshPromise;
      if (refreshed) {
        // Retry the original request with the new token
        const newToken = getToken();
        if (newToken) client.setToken(newToken);
        return fn(...args);
      }

      // Refresh failed — redirect to login
      clearToken();
      window.location.href = '/login';
      throw err;
    }
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
