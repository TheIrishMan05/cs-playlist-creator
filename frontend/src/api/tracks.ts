import { Track, FeedbackRequest, FeedbackResponse, RecommendationParams } from '../types';
import { apiGet, apiPost } from './client';

export async function getRecommendations(params: RecommendationParams): Promise<Track[]> {
  const { pulse, mood, user_id, query } = params;
  console.log('getRecommendations called with', params);
  try {
    const result = await apiGet<Track[]>('/api/recommend', {
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
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

export async function sendFeedback(data: FeedbackRequest): Promise<FeedbackResponse> {
  return apiPost<FeedbackResponse>('/api/feedback', data);
}