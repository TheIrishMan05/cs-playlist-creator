import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Music, AlertCircle, RefreshCw } from 'lucide-react';
import { Track, Mood } from '../types';
import { getRecommendations } from '../api/tracks';
import { useRecommendationParams } from '../hooks/useRecommendationParams';
import { TrackCard } from './TrackCard';
import { useAppState } from '../context/AppState';

function getFeedbackBannerMessage(pulse: number, mood: Mood | null): string {
  if (mood === 'sad') return "Feeling down? We've selected soothing tracks.";
  if (mood === 'happy') return "Great mood! Here's some joyful music.";
  if (mood === 'stressed') return "Stress detected. Let's calm your nerves.";
  if (pulse < 70) return 'Your heart rate is calm. Enjoy relaxing tunes.';
  if (pulse < 100) return 'Moderate energy detected. Playing balanced tracks.';
  if (pulse < 130) return "You're getting active! Here's some upbeat music.";
  return "High energy! Let's pump up the volume.";
}

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
    isFetched,
  } = useQuery<Track[], Error>({
    queryKey: ['recommend', params],
    queryFn: () => getRecommendations(params),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    retry: (failureCount, err) => {
      if (err.message.includes('404')) return false;
      return failureCount < 3;
    },
  });

  const trackList = tracks;

  const displayTracks = useMemo(() => {
    const currentTrack = state.currentTrack;
    if (!currentTrack) return trackList;

    const isAlreadyInList = trackList.some((t) => t.id === currentTrack.id);
    if (isAlreadyInList) return trackList;

    return [currentTrack, ...trackList];
  }, [trackList, state.currentTrack]);

  useEffect(() => {
    if (isError) {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
    } else if (isFetched && !isLoading) {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
    }
  }, [isError, isLoading, isFetched, dispatch]);

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
            Generated Playlist
          </h2>
          <p className="text-neutral-400 mt-1">
            {trackList.length} tracks matching your heart rate {state.pulse} BPM
            {state.mood && ` and ${state.mood} mood`}
            {state.query && ` and request "${state.query}"`}
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

      {connectionStatus === 'connected' && !isLoading && !isError && (
        <div className="mb-6 p-4 bg-primary-900/30 border border-primary-700 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary-700 rounded-full flex items-center justify-center">
              <Music className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">
                {getFeedbackBannerMessage(state.pulse, state.mood)}
              </p>
              <p className="text-primary-300 text-sm">
                Playlist updates when your heart rate changes by more than 10 BPM.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 bg-neutral-700/50 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

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

      {!isLoading && !isError && (
        <div className="lg:max-h-[calc(100vh-320px)] lg:overflow-y-auto lg:overflow-x-hidden lg:pr-2 lg:scrollbar-thin lg:scrollbar-thumb-neutral-600 lg:scrollbar-track-neutral-800">
          <div className="space-y-6">
            {displayTracks.length > 0 ? (
              displayTracks.map((track) => <TrackCard key={track.id} track={track} />)
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
        </div>
      )}
    </div>
  );
}
