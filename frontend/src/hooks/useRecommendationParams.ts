import { useMemo, useRef } from 'react';
import { useAppState } from '../context/AppState';
import { useDebounce } from './useDebounce';
import { RecommendationParams } from '../types';

const PULSE_THRESHOLD = 10;

export function useRecommendationParams() {
  const { state } = useAppState();
  const { pulse, mood, userId, query } = state;

  const debouncedQuery = useDebounce(query, 400);
  const debouncedPulse = useDebounce(pulse, 300);

  const prevParamsRef = useRef<{
    pulse: number;
    mood?: string | null;
    userId?: number | null;
    query?: string;
  }>({ pulse: debouncedPulse, mood, userId, query: debouncedQuery });

  const params = useMemo<RecommendationParams | null>(() => {
    const prev = prevParamsRef.current;
    const pulseChanged = Math.abs(debouncedPulse - prev.pulse) >= PULSE_THRESHOLD;
    const moodChanged = mood !== prev.mood;
    const userIdChanged = userId !== prev.userId;
    const queryChanged = debouncedQuery !== prev.query;

    // If any non-pulse param changed, always update
    const shouldUpdate = moodChanged || userIdChanged || queryChanged || pulseChanged;

    if (!shouldUpdate) {
      return null; // No significant change, skip request
    }

    // Update previous values
    prevParamsRef.current = {
      pulse: debouncedPulse,
      mood,
      userId,
      query: debouncedQuery,
    };

    return {
      pulse: debouncedPulse,
      mood: mood ?? undefined,
      user_id: userId ?? undefined,
      query: debouncedQuery.trim() || undefined,
    };
  }, [debouncedPulse, mood, userId, debouncedQuery]);

  return params;
}