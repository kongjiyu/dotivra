import React, { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FirebaseService } from '../services/firebaseService';
import {
  GeneralFeedback,
  FeedbackSubmit
} from './feedback';
import type { FeedbackData } from './feedback';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();

  // Check if feedback is enabled via environment variable
  const isFeedbackEnabled = import.meta.env.VITE_ENABLE_FEEDBACK === 'true';

  const [feedbackData, setFeedbackData] = useState<FeedbackData>({
    email: '',
    comment: '',
    pageLink: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<Partial<FeedbackData>>({});

  // Auto-detect current page when modal opens
  useEffect(() => {
    if (isOpen) {
      const currentPath = location.pathname;
      // Only set if not already on feedback page
      if (currentPath !== '/feedback') {
        setFeedbackData(prev => ({ ...prev, pageLink: currentPath }));
      }
    }
  }, [isOpen, location.pathname]);

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
      // Submit feedback to Firestore
      await FirebaseService.submitFeedback(
        feedbackData.comment,
        {
          email: feedbackData.email || undefined,
          pageLink: feedbackData.pageLink || undefined,
          userId: user?.uid || undefined
        }
      );

      // Show success state
      setSubmitSuccess(true);

      // Wait a moment to show success message
      setTimeout(() => {
        // Reset form and close modal
        setFeedbackData({ email: '', comment: '', pageLink: '' });
        setErrors({});
        setSubmitSuccess(false);
        onClose();
      }, 2000);

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

  const handleClose = () => {
    if (!isSubmitting) {
      setFeedbackData({ email: '', comment: '', pageLink: '' });
      setErrors({});
      onClose();
    }
  };

  // Don't render if feedback is disabled or not open
  if (!isFeedbackEnabled || !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Share Your Feedback</h2>
              <p className="text-sm text-gray-500 mt-0.5">Help us improve Dotivra</p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
            {submitSuccess ? (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Thank You!
                </h3>
                <p className="text-gray-600 text-center">
                  Your feedback has been submitted successfully. We appreciate your input!
                </p>
              </div>
            ) : (
              <>
                <GeneralFeedback
                  data={feedbackData}
                  errors={errors}
                  onChange={handleInputChange}
                />

                <FeedbackSubmit
                  isSubmitting={isSubmitting}
                  onSubmit={handleSubmit}
                />
              </>
            )}
          </form>
        </div>
      </div>
    </>
  );
};

export default FeedbackModal;
