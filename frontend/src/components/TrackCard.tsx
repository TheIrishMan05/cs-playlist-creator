import { Play, Pause, Music, User } from 'lucide-react';
import { Track } from '../types';
import { useAudio } from '../hooks/useAudio';
import { FeedbackRating } from './FeedbackRating';
import { useAppState } from '../context/AppState';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { apiGet, ApiError } from '../api/client';

interface TrackCardProps {
  track: Track;
}

function getProxiedAudioUrl(originalUrl: string | null | undefined): string | null {
  if (!originalUrl) return null;

  if (originalUrl.startsWith('/static/')) {
    return `/api${originalUrl}`;
  }

  return `/api/audio-proxy?url=${encodeURIComponent(originalUrl)}`;
}

export function TrackCard({ track }: TrackCardProps) {
  const trackAudioId = track.id.toString();
  const { play, pause, isPlaying, currentTrackUrl, error } = useAudio(trackAudioId);
  const { state, dispatch } = useAppState();
  const { userId } = state;

  const hasShownErrorRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (error && !hasShownErrorRef.current) {
      if (error.includes('410') || error.includes('expired') || error.includes('unavailable')) {
        toast.error(`Audio preview for "${track.title}" is unavailable.`, {
          duration: 5000,
          id: `deezer-error-${track.id}`,
        });
      } else {
        toast.error(`Failed to play "${track.title}": ${error}`, {
          duration: 4000,
          id: `audio-error-${track.id}`,
        });
      }
      hasShownErrorRef.current = true;
    }
    if (!error && hasShownErrorRef.current) {
      hasShownErrorRef.current = false;
    }
  }, [error, track.title, track.id]);

  const audioUrl = getProxiedAudioUrl(track.preview_url);
  const isCurrentPlaying = audioUrl ? currentTrackUrl === audioUrl && isPlaying : false;

  const startPlayback = (url: string) => {
    play(url, trackAudioId);
    dispatch({ type: 'SET_CURRENT_TRACK', payload: track.id });
    dispatch({ type: 'SET_CURRENT_TRACK_INFO', payload: track });
  };

  const handlePlay = async () => {
    if (isCurrentPlaying) {
      pause();
      return;
    }

    if (!audioUrl && !track.preview_url) {
      toast.error(`No preview available for "${track.title}"`, {
        id: `no-preview-${track.id}`,
      });
      return;
    }

    // Static previews: play immediately without Deezer API
    if (track.preview_url?.startsWith('/static/') && audioUrl) {
      startPlayback(audioUrl);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiGet<{ url: string }>(`/api/track/${track.id}/preview`);
      const proxyUrl = `/api/audio-proxy?url=${encodeURIComponent(response.url)}`;
      startPlayback(proxyUrl);
    } catch (err) {
      if (audioUrl?.includes('/static/')) {
        startPlayback(audioUrl);
        return;
      }

      if (err instanceof ApiError) {
        if (err.status === 404) {
          toast.error(`No preview available for "${track.title}" by ${track.artist}`, {
            id: `no-preview-${track.id}`,
          });
        } else if (err.status === 502) {
          toast.error(`Deezer API error for "${track.title}". Please try again later.`, {
            id: `deezer-api-error-${track.id}`,
          });
        } else {
          toast.error(`Failed to load audio for "${track.title}": ${err.detail}`, {
            id: `fetch-error-${track.id}`,
          });
        }
      } else {
        toast.error(`Failed to load audio for "${track.title}"`, {
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
        <div className="flex-shrink-0">
          <div className="h-24 w-24 bg-gradient-to-br from-primary-700 to-secondary-500 rounded-xl flex items-center justify-center">
            <Music className="h-10 w-10 text-white" />
          </div>
        </div>

        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-white">{track.title}</h3>
              <p className="text-neutral-400 flex items-center gap-2 mt-1">
                <User className="h-4 w-4" />
                {track.artist}
              </p>
              {track.about && (
                <p className="text-sm text-neutral-300 mt-3 leading-relaxed max-h-20 overflow-hidden">
                  {track.about}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              {audioUrl || track.preview_url ? (
                <button
                  onClick={handlePlay}
                  disabled={isLoading}
                  className="h-12 w-12 bg-primary-600 hover:bg-primary-700 rounded-full flex items-center justify-center transition disabled:opacity-70 disabled:cursor-not-allowed"
                  aria-label={isCurrentPlaying ? 'Pause track' : 'Play track'}
                >
                  {isLoading ? (
                    <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

          {userId && (
            <div className="mt-6 pt-6 border-t border-neutral-700">
              <FeedbackRating trackId={track.id} userId={userId} />
            </div>
          )}
        </div>
      </div>

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
          <div className="text-xs text-neutral-400 mb-1">
            {track.semantic_score != null ? 'Semantic' : 'Score'}
          </div>
          <div className="text-lg font-bold text-white">
            {track.score !== null ? track.score.toFixed(3) : '—'}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {track.semantic_score != null
              ? track.has_lyrics
                ? `lyrics: ${track.lyrics_source || 'found'}`
                : 'metadata fallback'
              : 'pulse match'}
          </div>
        </div>
      </div>
    </div>
  );
}
