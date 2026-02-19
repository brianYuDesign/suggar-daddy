import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
  updateProfile,
  changePassword,
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
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  // Check if user has valid token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = tokenManager.getToken();
      if (token && !auth.user) {
        // Token exists but user not in state, fetch current user
        dispatch(getCurrentUser());
      }
    };

    checkAuth();
  }, [dispatch, auth.user]);

  // Login
  const login = useCallback(
    async (credentials: LoginRequest) => {
      const result = await dispatch(loginUser(credentials));
      return result.payload;
    },
    [dispatch]
  );

  // Register
  const register = useCallback(
    async (data: RegisterRequest) => {
      const result = await dispatch(registerUser(data));
      return result.payload;
    },
    [dispatch]
  );

  // Logout
  const logout = useCallback(async () => {
    await dispatch(logoutUser());
  }, [dispatch]);

  // Update Profile
  const updateUserProfile = useCallback(
    async (profile: UpdateProfileRequest) => {
      const result = await dispatch(updateProfile(profile));
      return result.payload;
    },
    [dispatch]
  );

  // Change Password
  const changeUserPassword = useCallback(
    async (data: ChangePasswordRequest) => {
      await dispatch(changePassword(data));
    },
    [dispatch]
  );

  // Refresh Token
  const refreshToken = useCallback(async () => {
    // Dispatch refresh thunk
    const token = tokenManager.getRefreshToken();
    if (!token) {
      throw new Error('No refresh token available');
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
