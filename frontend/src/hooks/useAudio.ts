import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppState } from '../context/AppState';

// Global audio manager with a single shared Audio element
class GlobalAudioManager {
  private static instance: GlobalAudioManager;
  private audioElement: HTMLAudioElement;
  private currentAudioId: string | null = null;
  private currentTrackUrl: string | null = null;
  private isPlaying: boolean = false;

  private constructor() {
    this.audioElement = new Audio();
    this.audioElement.preload = 'none';
    this.audioElement.crossOrigin = 'anonymous';
    
    // Set up event listeners
    this.audioElement.addEventListener('ended', () => {
      console.log('GlobalAudioManager: track ended');
      this.isPlaying = false;
      this.currentAudioId = null;
      this.currentTrackUrl = null;
    });
    
    this.audioElement.addEventListener('play', () => {
      console.log('GlobalAudioManager: track started playing');
      this.isPlaying = true;
    });
    
    this.audioElement.addEventListener('pause', () => {
      console.log('GlobalAudioManager: track paused');
      this.isPlaying = false;
    });
    
    this.audioElement.addEventListener('error', (e) => {
      console.error('GlobalAudioManager: audio error:', e);
      this.isPlaying = false;
    });
  }

  static getInstance(): GlobalAudioManager {
    if (!GlobalAudioManager.instance) {
      GlobalAudioManager.instance = new GlobalAudioManager();
    }
    return GlobalAudioManager.instance;
  }

  play(url: string, audioId: string) {
    console.log('GlobalAudioManager: play called', { url, audioId, currentAudioId: this.currentAudioId });
    
    // If same track, toggle play/pause
    if (this.currentTrackUrl === url && this.currentAudioId === audioId) {
      if (this.isPlaying) {
        this.audioElement.pause();
      } else {
        this.audioElement.play().catch(err => console.error('Play error:', err));
      }
      return;
    }
    
    // Stop any currently playing audio
    if (this.currentAudioId && this.currentAudioId !== audioId) {
      console.log('GlobalAudioManager: stopping previous audio');
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    
    // Load new track
    this.audioElement.src = url;
    this.audioElement.load();
    this.currentTrackUrl = url;
    this.currentAudioId = audioId;
    
    // Start playing
    this.audioElement.play().catch(err => {
      console.error('GlobalAudioManager: Play error (new track):', err);
      this.isPlaying = false;
      this.currentAudioId = null;
      this.currentTrackUrl = null;
    });
  }

  pause() {
    this.audioElement.pause();
  }

  stop() {
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    this.audioElement.src = '';
    this.isPlaying = false;
    this.currentAudioId = null;
    this.currentTrackUrl = null;
  }

  getIsPlaying(audioId: string): boolean {
    return this.isPlaying && this.currentAudioId === audioId;
  }

  getCurrentAudioId(): string | null {
    return this.currentAudioId;
  }
}

export function useAudio(id?: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { dispatch } = useAppState();
  const defaultId = useRef(Math.random().toString(36).substring(2)).current;
  const audioId = id || defaultId;
  const manager = GlobalAudioManager.getInstance();

  // Sync playing state with global manager
  useEffect(() => {
    const checkPlaying = () => {
      const currentlyPlaying = manager.getIsPlaying(audioId);
      if (currentlyPlaying !== isPlaying) {
        setIsPlaying(currentlyPlaying);
      }
    };
    
    // Check periodically (crude but works)
    const interval = setInterval(checkPlaying, 500);
    return () => clearInterval(interval);
  }, [manager, isPlaying, audioId]);

  const play = useCallback((url: string) => {
    console.log('useAudio: play called with url:', url, 'audioId:', audioId);
    setError(null);
    
    // Update local state
    setCurrentTrackUrl(url);
    
    // Delegate playback to global manager
    try {
      manager.play(url, audioId);
    } catch (err) {
      console.error('useAudio: Play error:', err);
      setError(`Play failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsPlaying(false);
      dispatch({ type: 'SET_CURRENT_TRACK', payload: null });
      dispatch({ type: 'SET_CURRENT_TRACK_INFO', payload: null });
    }
  }, [manager, audioId, dispatch]);

  const pause = useCallback(() => {
    console.log('useAudio: pause called');
    manager.pause();
  }, [manager]);

  const stop = useCallback(() => {
    console.log('useAudio: stop called');
    manager.stop();
    setIsPlaying(false);
    setCurrentTrackUrl(null);
    // Clear current track from global state
    dispatch({ type: 'SET_CURRENT_TRACK', payload: null });
    dispatch({ type: 'SET_CURRENT_TRACK_INFO', payload: null });
  }, [manager, dispatch]);

  return {
    play,
    pause,
    stop,
    isPlaying,
    currentTrackUrl,
    error,
  };
}