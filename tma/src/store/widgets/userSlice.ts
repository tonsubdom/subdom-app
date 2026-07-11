import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Типы
interface User {
  address: string;
  ordersAmount: number;
  orders: string[];
  registrationDate: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UserState {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}

// Начальное состояние
const initialState: UserState = {
  currentUser: null,
  loading: false,
  error: null,
};

// Async Thunks

// Получить профиль пользователя
export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (address: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${address}`);
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message || 'Ошибка получения профиля');
      }
      
      return data.user;
    } catch (error) {
      return rejectWithValue('Ошибка сети');
    }
  }
);

// Обновить профиль пользователя
export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async (
    { address, updates }: { address: string; updates: Partial<User> },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`/api/users/${address}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message || 'Ошибка обновления профиля');
      }
      
      return data.user;
    } catch (error) {
      return rejectWithValue('Ошибка сети');
    }
  }
);

// Создание slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Установить пользователя (например, при входе)
    setUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
    },
    // Очистить пользователя (при выходе)
    clearUser: (state) => {
      state.currentUser = null;
    },
    // Очистить ошибку
    clearError: (state) => {
      state.error = null;
    },
    // Локальное обновление заказов (оптимистичное обновление)
    addOrder: (state, action: PayloadAction<string>) => {
      if (state.currentUser) {
        state.currentUser.orders.push(action.payload);
        state.currentUser.ordersAmount += 1;
      }
    },
    // Удалить заказ
    removeOrder: (state, action: PayloadAction<string>) => {
      if (state.currentUser) {
        state.currentUser.orders = state.currentUser.orders.filter(
          order => order !== action.payload
        );
        state.currentUser.ordersAmount = Math.max(0, state.currentUser.ordersAmount - 1);
      }
    },
  },
  extraReducers: (builder) => {
    // Получение профиля
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Обновление профиля
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Экспорты
export const { setUser, clearUser, clearError, addOrder, removeOrder } = userSlice.actions;
export default userSlice.reducer;