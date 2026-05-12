import { useMemo, useRef, useEffect } from 'react';
import { useAppState } from '../context/AppState';
import { useDebounce } from './useDebounce';
import { RecommendationParams } from '../types';

// No threshold - update immediately on any pulse change
const PULSE_DEBOUNCE_MS = 500; // Small debounce to avoid excessive API calls

export function useRecommendationParams() {
  const { state } = useAppState();
  const { pulse, mood, userId, query, currentTrackId } = state;

  const debouncedQuery = useDebounce(query, 400);
  
  // Store the last pulse used for recommendations
  const lastPulseRef = useRef(pulse);
  
  // Small debounce for pulse to avoid rapid API calls during slider drag
  const debouncedPulse = useDebounce(pulse, PULSE_DEBOUNCE_MS);
  
  // Check if a track is currently selected (playing or paused)
  const hasCurrentTrack = currentTrackId !== null;
  
  // Debug logging
  useEffect(() => {
    console.log('useRecommendationParams debug:', {
      currentPulse: pulse,
      debouncedPulse,
      lastPulse: lastPulseRef.current,
      hasCurrentTrack,
      currentTrackId
    });
  }, [pulse, debouncedPulse, hasCurrentTrack, currentTrackId]);
  
  const params = useMemo<RecommendationParams>(() => {
    const pulseToUse = debouncedPulse;
    
    // Always update lastPulseRef to current pulse
    lastPulseRef.current = pulseToUse;
    
    const result = {
      pulse: pulseToUse,
      mood: mood ?? undefined,
      user_id: userId ?? undefined,
      query: debouncedQuery.trim() || undefined,
    };
    
    console.log('Recommendation params:', result);
    return result;
  }, [debouncedPulse, mood, userId, debouncedQuery]);

  return params;
}