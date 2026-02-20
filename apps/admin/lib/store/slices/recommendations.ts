import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
} from '@reduxjs/toolkit';
import {
  recommendationsApi,
  Recommendation,
  GetRecommendationsRequest,
} from '@/lib/api';

// Types
export interface RecommendationsState {
  items: Recommendation[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  filters: GetRecommendationsRequest;
}

const initialState: RecommendationsState = {
  items: [],
  loading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    hasMore: true,
  },
  filters: {
    userId: '',
    limit: 20,
    offset: 0,
  },
};

// Async Thunks
export const fetchRecommendations = createAsyncThunk(
  'recommendations/fetch',
  async (params: GetRecommendationsRequest, { rejectWithValue }) => {
    try {
      const response = await recommendationsApi.getRecommendations(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch recommendations');
    }
  }
);

export const rateContent = createAsyncThunk(
  'recommendations/rate',
  async (
    data: { userId: string; contentId: string; rating: number },
    { rejectWithValue }
  ) => {
    try {
      await recommendationsApi.rateContent(data);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to rate content');
    }
  }
);

export const recordInteraction = createAsyncThunk(
  'recommendations/recordInteraction',
  async (
    data: {
      userId: string;
      contentId: string;
      interactionType: 'view' | 'like' | 'share' | 'comment' | 'skip';
    },
    { rejectWithValue }
  ) => {
    try {
      await recommendationsApi.recordInteraction(data);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to record interaction');
    }
  }
);

export const subscribeCreator = createAsyncThunk(
  'recommendations/subscribeCreator',
  async (creatorId: string, { rejectWithValue }) => {
    try {
      await recommendationsApi.subscribeCreator(creatorId);
      return creatorId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to subscribe');
    }
  }
);

export const unsubscribeCreator = createAsyncThunk(
  'recommendations/unsubscribeCreator',
  async (creatorId: string, { rejectWithValue }) => {
    try {
      await recommendationsApi.unsubscribeCreator(creatorId);
      return creatorId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to unsubscribe');
    }
  }
);

// Slice
const recommendationsSlice = createSlice({
  name: 'recommendations',
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<Partial<GetRecommendationsRequest>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearRecommendations: (state) => {
      state.items = [];
      state.error = null;
    },
    addRecommendations: (state, action: PayloadAction<Recommendation[]>) => {
      state.items = [...state.items, ...action.payload];
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch Recommendations
    builder
      .addCase(fetchRecommendations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.recommendations;
        state.pagination = {
          total: action.payload.pagination.total,
          page: action.payload.pagination.page,
          limit: action.payload.pagination.limit,
          hasMore: action.payload.pagination.hasMore,
        };
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Rate Content
    builder
      .addCase(rateContent.pending, (state) => {
        state.error = null;
      })
      .addCase(rateContent.fulfilled, (state, action) => {
        const item = state.items.find((r) => r.contentId === action.payload.contentId);
        if (item) {
          item.score = action.payload.rating;
        }
      })
      .addCase(rateContent.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Record Interaction
    builder
      .addCase(recordInteraction.pending, (state) => {
        state.error = null;
      })
      .addCase(recordInteraction.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Subscribe Creator
    builder
      .addCase(subscribeCreator.pending, (state) => {
        state.error = null;
      })
      .addCase(subscribeCreator.fulfilled, (state, action) => {
        const items = state.items.filter(
          (r) => r.creatorId === action.payload
        );
        items.forEach((item) => {
          item.isSubscribed = true;
        });
      })
      .addCase(subscribeCreator.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Unsubscribe Creator
    builder
      .addCase(unsubscribeCreator.pending, (state) => {
        state.error = null;
      })
      .addCase(unsubscribeCreator.fulfilled, (state, action) => {
        const items = state.items.filter(
          (r) => r.creatorId === action.payload
        );
        items.forEach((item) => {
          item.isSubscribed = false;
        });
      })
      .addCase(unsubscribeCreator.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setFilter, clearRecommendations, addRecommendations, setError } =
  recommendationsSlice.actions;

export default recommendationsSlice.reducer;
