import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Типы
interface Stats {
  totalUsers: number;
  totalChats: number;
  totalMessages: number;
  activeChats: number;
}

interface StatsState {
  stats: Stats | null;
  loading: boolean;
  error: string | null;
}

// Начальное состояние
const initialState: StatsState = {
  stats: null,
  loading: false,
  error: null,
};

// Async Thunks

// Получить статистику
export const fetchStats = createAsyncThunk(
  'stats/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message || 'Ошибка получения статистики');
      }
      
      return data.stats;
    } catch (error) {
      return rejectWithValue('Ошибка сети');
    }
  }
);

// Создание slice
const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    // Очистить ошибку
    clearError: (state) => {
      state.error = null;
    },
    // Локальное обновление статистики
    incrementStats: (state, action: PayloadAction<Partial<Stats>>) => {
      if (state.stats) {
        Object.keys(action.payload).forEach(key => {
          const statKey = key as keyof Stats;
          if (state.stats && action.payload[statKey] !== undefined) {
            state.stats[statKey] += action.payload[statKey] as number;
          }
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Экспорты
export const { clearError, incrementStats } = statsSlice.actions;
export default statsSlice.reducer;