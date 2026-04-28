import { useEffect, useRef, useState, useCallback } from 'react';

// Global reference to track the currently playing audio instance
// This ensures only one track plays at a time across all instances
let globalCurrentlyPlayingAudio: HTMLAudioElement | null = null;

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = 'none';
    audioRef.current.crossOrigin = 'anonymous';

    const handleEnded = () => {
      console.log('useAudio: track ended');
      setIsPlaying(false);
      if (globalCurrentlyPlayingAudio === audioRef.current) {
        globalCurrentlyPlayingAudio = null;
      }
    };
    
    const handlePlay = () => {
      console.log('useAudio: track started playing');
      setIsPlaying(true);
      // Set this as the globally playing audio
      globalCurrentlyPlayingAudio = audioRef.current;
    };
    
    const handlePause = () => {
      console.log('useAudio: track paused');
      setIsPlaying(false);
      // If this audio was the globally playing one and it's paused, clear it
      if (globalCurrentlyPlayingAudio === audioRef.current) {
        globalCurrentlyPlayingAudio = null;
      }
    };
    
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setError(`Audio playback error: ${audioRef.current?.error?.message || 'Unknown error'}`);
      setIsPlaying(false);
      if (globalCurrentlyPlayingAudio === audioRef.current) {
        globalCurrentlyPlayingAudio = null;
      }
    };

    const audio = audioRef.current;
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      console.log('useAudio: cleaning up audio instance');
      audio.pause();
      if (globalCurrentlyPlayingAudio === audio) {
        globalCurrentlyPlayingAudio = null;
      }
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const play = useCallback((url: string) => {
    console.log('useAudio: play called with url:', url);
    if (!audioRef.current) {
      console.error('useAudio: audioRef.current is null');
      return;
    }
    setError(null);

    // If same track, toggle play/pause
    if (currentTrackUrl === url) {
      console.log('useAudio: same track, isPlaying:', isPlaying);
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((err) => {
          console.error('useAudio: Play error (same track):', err);
          setError(`Play failed: ${err.message}`);
        });
      }
      return;
    }

    // New track: ensure any other globally playing audio is stopped
    console.log('useAudio: new track, stopping any other playing audio');
    if (globalCurrentlyPlayingAudio && globalCurrentlyPlayingAudio !== audioRef.current) {
      console.log('useAudio: stopping other audio instance');
      globalCurrentlyPlayingAudio.pause();
      globalCurrentlyPlayingAudio.currentTime = 0;
      // Don't set globalCurrentlyPlayingAudio to null here because
      // we'll set it to the new audio in the play event handler
    }

    // Load and play the new track
    console.log('useAudio: loading new track...');
    audioRef.current.pause();
    audioRef.current.src = url;
    audioRef.current.load();
    setCurrentTrackUrl(url);
    
    // Use a more reliable approach for playing audio
    const attemptPlay = () => {
      if (!audioRef.current) {
        console.error('useAudio: audioRef.current is null in attemptPlay');
        setIsPlaying(false);
        return;
      }
      
      console.log('useAudio: attempting to play audio');
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('useAudio: play succeeded');
            // The play event handler will set isPlaying and globalCurrentlyPlayingAudio
          })
          .catch((err) => {
            console.error('useAudio: Play error (new track):', err);
            console.error('useAudio: Error details:', err.name, err.message);
            setError(`Play failed: ${err.message}. URL: ${url}`);
            setIsPlaying(false);
            if (globalCurrentlyPlayingAudio === audioRef.current) {
              globalCurrentlyPlayingAudio = null;
            }
          });
      }
    };
    
    // Try to play immediately, but if it fails due to autoplay policy,
    // the error will be caught and logged
    attemptPlay();
  }, [currentTrackUrl, isPlaying]);

  const pause = useCallback(() => {
    console.log('useAudio: pause called');
    audioRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    console.log('useAudio: stop called');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      if (globalCurrentlyPlayingAudio === audioRef.current) {
        globalCurrentlyPlayingAudio = null;
      }
    }
  }, []);

  return {
    play,
    pause,
    stop,
    isPlaying,
    currentTrackUrl,
    error,
  };
}