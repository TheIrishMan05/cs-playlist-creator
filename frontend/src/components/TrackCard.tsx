import { Play, Pause, Music, User } from 'lucide-react';
import { Track } from '../types';
import { useAudio } from '../hooks/useAudio';
import { FeedbackRating } from './FeedbackRating';
import { useAppState } from '../context/AppState';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { apiGet } from '../api/client';

interface TrackCardProps {
  track: Track;
}

export function TrackCard({ track }: TrackCardProps) {
  const { play, isPlaying, currentTrackUrl, error } = useAudio(track.id.toString());
  const { state, dispatch } = useAppState();
  const { userId } = state;

  // Track if we've already shown a toast for this track's error
  const hasShownErrorRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  // Show toast when audio error occurs (only once per track)
  useEffect(() => {
    if (error && !hasShownErrorRef.current) {
      console.error('TrackCard: Audio error detected:', error);
      // Check if it's an expired Deezer URL error
      if (error.includes('410') || error.includes('expired') || error.includes('Deezer')) {
        toast.error(`Audio preview for "${track.title}" is unavailable. Deezer preview URLs have IP restrictions.`, {
          duration: 5000,
          id: `deezer-error-${track.id}`, // Unique ID to prevent duplicate toasts
        });
      } else {
        toast.error(`Failed to play "${track.title}": ${error}`, {
          duration: 4000,
          id: `audio-error-${track.id}`, // Unique ID to prevent duplicate toasts
        });
      }
      hasShownErrorRef.current = true;
      
      // Reset after error is cleared (when user tries to play again)
      // We'll reset the ref when error becomes null/undefined
    }
    
    // Reset the flag when error is cleared
    if (!error && hasShownErrorRef.current) {
      hasShownErrorRef.current = false;
    }
  }, [error, track.title, track.id]);

  // Build a proxied audio URL that goes through our backend to avoid CORS issues
  const getProxiedAudioUrl = (originalUrl: string | null | undefined): string | null => {
    console.log('getProxiedAudioUrl called with:', originalUrl, 'track.id:', track.id);
    // If no preview URL, return null - no fallback to SoundHelix
    if (!originalUrl) {
      console.log('No preview URL available for track:', track.id);
      return null;
    }
    
    // Check if it's a local static URL (starts with /static/)
    // These URLs are served directly by our backend and don't need the audio proxy
    if (originalUrl.startsWith('/static/')) {
      console.log('Local static URL detected for track:', track.id, 'URL:', originalUrl);
      // The frontend accesses backend via /api prefix (nginx proxy)
      // So we need to prepend /api to the static URL
      return `/api${originalUrl}`;
    }
    
    // Check if it's a Deezer URL (contains deezer.com or dzcdn.net)
    // Deezer preview URLs are time-limited and IP-bound, making them unreliable
    // for our audio proxy. But we'll still try to use the proxy so users can
    // attempt to play and see the error message.
    const isDeezerUrl = originalUrl.includes('deezer.com') || originalUrl.includes('dzcdn.net');
    if (isDeezerUrl) {
      console.log('Deezer URL detected for track:', track.id, 'Will try proxy but likely will fail due to IP restrictions');
    }
    
    // For all other URLs (including Deezer), use the audio proxy
    // Let the backend handle the Deezer restriction and return proper error
    const proxyUrl = `/api/audio-proxy?url=${encodeURIComponent(originalUrl)}`;
    console.log('Using proxy for audio URL:', proxyUrl);
    return proxyUrl;
  };
  
  const audioUrl = getProxiedAudioUrl(track.preview_url);
  console.log('TrackCard rendered, track.id:', track.id, 'audioUrl:', audioUrl, 'preview_url:', track.preview_url);
  const isCurrentPlaying = audioUrl ? currentTrackUrl === audioUrl && isPlaying : false;

  const handlePlay = async () => {
    console.log('TrackCard handlePlay, trackId:', track.id, 'preview_url:', track.preview_url);
    
    // Always try to fetch a fresh preview URL from Deezer API first.
    // This ensures we get a fresh, IP-bound URL that should work.
    setIsLoading(true);
    try {
      console.log('Fetching fresh preview for track', track.id);
      const response = await apiGet<{ url: string }>(`/api/track/${track.id}/preview`);
      const freshUrl = response.url;
      console.log('Fresh preview URL received:', freshUrl);
      
      // Construct proxy URL for the fresh Deezer URL
      const proxyUrl = `/api/audio-proxy?url=${encodeURIComponent(freshUrl)}`;
      console.log('Using proxy for fresh URL:', proxyUrl);
      
      // Play the audio via proxy
      play(proxyUrl);
      
      // Update global state with current track ID and track info
      dispatch({ type: 'SET_CURRENT_TRACK', payload: track.id });
      dispatch({ type: 'SET_CURRENT_TRACK_INFO', payload: track });
    } catch (error: any) {
      console.error('Failed to fetch fresh preview:', error);
      
      // If Deezer API fails, fall back to the existing audioUrl (if it's a local static URL)
      if (audioUrl && audioUrl.includes('/static/')) {
        console.log('Falling back to local static audio URL:', audioUrl);
        play(audioUrl);
        dispatch({ type: 'SET_CURRENT_TRACK', payload: track.id });
        dispatch({ type: 'SET_CURRENT_TRACK_INFO', payload: track });
        return;
      }
      
      // Show appropriate error message
      if (error?.status === 404) {
        toast.error(`No preview available for "${track.title}" by ${track.artist}`, {
          duration: 4000,
          id: `no-preview-${track.id}`,
        });
      } else if (error?.status === 502) {
        toast.error(`Deezer API error for "${track.title}". Please try again later.`, {
          duration: 5000,
          id: `deezer-api-error-${track.id}`,
        });
      } else {
        toast.error(`Failed to load audio for "${track.title}": ${error?.message || 'Unknown error'}`, {
          duration: 5000,
          id: `fetch-error-${track.id}`,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-neutral-800 rounded-xl p-5 border border-neutral-700 hover:border-neutral-600 transition-all duration-200">
      <div className="flex flex-col md:flex-row md:items-start gap-5">
        {/* Album art placeholder */}
        <div className="flex-shrink-0">
          <div className="h-24 w-24 bg-gradient-to-br from-primary-700 to-secondary-500 rounded-xl flex items-center justify-center">
            <Music className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Track info */}
        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-white">{track.title}</h3>
              <p className="text-neutral-400 flex items-center gap-2 mt-1">
                <User className="h-4 w-4" />
                {track.artist}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {audioUrl ? (
                <button
                  onClick={handlePlay}
                  disabled={isLoading}
                  className="h-12 w-12 bg-primary-600 hover:bg-primary-700 rounded-full flex items-center justify-center transition disabled:opacity-70 disabled:cursor-not-allowed"
                  aria-label={isCurrentPlaying ? 'Pause track' : 'Play track'}
                >
                  {isLoading ? (
                    <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : isCurrentPlaying ? (
                    <Pause className="h-6 w-6 text-white" />
                  ) : (
                    <Play className="h-6 w-6 text-white" />
                  )}
                </button>
              ) : (
                <div className="relative group">
                  <button
                    disabled
                    className="h-12 w-12 bg-neutral-700 rounded-full flex items-center justify-center cursor-not-allowed"
                    aria-label="No audio preview available"
                    title="No audio preview available"
                  >
                    <Music className="h-6 w-6 text-neutral-400" />
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-800 text-neutral-300 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    No audio preview
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback */}
          {userId && (
            <div className="mt-6 pt-6 border-t border-neutral-700">
              <FeedbackRating trackId={track.id} userId={userId} />
            </div>
          )}
        </div>
      </div>

      {/* Metrics - Now spans full width of the card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6">
        <div className="bg-neutral-900/50 p-2 rounded-lg">
          <div className="text-xs text-neutral-400 mb-1">BPM</div>
          <div className="text-lg font-bold text-white">{track.bpm.toFixed(1)}</div>
        </div>
        <div className="bg-neutral-900/50 p-2 rounded-lg">
          <div className="text-xs text-neutral-400 mb-1">Energy</div>
          <div className="text-lg font-bold text-white">{track.energy.toFixed(2)}</div>
        </div>
        <div className="bg-neutral-900/50 p-2 rounded-lg">
          <div className="text-xs text-neutral-400 mb-1">Valence</div>
          <div className="text-lg font-bold text-white">{track.valence.toFixed(2)}</div>
        </div>
        <div className="bg-neutral-900/50 p-2 rounded-lg">
          <div className="text-xs text-neutral-400 mb-1">Score</div>
          <div className="text-lg font-bold text-white">
            {track.score !== null ? track.score.toFixed(3) : '—'}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {track.score !== null ? 'cosine similarity' : 'hidden (search active)'}
          </div>
        </div>
      </div>
    </div>
  );
}
