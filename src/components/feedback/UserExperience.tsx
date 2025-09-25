import React from 'react';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';

interface UserExperienceData {
  overallRating: number;
  easeOfUse: number;
  performance: number;
  design: number;
  wouldRecommend: boolean;
  improvements: string;
}

interface UserExperienceProps {
  data: UserExperienceData;
  onChange: (data: Partial<UserExperienceData>) => void;
}

const UserExperience: React.FC<UserExperienceProps> = ({ data, onChange }) => {
  const renderStarRating = (value: number, onChange: (rating: number) => void, label: string) => {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                className={`p-1 rounded transition-colors ${
                  star <= value
                    ? 'text-yellow-400 hover:text-yellow-500'
                    : 'text-gray-300 hover:text-gray-400'
                }`}
              >
                <Star className={`h-6 w-6 ${
                  star <= value ? 'fill-current' : ''
                }`} />
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-600 min-w-[80px]">
            {value === 1 && 'Poor'}
            {value === 2 && 'Fair'}
            {value === 3 && 'Good'}
            {value === 4 && 'Very Good'}
            {value === 5 && 'Excellent'}
          </span>
        </div>
      </div>
    );
  };

  const ratingCategories = [
    {
      key: 'overallRating' as keyof UserExperienceData,
      label: 'Overall Experience',
      description: 'How satisfied are you with the platform overall?'
    },
    {
      key: 'easeOfUse' as keyof UserExperienceData,
      label: 'Ease of Use',
      description: 'How easy is it to navigate and accomplish your goals?'
    },
    {
      key: 'performance' as keyof UserExperienceData,
      label: 'Performance',
      description: 'How fast and responsive does the platform feel?'
    },
    {
      key: 'design' as keyof UserExperienceData,
      label: 'Design & Interface',
      description: 'How do you rate the visual design and user interface?'
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          User Experience Rating
        </h3>
        <p className="text-gray-600 mb-6">
          Help us understand your experience by rating different aspects of the platform.
        </p>
      </div>

      {/* Rating Categories */}
      <div className="space-y-6">
        {ratingCategories.map((category) => (
          <div key={category.key} className="bg-gray-50 rounded-lg p-4">
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-900">{category.label}</h4>
              <p className="text-xs text-gray-600 mt-1">{category.description}</p>
            </div>
            {renderStarRating(
              data[category.key] as number,
              (rating) => onChange({ [category.key]: rating }),
              ''
            )}
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Would you recommend this platform to others?
        </label>
        <div className="flex space-x-4">
          <label className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
            data.wouldRecommend
              ? 'bg-green-50 border-green-500 text-green-700'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              checked={data.wouldRecommend === true}
              onChange={() => onChange({ wouldRecommend: true })}
              className="sr-only"
            />
            <ThumbsUp className="h-5 w-5" />
            <div>
              <div className="font-medium">Yes, I would recommend</div>
              <div className="text-sm opacity-75">This platform meets my needs</div>
            </div>
          </label>
          
          <label className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
            data.wouldRecommend === false
              ? 'bg-red-50 border-red-500 text-red-700'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              checked={data.wouldRecommend === false}
              onChange={() => onChange({ wouldRecommend: false })}
              className="sr-only"
            />
            <ThumbsDown className="h-5 w-5" />
            <div>
              <div className="font-medium">No, I would not recommend</div>
              <div className="text-sm opacity-75">It needs significant improvements</div>
            </div>
          </label>
        </div>
      </div>

      {/* Improvements */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What improvements would make the biggest difference?
        </label>
        <textarea
          value={data.improvements}
          onChange={(e) => onChange({ improvements: e.target.value })}
          placeholder="Share specific suggestions for improvements, missing features, or changes that would enhance your experience..."
          rows={5}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
        <p className="mt-2 text-sm text-gray-500">
          Optional but very helpful for our product development
        </p>
      </div>

      {/* Rating Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">Your Rating Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {ratingCategories.map((category) => {
            const rating = data[category.key] as number;
            return (
              <div key={category.key} className="text-center">
                <div className="text-blue-800 font-medium">{category.label}</div>
                <div className="flex items-center justify-center mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-xs text-blue-700 mt-1">{rating}/5</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UserExperience;