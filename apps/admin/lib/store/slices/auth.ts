import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
} from '@reduxjs/toolkit';
import {
  authApi,
  LoginRequest,
  RegisterRequest,
  User,
  UpdateProfileRequest,
  ChangePasswordRequest,
  tokenManager,
} from '@/lib/api';

// Types
export interface AuthState {
  user: User | null;
  tokens: {
    accessToken: string | null;
    refreshToken: string | null;
    expiresIn: number | null;
  };
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastAuthCheck: number | null;
}

const initialState: AuthState = {
  user: null,
  tokens: {
    accessToken: null,
    refreshToken: null,
    expiresIn: null,
  },
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastAuthCheck: null,
};

// Async Thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      tokenManager.setTokens(
        response.tokens.accessToken,
        response.tokens.refreshToken
      );
      return response;
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.register(data);
      tokenManager.setTokens(
        response.tokens.accessToken,
        response.tokens.refreshToken
      );
      return response;
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Registration failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_) => {
    try {
      await authApi.logout();
      tokenManager.clearTokens();
      return null;
    } catch (_error) {
      // Even if logout API fails, clear local tokens
      tokenManager.clearTokens();
      return null;
    }
  }
);

export const refreshTokenUser = createAsyncThunk(
  'auth/refresh',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState };
      const refreshToken = state.auth.tokens.refreshToken;

      if (!refreshToken) {
        return rejectWithValue('No refresh token available');
      }

      const response = await authApi.refreshToken(refreshToken);
      tokenManager.setTokens(response.accessToken, response.refreshToken);
      return response;
    } catch (error: unknown) {
      tokenManager.clearTokens();
      return rejectWithValue(error instanceof Error ? error.message : 'Token refresh failed');
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authApi.getCurrentUser();
      return user;
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to get current user');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profile: UpdateProfileRequest, { rejectWithValue }) => {
    try {
      const user = await authApi.updateProfile(profile);
      return user;
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update profile');
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (data: ChangePasswordRequest, { rejectWithValue }) => {
    try {
      const result = await authApi.changePassword(data);
      return result;
    } catch (error: unknown) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to change password');
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
    },
    setTokens: (
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>
    ) => {
      state.tokens = action.payload;
      state.isAuthenticated = true;
      tokenManager.setTokens(
        action.payload.accessToken,
        action.payload.refreshToken
      );
    },
    clearAuth: (state) => {
      state.user = null;
      state.tokens = {
        accessToken: null,
        refreshToken: null,
        expiresIn: null,
      };
      state.isAuthenticated = false;
      state.error = null;
      tokenManager.clearTokens();
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setLastAuthCheck: (state, action: PayloadAction<number>) => {
      state.lastAuthCheck = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.tokens = {
          accessToken: action.payload.tokens.accessToken,
          refreshToken: action.payload.tokens.refreshToken,
          expiresIn: action.payload.tokens.expiresIn,
        };
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.tokens = {
          accessToken: action.payload.tokens.accessToken,
          refreshToken: action.payload.tokens.refreshToken,
          expiresIn: action.payload.tokens.expiresIn,
        };
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.tokens = {
          accessToken: null,
          refreshToken: null,
          expiresIn: null,
        };
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        // Clear state even on error
        state.user = null;
        state.tokens = {
          accessToken: null,
          refreshToken: null,
          expiresIn: null,
        };
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });

    // Refresh Token
    builder
      .addCase(refreshTokenUser.pending, (_state) => {
        // Don't set loading to true to avoid UI flashing
      })
      .addCase(refreshTokenUser.fulfilled, (state, action) => {
        state.tokens.accessToken = action.payload.accessToken;
        state.tokens.refreshToken = action.payload.refreshToken;
        state.tokens.expiresIn = action.payload.expiresIn;
        state.error = null;
      })
      .addCase(refreshTokenUser.rejected, (state, action) => {
        state.user = null;
        state.tokens = {
          accessToken: null,
          refreshToken: null,
          expiresIn: null,
        };
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });

    // Get Current User
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        // Don't clear auth on error - token might still be valid
      });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Change Password
    builder
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setUser,
  setTokens,
  clearAuth,
  setError,
  clearError,
  setLastAuthCheck,
} = authSlice.actions;

export default authSlice.reducer;
