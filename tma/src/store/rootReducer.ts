

import { combineReducers } from '@reduxjs/toolkit';
import nftReducer from './nft/nftReducer';
import { blockchainReducer } from './nft/blockchainReducer';
import dnsRecordsReducer from './dns/dnsRecordsSlice';
import chatReducer from './widgets/chatSlice';
import userReducer from './widgets/userSlice';
import statsReducer from './widgets/statsSlice';
import blockchainItemsSlice from '@/services/blockchainItems/blockchain-items-slice';

// Импортируй другие редьюсеры если они есть

export const rootReducer = combineReducers({
  nft: nftReducer,
  blockchain: blockchainReducer,
  dnsRecords: dnsRecordsReducer,
  chat: chatReducer,
  user: userReducer,
  stats: statsReducer,
  blockchainItems: blockchainItemsSlice,
  // Добавь другие редьюсеры здесь
});

export type RootState = ReturnType<typeof rootReducer>;