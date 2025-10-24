import React from 'react';
import { Send } from 'lucide-react';

interface FeedbackSubmitProps {
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

const FeedbackSubmit: React.FC<FeedbackSubmitProps> = ({ isSubmitting, onSubmit }) => {
  return (
    <form onSubmit={onSubmit}>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <Send className="text-white h-4 w-4" />
          )}
          <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
        </button>
      </div>
    </form>
  );
};

export default FeedbackSubmit;