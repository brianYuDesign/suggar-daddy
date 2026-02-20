import { useCallback, useEffect } from 'react';
import { useAppSelector } from './redux';
import {
  authApi,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '@/lib/api';
import { tokenManager } from '@/lib/api';

/**
 * Custom hook for authentication
 * Provides login, register, logout, and user management
 */
export const useAuth = () => {
  const auth = useAppSelector((state) => state.auth);

  // Check if user has valid token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = tokenManager.getToken();
      if (token && !auth.user) {
        // Token exists but user not in state, fetch current user
        try {
          await authApi.getCurrentUser();
        } catch (error) {
          console.error('Failed to fetch current user:', error);
        }
      }
    };

    checkAuth();
  }, [auth.user]);

  // Login
  const login = useCallback(
    async (credentials: LoginRequest) => {
      try {
        const result = await authApi.login(credentials);
        return result;
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    },
    []
  );

  // Register
  const register = useCallback(
    async (data: RegisterRequest) => {
      try {
        const result = await authApi.register(data);
        return result;
      } catch (error) {
        console.error('Register failed:', error);
        throw error;
      }
    },
    []
  );

  // Logout
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, []);

  // Update Profile
  const updateUserProfile = useCallback(
    async (profile: UpdateProfileRequest) => {
      try {
        const result = await authApi.updateProfile(profile);
        return result;
      } catch (error) {
        console.error('Update profile failed:', error);
        throw error;
      }
    },
    []
  );

  // Change Password
  const changeUserPassword = useCallback(
    async (data: ChangePasswordRequest) => {
      try {
        await authApi.changePassword(data);
      } catch (error) {
        console.error('Change password failed:', error);
        throw error;
      }
    },
    []
  );

  // Refresh Token
  const refreshToken = useCallback(async () => {
    try {
      const token = tokenManager.getRefreshToken();
      if (!token) {
        throw new Error('No refresh token available');
      }
      const result = await authApi.refreshToken(token);
      return result;
    } catch (error) {
      console.error('Refresh token failed:', error);
      throw error;
    }
  }, []);

  return {
    // State
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    tokens: auth.tokens,

    // Methods
    login,
    register,
    logout,
    updateProfile: updateUserProfile,
    changePassword: changeUserPassword,
    refreshToken,
    
    // Utilities
    hasToken: !!tokenManager.getToken(),
  };
};

export default useAuth;
