import {
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';

// Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number; // milliseconds, 0 = don't auto-dismiss
}

export interface NotificationsState {
  notifications: Notification[];
}

const initialState: NotificationsState = {
  notifications: [],
};

// Helpers
const generateId = () => Math.random().toString(36).substr(2, 9);

// Slice
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (
      state,
      action: PayloadAction<Omit<Notification, 'id'>>
    ) => {
      const notification: Notification = {
        id: generateId(),
        ...action.payload,
        duration: action.payload.duration ?? 5000, // Default 5 seconds
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const { addNotification, removeNotification, clearNotifications } =
  notificationsSlice.actions;

// Convenience actions
export const showSuccess = (message: string, duration?: number) => (dispatch: any) => {
  dispatch(addNotification({ type: 'success', message, duration }));
};

export const showError = (message: string, duration?: number) => (dispatch: any) => {
  dispatch(addNotification({ type: 'error', message, duration: duration ?? 7000 }));
};

export const showWarning = (message: string, duration?: number) => (dispatch: any) => {
  dispatch(addNotification({ type: 'warning', message, duration }));
};

export const showInfo = (message: string, duration?: number) => (dispatch: any) => {
  dispatch(addNotification({ type: 'info', message, duration }));
};

export default notificationsSlice.reducer;
