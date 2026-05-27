import { useCallback, useSyncExternalStore } from 'react';
import { useAppState } from '../context/AppState';

export interface AudioManagerState {
  currentAudioId: string | null;
  currentTrackUrl: string | null;
  isPlaying: boolean;
  error: string | null;
}

type Listener = () => void;

const EMPTY_SNAPSHOT: AudioManagerState = {
  currentAudioId: null,
  currentTrackUrl: null,
  isPlaying: false,
  error: null,
};

function isSameOriginAudioUrl(url: string): boolean {
  if (url.startsWith('/')) return true;
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

function snapshotsEqual(a: AudioManagerState, b: AudioManagerState): boolean {
  return (
    a.currentAudioId === b.currentAudioId &&
    a.currentTrackUrl === b.currentTrackUrl &&
    a.isPlaying === b.isPlaying &&
    a.error === b.error
  );
}

// Global audio manager with a single shared Audio element
class GlobalAudioManager {
  private static instance: GlobalAudioManager;
  private audioElement: HTMLAudioElement;
  private loadToken = 0;
  private state: AudioManagerState = { ...EMPTY_SNAPSHOT };
  private snapshot: AudioManagerState = { ...EMPTY_SNAPSHOT };
  private listeners = new Set<Listener>();

  private constructor() {
    this.audioElement = document.createElement('audio');
    this.audioElement.preload = 'auto';
    this.audioElement.setAttribute('playsinline', '');
    this.audioElement.style.display = 'none';
    document.body.appendChild(this.audioElement);

    this.audioElement.addEventListener('ended', () => {
      this.patchState({
        isPlaying: false,
        currentAudioId: null,
        currentTrackUrl: null,
        error: null,
      });
    });

    this.audioElement.addEventListener('play', () => {
      this.patchState({ isPlaying: true, error: null });
    });

    this.audioElement.addEventListener('pause', () => {
      this.patchState({ isPlaying: false });
    });

    this.audioElement.addEventListener('error', () => {
      const mediaError = this.audioElement.error;
      const message =
        mediaError?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
          ? 'Audio format not supported or preview unavailable'
          : mediaError?.code === MediaError.MEDIA_ERR_NETWORK
            ? 'Network error while loading audio'
            : 'Failed to play audio preview';
      if (import.meta.env.DEV) {
        console.error('GlobalAudioManager: audio error', mediaError);
      }
      this.patchState({
        isPlaying: false,
        error: message,
      });
    });
  }

  static getInstance(): GlobalAudioManager {
    if (!GlobalAudioManager.instance) {
      GlobalAudioManager.instance = new GlobalAudioManager();
    }
    return GlobalAudioManager.instance;
  }

  private patchState(partial: Partial<AudioManagerState>) {
    const next = { ...this.state, ...partial };
    if (snapshotsEqual(this.state, next)) return;

    this.state = next;
    this.snapshot = next;
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): AudioManagerState {
    return this.snapshot;
  }

  private applyCorsMode(url: string) {
    if (isSameOriginAudioUrl(url)) {
      this.audioElement.removeAttribute('crossorigin');
    } else {
      this.audioElement.crossOrigin = 'anonymous';
    }
  }

  private startPlayback(url: string, audioId: string) {
    this.applyCorsMode(url);

    this.audioElement.src = url;
    this.audioElement.load();
    this.patchState({
      currentTrackUrl: url,
      currentAudioId: audioId,
      error: null,
    });

    void this.audioElement.play().catch((err) => this.handlePlayRejection(err));
  }

  play(url: string, audioId: string) {
    if (this.state.currentTrackUrl === url && this.state.currentAudioId === audioId) {
      if (this.state.isPlaying) {
        this.audioElement.pause();
      } else {
        void this.audioElement.play().catch((err) => this.handlePlayRejection(err));
      }
      return;
    }

    if (this.state.currentAudioId && this.state.currentAudioId !== audioId) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }

    this.startPlayback(url, audioId);
  }

  private handlePlayRejection(err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const name = err instanceof Error ? err.name : '';
    const isNotAllowed =
      name === 'NotAllowedError' || message.toLowerCase().includes('notallowed');
    if (import.meta.env.DEV) {
      console.error('GlobalAudioManager: Play error', err);
    }
    this.patchState({
      isPlaying: false,
      error: isNotAllowed
        ? 'Playback blocked by browser. Click play again or allow sound for this site.'
        : `Play failed: ${message}`,
    });
  }

  pause() {
    this.audioElement.pause();
  }

  stop() {
    this.loadToken += 1;
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    this.audioElement.removeAttribute('src');
    this.audioElement.load();
    this.patchState({
      isPlaying: false,
      currentAudioId: null,
      currentTrackUrl: null,
      error: null,
    });
  }

  getIsPlaying(audioId: string): boolean {
    return this.state.isPlaying && this.state.currentAudioId === audioId;
  }
}

function subscribeToManager(listener: Listener) {
  return GlobalAudioManager.getInstance().subscribe(listener);
}

function getManagerSnapshot(): AudioManagerState {
  return GlobalAudioManager.getInstance().getSnapshot();
}

export function useAudio(trackId?: string) {
  const audioId = trackId ?? null;
  const managerState = useSyncExternalStore(
    subscribeToManager,
    getManagerSnapshot,
    getManagerSnapshot,
  );
  const { dispatch } = useAppState();
  const manager = GlobalAudioManager.getInstance();

  const isActiveTrack = audioId !== null && managerState.currentAudioId === audioId;
  const isPlaying = audioId !== null ? manager.getIsPlaying(audioId) : managerState.isPlaying;
  const currentTrackUrl =
    audioId !== null
      ? isActiveTrack
        ? managerState.currentTrackUrl
        : null
      : managerState.currentTrackUrl;
  const error = isActiveTrack || audioId === null ? managerState.error : null;

  const play = useCallback(
    (url: string, id?: string) => {
      const playId = id ?? audioId ?? 'global';
      try {
        manager.play(url, playId);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('useAudio: Play error', err);
        }
        dispatch({ type: 'SET_CURRENT_TRACK', payload: null });
        dispatch({ type: 'SET_CURRENT_TRACK_INFO', payload: null });
        throw err;
      }
    },
    [manager, audioId, dispatch],
  );

  const pause = useCallback(() => {
    manager.pause();
  }, [manager]);

  const stop = useCallback(() => {
    manager.stop();
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
    currentAudioId: managerState.currentAudioId,
  };
}
