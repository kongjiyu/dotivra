import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FeedbackHeader, 
  GeneralFeedback, 
  FeedbackSubmit
} from '../components/feedback';
import type { FeedbackData } from '../components/feedback';

const FeedbackForm: React.FC = () => {
  const navigate = useNavigate();
  const [feedbackData, setFeedbackData] = useState<FeedbackData>({
    email: '',
    comment: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FeedbackData>>({});

  const validateForm = () => {
    const newErrors: Partial<FeedbackData> = {};

    if (!feedbackData.comment.trim()) {
      newErrors.comment = 'Comment is required';
    }

    if (feedbackData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(feedbackData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Implement API call to submit feedback
      console.log('Submitting feedback:', feedbackData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success message and redirect
      alert('Thank you for your feedback! We appreciate your input.');
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FeedbackData, value: string) => {
    setFeedbackData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <FeedbackHeader onBack={() => navigate('/dashboard')} />

        {/* Form Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit}>
            <GeneralFeedback
              data={feedbackData}
              errors={errors}
              onChange={handleInputChange}
            />
            
            <FeedbackSubmit
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
            />
          </form>
        </div>

      </div>
    </div>
  );
};

export default FeedbackForm;