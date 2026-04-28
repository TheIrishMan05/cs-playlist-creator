import { Play, Pause, SkipBack, SkipForward, Volume2, AlertCircle } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import { useAppState } from '../context/AppState';

export function AudioPlayer() {
  const { play, pause, stop, isPlaying, currentTrackUrl, error } = useAudio();
  const { state } = useAppState();
  const { currentTrackId } = state;

  // Mock track info based on currentTrackId
  const trackTitle = currentTrackId
    ? `Track #${currentTrackId}`
    : 'No track selected';
  const artist = currentTrackId
    ? 'Artist'
    : 'Select a track to play';

  const handlePlayPause = () => {
    if (!currentTrackUrl) return;
    if (isPlaying) {
      pause();
    } else {
      play(currentTrackUrl);
    }
  };

  const handleStop = () => {
    stop();
  };

  const handlePrevious = () => {
    // In a real app, you'd navigate to previous track in playlist
    console.log('Previous track');
  };

  const handleNext = () => {
    console.log('Next track');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 p-4 z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Track info */}
          <div className="flex items-center gap-4 flex-1">
            <div className="h-14 w-14 bg-gradient-to-br from-primary-600 to-secondary-500 rounded-lg flex items-center justify-center">
              <Volume2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">{trackTitle}</h3>
              <p className="text-neutral-400 text-sm">{artist}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            <button
              onClick={handlePrevious}
              className="text-neutral-400 hover:text-white transition"
              aria-label="Previous track"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={handlePlayPause}
              disabled={!currentTrackUrl}
              className="h-12 w-12 bg-primary-600 hover:bg-primary-700 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 text-white" />
              ) : (
                <Play className="h-6 w-6 text-white" />
              )}
            </button>
            <button
              onClick={handleStop}
              disabled={!currentTrackUrl}
              className="text-neutral-400 hover:text-white transition disabled:opacity-50"
              aria-label="Stop"
            >
              <div className="h-8 w-8 bg-neutral-700 rounded-full flex items-center justify-center">
                <div className="h-3 w-3 bg-white rounded-sm"></div>
              </div>
            </button>
            <button
              onClick={handleNext}
              className="text-neutral-400 hover:text-white transition"
              aria-label="Next track"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          {/* Volume & progress (simplified) */}
          <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="hidden md:block w-48">
              <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full"
                  style={{ width: '30%' }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-neutral-500 mt-1">
                <span>1:23</span>
                <span>4:56</span>
              </div>
            </div>
            <button className="text-neutral-400 hover:text-white">
              <Volume2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-4 text-center">
          {error ? (
            <div className="text-xs text-red-400 bg-red-900/30 p-2 rounded-md flex items-center justify-center gap-2">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          ) : (
            <div className="text-xs text-neutral-500">
              {currentTrackUrl
                ? isPlaying
                  ? 'Playing...'
                  : 'Paused'
                : 'Audio player idle'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}