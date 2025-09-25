import React from 'react';
import { Mail, User, Shield, MessageCircle } from 'lucide-react';

interface ContactInfoData {
  name: string;
  email: string;
  allowFollowUp: boolean;
}

interface ContactInfoProps {
  data: ContactInfoData;
  onChange: (data: Partial<ContactInfoData>) => void;
}

const ContactInfo: React.FC<ContactInfoProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Contact Information
        </h3>
        <p className="text-gray-600 mb-6">
          Help us follow up on your feedback and keep you updated on any improvements or fixes.
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Name (Optional)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Enter your name"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          This helps us personalize our response to you
        </p>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address (Optional)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="your.email@example.com"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          We'll only use this to follow up on your feedback
        </p>
      </div>

      {/* Follow-up Preference */}
      <div className="bg-gray-50 rounded-lg p-4">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.allowFollowUp}
            onChange={(e) => onChange({ allowFollowUp: e.target.checked })}
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">
                Allow follow-up communication
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              We may contact you to ask for clarification, provide updates on fixes, or notify you when requested features are implemented.
            </p>
          </div>
        </label>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Privacy & Data Usage</h4>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                • Your feedback helps us improve the platform for everyone
              </p>
              <p>
                • Contact information is only used for follow-up communication
              </p>
              <p>
                • We never share your personal information with third parties
              </p>
              <p>
                • You can request deletion of your data at any time
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-2">Ready to Submit</h4>
        <p className="text-sm text-green-800">
          Thank you for taking the time to share your feedback! Your input is valuable and helps us make the platform better for everyone.
        </p>
        {data.email && (
          <p className="text-sm text-green-700 mt-2">
            📧 We'll send a confirmation to <strong>{data.email}</strong> once your feedback is received.
          </p>
        )}
      </div>

      {/* Anonymous Option */}
      {!data.name && !data.email && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Anonymous Feedback</h4>
          <p className="text-sm text-gray-600">
            You're submitting anonymous feedback. While we appreciate your input, we won't be able to follow up with you directly about your suggestions or notify you of updates.
          </p>
        </div>
      )}
    </div>
  );
};

export default ContactInfo;