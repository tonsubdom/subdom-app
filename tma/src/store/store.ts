// import { createStore, applyMiddleware } from 'redux';
// import { thunk } from 'redux-thunk';
// import { rootReducer } from './rootReducer';

// export const store = createStore(
//   rootReducer,
//   applyMiddleware(thunk)
// );

import { configureStore } from '@reduxjs/toolkit';
import { ThunkAction, Action } from '@reduxjs/toolkit';
import { rootReducer, RootState } from './rootReducer';

export const store = configureStore({
  reducer: rootReducer,
});

export type AppDispatch = typeof store.dispatch;

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
