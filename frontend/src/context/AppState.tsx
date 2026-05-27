import { createContext, useContext, useReducer, ReactNode, Dispatch, useMemo } from 'react';
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
      if (state.pulse === action.payload) return state;
      return { ...state, pulse: action.payload };
    case 'SET_MOOD':
      if (state.mood === action.payload) return state;
      return { ...state, mood: action.payload };
    case 'SET_USER_ID':
      if (state.userId === action.payload) return state;
      return { ...state, userId: action.payload };
    case 'SET_QUERY':
      if (state.query === action.payload) return state;
      return { ...state, query: action.payload };
    case 'SET_CURRENT_TRACK':
      if (state.currentTrackId === action.payload) return state;
      return { ...state, currentTrackId: action.payload };
    case 'SET_CURRENT_TRACK_INFO': {
      const nextId = action.payload?.id ?? null;
      if (state.currentTrack === action.payload && state.currentTrackId === nextId) {
        return state;
      }
      return { ...state, currentTrack: action.payload, currentTrackId: nextId };
    }
    case 'SET_CONNECTION_STATUS':
      if (state.connectionStatus === action.payload) return state;
      return { ...state, connectionStatus: action.payload };
    default:
      return state;
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
