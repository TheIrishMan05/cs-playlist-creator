import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Music, AlertCircle, RefreshCw } from 'lucide-react';
import { Track } from '../types';
import { getRecommendations } from '../api/tracks';
import { useRecommendationParams } from '../hooks/useRecommendationParams';
import { TrackCard } from './TrackCard';
import { useAppState } from '../context/AppState';

export function TrackList() {
  const params = useRecommendationParams();
  const { state, dispatch } = useAppState();
  const { connectionStatus } = state;

  const {
    data: tracks = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<Track[], Error>({
    queryKey: ['recommend', params],
    queryFn: () => getRecommendations(params!),
    enabled: !!params && connectionStatus === 'connected',
    staleTime: 30_000,
    keepPreviousData: true,
    retry: (failureCount, error) => {
      if (error.message.includes('404')) return false;
      return failureCount < 3;
    },
    onError: () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
    },
    onSuccess: () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
    },
  });

  const handleRetry = () => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'unknown' });
    refetch();
  };

  return (
    <div className="bg-neutral-800 rounded-xl p-6 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Music className="h-7 w-7" />
            Recommended Playlist
          </h2>
          <p className="text-neutral-400 mt-1">
            {tracks.length} tracks matching your heart rate {state.pulse} BPM
            {state.mood && ` and ${state.mood} mood`}
            {state.query && ` and search "${state.query}"`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRetry}
            disabled={isRefetching}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg flex items-center gap-2 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Connection banner */}
      {connectionStatus === 'disconnected' && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="flex-1">
            <p className="text-white font-medium">Сервер недоступен, проверьте соединение</p>
            <p className="text-red-300 text-sm">Retrying with exponential backoff...</p>
          </div>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* Feedback banner */}
      {connectionStatus === 'connected' && !isLoading && !isError && (
        <div className="mb-6 p-4 bg-primary-900/30 border border-primary-700 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary-700 rounded-full flex items-center justify-center">
              <Music className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">
                {(() => {
                  const { pulse, mood } = state;
                  if (pulse < 70) return "Your heart rate is calm. Enjoy relaxing tunes.";
                  if (pulse < 100) return "Moderate energy detected. Playing balanced tracks.";
                  if (pulse < 130) return "You're getting active! Here's some upbeat music.";
                  if (pulse >= 130) return "High energy! Let's pump up the volume.";
                  if (mood === 'sad') return "Feeling down? We've selected soothing tracks.";
                  if (mood === 'happy') return "Great mood! Here's some joyful music.";
                  if (mood === 'stressed') return "Stress detected. Let's calm your nerves.";
                  return "We're picking music that matches your vibe.";
                })()}
              </p>
              <p className="text-primary-300 text-sm">
                Playlist updates when your heart rate changes by more than 10 BPM.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-neutral-700/50 rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Failed to load recommendations</h3>
          <p className="text-neutral-400 mb-6">{error?.message || 'Unknown error'}</p>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Track list */}
      {!isLoading && !isError && (
        <div className="space-y-6">
          {tracks.length > 0 ? (
            tracks.map((track) => <TrackCard key={track.id} track={track} />)
          ) : (
            <div className="p-8 text-center border border-dashed border-neutral-700 rounded-xl">
              <Music className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No tracks found</h3>
              <p className="text-neutral-400">
                Adjust your heart rate, mood, or search query to get recommendations.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}