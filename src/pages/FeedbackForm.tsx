import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FeedbackHeader, 
  GeneralFeedback, 
  FeedbackSubmit
} from '../components/feedback';
import { showSuccess, showError } from '@/utils/sweetAlert';
import type { FeedbackData } from '../components/feedback';

const FeedbackForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the referring page from navigation state or session storage
  const getReferringPage = () => {
    // Priority 1: Check navigation state (when user clicks feedback from a page)
    if (location.state?.fromPage) {
      return location.state.fromPage;
    }
    
    // Priority 2: Check sessionStorage (persisted across refreshes)
    const storedPage = sessionStorage.getItem('feedbackReferrer');
    if (storedPage && storedPage !== '/feedback') {
      return storedPage;
    }
    
    // Priority 3: Default to empty (user can manually select)
    return '';
  };

  const [feedbackData, setFeedbackData] = useState<FeedbackData>({
    email: '',
    comment: '',
    pageLink: getReferringPage()
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FeedbackData>>({});

  // Store the current page path when component mounts (except if already on feedback)
  useEffect(() => {
    // Get the previous path from document.referrer or navigation state
    const referrer = document.referrer;
    const currentPath = window.location.pathname;
    
    // Only store if we're coming from within the app and not already on feedback
    if (referrer && referrer.includes(window.location.origin) && currentPath === '/feedback') {
      const referrerPath = new URL(referrer).pathname;
      if (referrerPath !== '/feedback') {
        sessionStorage.setItem('feedbackReferrer', referrerPath);
      }
    }
  }, []);

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
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear the stored referrer after successful submission
      sessionStorage.removeItem('feedbackReferrer');
      
      // Show success message and redirect
      await showSuccess(
        'Thank You!',
        'Thank you for your feedback! We appreciate your input.'
      );
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      showError('Submission Failed', 'Failed to submit feedback. Please try again.');
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
          {/* Show info banner if page was auto-detected */}
          {feedbackData.pageLink && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Feedback for:</span> {feedbackData.pageLink}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                You can change this or leave it blank if your feedback is general.
              </p>
            </div>
          )}

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