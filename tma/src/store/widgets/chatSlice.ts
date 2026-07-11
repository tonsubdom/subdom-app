import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Типы
interface Message {
  id: string;
  sender: 'user' | 'operator';
  text: string;
  timestamp: string;
  temp?: boolean;
  tempId?: string;
}

interface Chat {
  id: string;
  domain: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  currentChat: Chat | null;
  allChats: Chat[];
  loading: boolean;
  error: string | null;
}

// Начальное состояние
const initialState: ChatState = {
  currentChat: null,
  allChats: [],
  loading: false,
  error: null,
};

// Async Thunks

// Получить или создать чат по домену
export const fetchChatByDomain = createAsyncThunk(
  'chat/fetchByDomain',
  async (domain: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/chats/domain/${domain}`);
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message || 'Ошибка получения чата');
      }
      
      return data.chat;
    } catch (error) {
      return rejectWithValue('Ошибка сети');
    }
  }
);

// Отправить сообщение
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (
    { domain, text, sender }: { domain: string; text: string; sender: 'user' | 'operator' },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`/api/chats/domain/${domain}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, sender }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message || 'Ошибка отправки сообщения');
      }
      
      return data.chat;
    } catch (error) {
      return rejectWithValue('Ошибка сети');
    }
  }
);

// Получить все чаты
export const fetchAllChats = createAsyncThunk(
  'chat/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/chats');
      const data = await response.json();
      
      if (!data.success) {
        return rejectWithValue(data.message || 'Ошибка получения чатов');
      }
      
      return data.chats;
    } catch (error) {
      return rejectWithValue('Ошибка сети');
    }
  }
);

// Создание slice
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Добавить временное сообщение (для оптимистичного обновления)
    addTempMessage: (state, action: PayloadAction<{ text: string; sender: 'user' | 'operator' }>) => {
      if (state.currentChat) {
        const tempMessage: Message = {
          id: `temp-${Date.now()}`,
          text: action.payload.text,
          sender: action.payload.sender,
          timestamp: new Date().toISOString(),
          temp: true,
        };
        state.currentChat.messages.push(tempMessage);
      }
    },
    // Удалить временное сообщение
    removeTempMessage: (state, action: PayloadAction<string>) => {
      if (state.currentChat) {
        state.currentChat.messages = state.currentChat.messages.filter(
          msg => !(msg.temp && msg.id === action.payload)
        );
      }
    },
    // Очистить ошибку
    clearError: (state) => {
      state.error = null;
    },
    // Очистить текущий чат
    clearCurrentChat: (state) => {
      state.currentChat = null;
    },
  },
  extraReducers: (builder) => {
    // Получение чата по домену
    builder
      .addCase(fetchChatByDomain.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatByDomain.fulfilled, (state, action) => {
        state.loading = false;
        state.currentChat = action.payload;
      })
      .addCase(fetchChatByDomain.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Отправка сообщения
    builder
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.currentChat = action.payload;
        // Удаляем временные сообщения
        if (state.currentChat) {
          state.currentChat.messages = state.currentChat.messages.filter(msg => !msg.temp);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Получение всех чатов
    builder
      .addCase(fetchAllChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllChats.fulfilled, (state, action) => {
        state.loading = false;
        state.allChats = action.payload;
      })
      .addCase(fetchAllChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Экспорты
export const { addTempMessage, removeTempMessage, clearError, clearCurrentChat } = chatSlice.actions;
export default chatSlice.reducer;