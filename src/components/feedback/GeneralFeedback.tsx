import React from 'react';

export interface FeedbackData {
  email: string;
  comment: string;
}

interface GeneralFeedbackProps {
  data: FeedbackData;
  errors: Partial<FeedbackData>;
  onChange: (field: keyof FeedbackData, value: string) => void;
}

const GeneralFeedback: React.FC<GeneralFeedbackProps> = ({ data, errors, onChange }) => {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        We'd love to hear from you!
      </h3>
      <p className="text-gray-600 mb-6">
        Your feedback helps us improve the platform. Share your thoughts, suggestions, or report any issues.
      </p>

      <div className="space-y-6">
        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address (Optional)
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="your.email@example.com"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            We'll only use this to follow up on your feedback if needed
          </p>
        </div>

        {/* Comment Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Feedback *
          </label>
          <textarea
            value={data.comment}
            onChange={(e) => onChange('comment', e.target.value)}
            placeholder="Share your thoughts, suggestions, or report any issues you've encountered..."
            rows={6}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
              errors.comment ? 'border-red-300' : 'border-gray-300'
            }`}
            required
          />
          {errors.comment && (
            <p className="mt-1 text-sm text-red-600">{errors.comment}</p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            {data.comment.length}/1000 characters
          </p>
        </div>
      </div>
    </div>
  );
};

export default GeneralFeedback;