import { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';
import { Mood, Track } from '../types';

interface AppState {
  pulse: number;
  mood: Mood | null;
  userId: number | null;
  query: string;
  currentTrackId: number | null;
  currentTrack: Track | null;
  connectionStatus: 'connected' | 'disconnected' | 'unknown';
}

type Action =
  | { type: 'SET_PULSE'; payload: number }
  | { type: 'SET_MOOD'; payload: Mood | null }
  | { type: 'SET_USER_ID'; payload: number | null }
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_CURRENT_TRACK'; payload: number | null }
  | { type: 'SET_CURRENT_TRACK_INFO'; payload: Track | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: AppState['connectionStatus'] };

const initialState: AppState = {
  pulse: 80,
  mood: null,
  userId: null,
  query: '',
  currentTrackId: null,
  currentTrack: null,
  connectionStatus: 'unknown',
};

const AppStateContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
} | undefined>(undefined);

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PULSE':
      return { ...state, pulse: action.payload };
    case 'SET_MOOD':
      return { ...state, mood: action.payload };
    case 'SET_USER_ID':
      return { ...state, userId: action.payload };
    case 'SET_QUERY':
      return { ...state, query: action.payload };
    case 'SET_CURRENT_TRACK':
      return { ...state, currentTrackId: action.payload };
    case 'SET_CURRENT_TRACK_INFO':
      return { ...state, currentTrack: action.payload, currentTrackId: action.payload?.id || null };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    default:
      return state;
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}