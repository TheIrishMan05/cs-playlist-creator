import { useMemo, useRef } from 'react';
import { useAppState } from '../context/AppState';
import { useDebounce } from './useDebounce';
import { RecommendationParams } from '../types';

const PULSE_DEBOUNCE_MS = 500;
const PULSE_THRESHOLD = 10;

function paramsEqual(a: RecommendationParams, b: RecommendationParams): boolean {
  return (
    a.pulse === b.pulse &&
    a.mood === b.mood &&
    a.user_id === b.user_id &&
    a.query === b.query
  );
}

export function useRecommendationParams(): RecommendationParams {
  const { state } = useAppState();
  const { pulse, mood, userId, query } = state;

  const debouncedQuery = useDebounce(query, 400);
  const debouncedPulse = useDebounce(pulse, PULSE_DEBOUNCE_MS);

  const lastCommittedPulseRef = useRef(debouncedPulse);
  const stableParamsRef = useRef<RecommendationParams>({
    pulse: debouncedPulse,
    mood: undefined,
    user_id: undefined,
    query: undefined,
  });

  return useMemo<RecommendationParams>(() => {
    const delta = Math.abs(debouncedPulse - lastCommittedPulseRef.current);
    if (delta >= PULSE_THRESHOLD) {
      lastCommittedPulseRef.current = debouncedPulse;
    }

    const next: RecommendationParams = {
      pulse: lastCommittedPulseRef.current,
      mood: mood && mood !== 'neutral' ? mood : undefined,
      user_id: userId ?? undefined,
      query: debouncedQuery.trim() || undefined,
    };

    if (!paramsEqual(stableParamsRef.current, next)) {
      stableParamsRef.current = next;
    }

    return stableParamsRef.current;
  }, [debouncedPulse, mood, userId, debouncedQuery]);
}
