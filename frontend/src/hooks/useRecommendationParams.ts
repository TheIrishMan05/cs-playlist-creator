import { useMemo } from 'react';
import { useAppState } from '../context/AppState';
import { useDebounce } from './useDebounce';
import { RecommendationParams } from '../types';

export function useRecommendationParams() {
  const { state } = useAppState();
  const { pulse, mood, userId, query } = state;

  const debouncedQuery = useDebounce(query, 400);
  // Use pulse directly without debouncing to avoid UI mismatch
  const currentPulse = pulse;

  const params = useMemo<RecommendationParams>(() => {
    return {
      pulse: currentPulse,
      mood: mood ?? undefined,
      user_id: userId ?? undefined,
      query: debouncedQuery.trim() || undefined,
    };
  }, [currentPulse, mood, userId, debouncedQuery]);

  return params;
}