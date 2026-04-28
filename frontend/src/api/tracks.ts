import { Track, FeedbackRequest, FeedbackResponse, RecommendationParams } from '../types';
import { apiGet, apiPost } from './client';

export async function getRecommendations(params: RecommendationParams): Promise<Track[]> {
  const { pulse, mood, user_id, query } = params;
  console.log('getRecommendations called with', params);
  try {
    const result = await apiGet<Track[]>('/recommend', {
      pulse,
      mood,
      user_id,
      query,
    });
    console.log('getRecommendations result length', result.length);
    console.log('getRecommendations result first', result[0]);
    console.log('getRecommendations result', result);
    return result;
  } catch (error) {
    console.error('getRecommendations error', error);
    throw error;
  }
}

export async function sendFeedback(data: FeedbackRequest): Promise<FeedbackResponse> {
  return apiPost<FeedbackResponse>('/feedback', data);
}