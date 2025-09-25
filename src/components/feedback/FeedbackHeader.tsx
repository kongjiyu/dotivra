import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface FeedbackHeaderProps {
  onBack: () => void;
}

const FeedbackHeader: React.FC<FeedbackHeaderProps> = ({ onBack }) => {
  return (
    <div className="mb-8">
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors mb-4"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Dashboard</span>
      </button>
      <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
    </div>
  );
};

export default FeedbackHeader;