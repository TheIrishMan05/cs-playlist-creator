import { useMemo, useRef } from 'react';
import { useAppState } from '../context/AppState';
import { useDebounce } from './useDebounce';
import { RecommendationParams } from '../types';

const PULSE_THRESHOLD = 10;

export function useRecommendationParams() {
  const { state } = useAppState();
  const { pulse, mood, userId, query } = state;

  const debouncedQuery = useDebounce(query, 400);
  // Use pulse directly without debouncing to avoid UI mismatch
  const currentPulse = pulse;

  const prevParamsRef = useRef<{
    pulse: number;
    mood?: string | null;
    userId?: number | null;
    query?: string;
  } | null>(null);
  const lastParamsRef = useRef<RecommendationParams | null>(null);

  const params = useMemo<RecommendationParams | null>(() => {
    // First render: always return params
    if (prevParamsRef.current === null) {
      prevParamsRef.current = {
        pulse: currentPulse,
        mood,
        userId,
        query: debouncedQuery,
      };
      const newParams = {
        pulse: currentPulse,
        mood: mood ?? undefined,
        user_id: userId ?? undefined,
        query: debouncedQuery.trim() || undefined,
      };
      lastParamsRef.current = newParams;
      return newParams;
    }

    const prev = prevParamsRef.current;
    const pulseChanged = Math.abs(currentPulse - prev.pulse) >= PULSE_THRESHOLD;
    const moodChanged = mood !== prev.mood;
    const userIdChanged = userId !== prev.userId;
    const queryChanged = debouncedQuery !== prev.query;

    // If any non-pulse param changed, always update
    const shouldUpdate = moodChanged || userIdChanged || queryChanged || pulseChanged;

    if (!shouldUpdate) {
      // Return the last params we returned, not null
      return lastParamsRef.current;
    }

    // Update previous values
    prevParamsRef.current = {
      pulse: currentPulse,
      mood,
      userId,
      query: debouncedQuery,
    };
    const newParams = {
      pulse: currentPulse,
      mood: mood ?? undefined,
      user_id: userId ?? undefined,
      query: debouncedQuery.trim() || undefined,
    };
    lastParamsRef.current = newParams;
    return newParams;
  }, [currentPulse, mood, userId, debouncedQuery]);

  return params;
}