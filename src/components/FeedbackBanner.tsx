import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

interface FeedbackBannerProps {
  onOpenFeedback: () => void;
}

const FeedbackBanner: React.FC<FeedbackBannerProps> = ({ onOpenFeedback }) => {
  const [isClosed, setIsClosed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  // Check if feedback is enabled via environment variable
  const isFeedbackEnabled = import.meta.env.VITE_ENABLE_FEEDBACK === 'true';

  useEffect(() => {
    // Don't show if feedback is disabled
    if (!isFeedbackEnabled) {
      return;
    }

    // Don't show on login page
    if (location.pathname === '/') {
      setIsVisible(false);
      return;
    }

    // Reset visibility when route changes
    setIsVisible(false);
    setIsClosed(false);

    // Show after 5 seconds
    const timer = setTimeout(() => {
      if (!isClosed) {
        setIsVisible(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [location.pathname, isFeedbackEnabled, isClosed]);

  // Don't show if feedback is disabled
  if (!isFeedbackEnabled) {
    return null;
  }

  // Don't show on login page
  if (location.pathname === '/') {
    return null;
  }

  // If user closed it, don't show
  if (isClosed) {
    return null;
  }

  const handleClose = () => {
    setIsClosed(true);
    setIsVisible(false);
  };

  const handleOpenFeedback = () => {
    onOpenFeedback();
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm transition-all duration-500 ease-out ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
        }`}
    >
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            Help us improve! Share your feedback to make Dotivra better.
          </p>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenFeedback}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <div className="text-white">Give Feedback</div>
          </button>
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-gray-600 text-xs font-medium hover:text-gray-800 transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackBanner;
