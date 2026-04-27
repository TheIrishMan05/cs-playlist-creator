import { Track, FeedbackRequest, FeedbackResponse, RecommendationParams } from '../types';
import { apiGet, apiPost } from './client';

export async function getRecommendations(params: RecommendationParams): Promise<Track[]> {
  const { pulse, mood, user_id, query } = params;
  return apiGet<Track[]>('/recommend', {
    pulse,
    mood,
    user_id,
    query,
  });
}

export async function sendFeedback(data: FeedbackRequest): Promise<FeedbackResponse> {
  return apiPost<FeedbackResponse>('/feedback', data);
}