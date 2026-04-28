import { useEffect, useRef, useState, useCallback } from 'react';

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = 'none';
    audioRef.current.crossOrigin = 'anonymous';

    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setError(`Audio playback error: ${audioRef.current?.error?.message || 'Unknown error'}`);
      setIsPlaying(false);
    };

    const audio = audioRef.current;
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const play = useCallback((url: string) => {
    if (!audioRef.current) return;
    setError(null);

    // If same track, toggle play/pause
    if (currentTrackUrl === url) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch((err) => {
          console.error('Play error:', err);
          setError(`Play failed: ${err.message}`);
        });
      }
      return;
    }

    // New track: stop previous, load new
    audioRef.current.pause();
    audioRef.current.src = url;
    audioRef.current.load();
    setCurrentTrackUrl(url);
    
    // Add a small delay to ensure audio is loaded
    setTimeout(() => {
      audioRef.current?.play().catch((err) => {
        console.error('Play error:', err);
        setError(`Play failed: ${err.message}. URL: ${url}`);
      });
    }, 100);
  }, [currentTrackUrl, isPlaying]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
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