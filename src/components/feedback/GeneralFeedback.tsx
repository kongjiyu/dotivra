import React, { useState, useRef, useEffect } from 'react';
import { Link as LinkIcon, X } from 'lucide-react';

export interface FeedbackData {
  email: string;
  comment: string;
  pageLink: string;
}

interface GeneralFeedbackProps {
  data: FeedbackData;
  errors: Partial<FeedbackData>;
  onChange: (field: keyof FeedbackData, value: string) => void;
}

// Available routes in the application
const availableRoutes = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/projects', label: 'All Projects' },
  { path: '/project/:projectId', label: 'Project Overview' },
  { path: '/templates', label: 'Templates' },
  { path: '/ai-generator', label: 'AI Generator' },
  { path: '/document/:documentId', label: 'Document Editor' },
  { path: '/document/history/:documentId', label: 'Document History' },
  { path: '/profile', label: 'Profile' },
  { path: '/github-connect', label: 'GitHub Connect' },
  { path: '/gemini', label: 'Gemini Dashboard' },
  { path: '/gemini/test-balancer', label: 'Gemini Test Balancer' },
];

const GeneralFeedback: React.FC<GeneralFeedbackProps> = ({ data, errors, onChange }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredRoutes, setFilteredRoutes] = useState(availableRoutes);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter routes based on input
  useEffect(() => {
    const input = data.pageLink.toLowerCase();
    if (input.includes('/') || input === '') {
      const filtered = availableRoutes.filter(route =>
        route.path.toLowerCase().includes(input) ||
        route.label.toLowerCase().includes(input)
      );
      setFilteredRoutes(filtered);
    }
  }, [data.pageLink]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRoute = (path: string) => {
    onChange('pageLink', path);
    setShowSuggestions(false);
  };

  const handleClearPage = () => {
    onChange('pageLink', '');
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        We'd love to hear from you!
      </h3>
      <p className="text-gray-600 mb-6">
        Your feedback helps us improve the platform. Share your thoughts, suggestions, or report any issues.
      </p>

      <div className="space-y-6">
        {/* Page Link Field */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Page / Feature <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <LinkIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={data.pageLink}
              onChange={(e) => onChange('pageLink', e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Type / to see available pages..."
              className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.pageLink ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {data.pageLink && (
              <button
                type="button"
                onClick={handleClearPage}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {errors.pageLink && (
            <p className="mt-1 text-sm text-red-600">{errors.pageLink}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            You can type "/" to browse available pages.
          </p>

          {/* Suggestions Dropdown */}
          {showSuggestions && filteredRoutes.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              <div className="py-1">
                {filteredRoutes.map((route, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectRoute(route.path)}
                    className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                          {route.label}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                          {route.path}
                        </div>
                      </div>
                      <LinkIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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