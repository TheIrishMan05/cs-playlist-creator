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

    // New track: stop previous, load new
    console.log('useAudio: new track, loading...');
    audioRef.current.pause();
    audioRef.current.src = url;
    audioRef.current.load();
    setCurrentTrackUrl(url);
    setIsPlaying(true); // Assume it will start playing
    
    // Add a small delay to ensure audio is loaded before playing
    // This helps with browser autoplay policies
    setTimeout(() => {
      if (audioRef.current) {
        console.log('useAudio: attempting to play audio');
        audioRef.current.play().catch((err) => {
          console.error('useAudio: Play error (new track):', err);
          console.error('useAudio: Error details:', err.name, err.message);
          setError(`Play failed: ${err.message}. URL: ${url}`);
          setIsPlaying(false); // If play fails, set to false
        });
      } else {
        console.error('useAudio: audioRef.current is null in setTimeout');
        setIsPlaying(false);
      }
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