import { useDispatch } from 'react-redux';
import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { RootState } from '../store/rootReducer';

export const useTypedDispatch = () => {
  return useDispatch<ThunkDispatch<RootState, unknown, AnyAction>>();
};