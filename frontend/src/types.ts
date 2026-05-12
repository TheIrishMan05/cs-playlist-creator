export interface Track {
  id: number;
  title: string;
  artist: string;
  bpm: number;
  energy: number;
  valence: number;
  score: number | null; // null when query is used
  preview_url?: string | null;
}

export interface FeedbackRequest {
  user_id: number;
  track_id: number;
  rating: number;
}

export interface FeedbackResponse {
  status: string;
  message: string;
}

export interface RecommendationParams {
  pulse: number;
  mood?: string;
  user_id?: number;
  query?: string;
}

export type Mood = 'sad' | 'neutral' | 'happy' | 'stressed';

export const moodMap: Record<string, Mood> = {
  '😞': 'sad',
  '😐': 'neutral',
  '😊': 'happy',
  '🔥': 'stressed',
};

export const moodLabels: Record<Mood, string> = {
  sad: 'Sad',
  neutral: 'Neutral',
  happy: 'Happy',
  stressed: 'Stressed',
};

export const moodOptions: { emoji: string; label: string; value: Mood | null }[] = [
  { emoji: '😞', label: 'Sad', value: 'sad' },
  { emoji: '😐', label: 'Neutral', value: 'neutral' },
  { emoji: '😊', label: 'Happy', value: 'happy' },
  { emoji: '🔥', label: 'Stressed', value: 'stressed' },
];