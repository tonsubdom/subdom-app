import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../store/store';
import type { RootState } from '@/store/rootReducer';

// Типизированные версии хуков

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Хуки для чатов
export const useChat = () => {
  const dispatch = useAppDispatch();
  const { currentChat, allChats, loading, error } = useAppSelector((state) => state.chat);

  return {
    currentChat,
    allChats,
    loading,
    error,
    fetchChat: (domain: string) => dispatch(fetchChatByDomain(domain)),
    sendMessage: (domain: string, text: string, sender: 'user' | 'operator') => 
      dispatch(sendMessage({ domain, text, sender })),
    fetchAllChats: () => dispatch(fetchAllChats()),
    addTempMessage: (text: string, sender: 'user' | 'operator') => 
      dispatch(addTempMessage({ text, sender })),
    clearCurrentChat: () => dispatch(clearCurrentChat()),
    clearError: () => dispatch(clearError()),
  };
};

// Хуки для пользователей
export const useUser = () => {
  const dispatch = useAppDispatch();
  const { currentUser, loading, error } = useAppSelector((state) => state.user);

  return {
    currentUser,
    loading,
    error,
    fetchUser: (address: string) => dispatch(fetchUserProfile(address)),
    updateUser: (address: string, updates: any) => 
      dispatch(updateUserProfile({ address, updates })),
    setUser: (user: any) => dispatch(setUser(user)),
    clearUser: () => dispatch(clearUser()),
    addOrder: (orderId: string) => dispatch(addOrder(orderId)),
    removeOrder: (orderId: string) => dispatch(removeOrder(orderId)),
    clearError: () => dispatch(clearError()),
  };
};

// Хуки для статистики
export const useStats = () => {
  const dispatch = useAppDispatch();
  const { stats, loading, error } = useAppSelector((state) => state.stats);

  return {
    stats,
    loading,
    error,
    fetchStats: () => dispatch(fetchStats()),
    incrementStats: (updates: any) => dispatch(incrementStats(updates)),
    clearError: () => dispatch(clearError()),
  };
};

// Импорты для хуков
import { 
  fetchChatByDomain, 
  sendMessage, 
  fetchAllChats, 
  addTempMessage, 
  clearCurrentChat, 
  clearError 
} from '../store/widgets/chatSlice';

import { 
  fetchUserProfile, 
  updateUserProfile, 
  setUser, 
  clearUser, 
  addOrder, 
  removeOrder 
} from '../store/widgets/userSlice';

import { fetchStats, incrementStats } from '../store/widgets/statsSlice';