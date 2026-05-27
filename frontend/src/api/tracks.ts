import { Track, FeedbackRequest, FeedbackResponse, RecommendationParams } from '../types';
import { apiGet, apiPost } from './client';

export async function getRecommendations(params: RecommendationParams): Promise<Track[]> {
  const { pulse, mood, user_id, query } = params;
  const result = await apiGet<Track[]>('/api/recommend', {
    pulse,
    mood,
    user_id,
    query,
  });
  if (!Array.isArray(result)) {
    throw new Error('Invalid recommendations response: expected an array');
  }
  return result;
}

export async function sendFeedback(data: FeedbackRequest): Promise<FeedbackResponse> {
  return apiPost<FeedbackResponse>('/api/feedback', data);
}
