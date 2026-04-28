import { Play, Pause, Music, User } from 'lucide-react';
import { Track } from '../types';
import { useAudio } from '../hooks/useAudio';
import { FeedbackRating } from './FeedbackRating';
import { useAppState } from '../context/AppState';

interface TrackCardProps {
  track: Track;
}

export function TrackCard({ track }: TrackCardProps) {
  const { play, isPlaying, currentTrackUrl } = useAudio();
  const { state, dispatch } = useAppState();
  const { userId } = state;

  // Build a proxied audio URL that goes through our backend to avoid CORS issues
  const getProxiedAudioUrl = (originalUrl: string | null | undefined): string | null => {
    console.log('getProxiedAudioUrl called with:', originalUrl, 'track.id:', track.id);
    // If no preview URL, return null - no fallback to SoundHelix
    if (!originalUrl) {
      console.log('No preview URL available for track:', track.id);
      return null;
    }
    
    // Use the original URL (Deezer or other sources)
    const proxyUrl = `/api/audio-proxy?url=${encodeURIComponent(originalUrl)}`;
    console.log('Using proxy for audio URL:', proxyUrl);
    return proxyUrl;
  };
  
  const audioUrl = getProxiedAudioUrl(track.preview_url);
  console.log('TrackCard rendered, track.id:', track.id, 'audioUrl:', audioUrl, 'preview_url:', track.preview_url);
  const isCurrentPlaying = audioUrl ? currentTrackUrl === audioUrl && isPlaying : false;

  const handlePlay = () => {
    console.log('TrackCard handlePlay, audioUrl:', audioUrl, 'trackId:', track.id, 'isCurrentPlaying:', isCurrentPlaying, 'preview_url:', track.preview_url);
    
    if (!audioUrl) {
      console.error('No audio URL available for track:', track.id, track.title);
      // Можно показать уведомление пользователю
      alert(`No audio preview available for "${track.title}" by ${track.artist}`);
      return;
    }
    
    // Log the constructed URL for debugging
    console.log('TrackCard: Constructed proxy URL:', audioUrl);
    
    play(audioUrl);
    // Update global state with current track ID and track info
    dispatch({ type: 'SET_CURRENT_TRACK', payload: track.id });
    dispatch({ type: 'SET_CURRENT_TRACK_INFO', payload: track });
  };

  return (
    <div className="bg-neutral-800 rounded-xl p-5 border border-neutral-700 hover:border-neutral-600 transition-all duration-200">
      <div className="flex flex-col md:flex-row md:items-center gap-5">
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
                  className="h-12 w-12 bg-primary-600 hover:bg-primary-700 rounded-full flex items-center justify-center transition"
                  aria-label={isCurrentPlaying ? 'Pause track' : 'Play track'}
                >
                  {isCurrentPlaying ? (
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

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-neutral-900/50 p-3 rounded-lg">
              <div className="text-sm text-neutral-400">BPM</div>
              <div className="text-2xl font-bold text-white">{track.bpm.toFixed(1)}</div>
            </div>
            <div className="bg-neutral-900/50 p-3 rounded-lg">
              <div className="text-sm text-neutral-400">Energy</div>
              <div className="text-2xl font-bold text-white">{track.energy.toFixed(2)}</div>
            </div>
            <div className="bg-neutral-900/50 p-3 rounded-lg">
              <div className="text-sm text-neutral-400">Valence</div>
              <div className="text-2xl font-bold text-white">{track.valence.toFixed(2)}</div>
            </div>
            <div className="bg-neutral-900/50 p-3 rounded-lg">
              <div className="text-sm text-neutral-400">Score</div>
              <div className="text-2xl font-bold text-white">
                {track.score !== null ? track.score.toFixed(3) : '—'}
              </div>
              <div className="text-xs text-neutral-500">
                {track.score !== null ? 'cosine similarity' : 'hidden (search active)'}
              </div>
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
    </div>
  );
}