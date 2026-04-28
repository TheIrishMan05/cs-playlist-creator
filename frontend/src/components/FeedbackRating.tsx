import { useState } from 'react';
import { Star } from 'lucide-react';
import { sendFeedback } from '../api/tracks';
import toast from 'react-hot-toast';

interface FeedbackRatingProps {
  trackId: number;
  userId: number;
}

export function FeedbackRating({ trackId, userId }: FeedbackRatingProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingClick = async (newRating: number) => {
    if (isSubmitting) return;
    const previousRating = rating;
    setRating(newRating);
    setIsSubmitting(true);

    try {
      await sendFeedback({ user_id: userId, track_id: trackId, rating: newRating });
      toast.success('Feedback saved! Your preference vector has been updated.', {
        duration: 3000,
        position: 'bottom-right',
      });
    } catch (error) {
      setRating(previousRating);
      toast.error('Failed to submit feedback. Please try again.', {
        duration: 4000,
        position: 'bottom-right',
      });
      console.error('Feedback error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-neutral-300 text-sm">Rate this track:</span>
        <span className="text-xs text-neutral-500">(1–5 stars)</span>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRatingClick(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(null)}
            disabled={isSubmitting}
            className="p-1 transition-transform hover:scale-110 disabled:opacity-50"
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              className={`h-7 w-7 ${
                (hoverRating ?? rating ?? 0) >= star
                  ? 'fill-yellow-500 stroke-yellow-500'
                  : 'fill-neutral-800 stroke-neutral-500'
              }`}
            />
          </button>
        ))}
      </div>
      <div className="text-xs text-neutral-500">
        {rating
          ? `You rated ${rating} star${rating > 1 ? 's' : ''}. This influences future recommendations.`
          : 'Click a star to submit your preference.'}
      </div>
    </div>
  );
}