import React, { useRef } from 'react';
import { Upload, X, AlertTriangle } from 'lucide-react';

interface BugReportData {
  title: string;
  description: string;
  steps: string;
  severity: string;
  browser: string;
  screenshot?: File;
}

interface BugReportProps {
  data: BugReportData;
  onChange: (data: Partial<BugReportData>) => void;
}

const BugReport: React.FC<BugReportProps> = ({ data, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const severityOptions = [
    { value: 'low', label: 'Low - Minor inconvenience', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
    { value: 'medium', label: 'Medium - Affects functionality', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
    { value: 'high', label: 'High - Blocks important tasks', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
    { value: 'critical', label: 'Critical - System unusable', color: 'text-red-600', bg: 'bg-red-50 border-red-200' }
  ];

  const browserOptions = [
    'Chrome', 'Firefox', 'Safari', 'Edge', 'Opera', 'Other'
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onChange({ screenshot: file });
    } else {
      alert('Please upload an image file');
    }
  };

  const removeScreenshot = () => {
    onChange({ screenshot: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Bug Report
        </h3>
        <p className="text-gray-600 mb-6">
          Help us fix the issue by providing detailed information about the bug you encountered.
        </p>
      </div>

      {/* Bug Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bug Title *
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Brief description of the issue (e.g., 'Login button not responding')"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      {/* Severity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Severity Level *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {severityOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                data.severity === option.value
                  ? `${option.bg} border-current ${option.color}`
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                value={option.value}
                checked={data.severity === option.value}
                onChange={(e) => onChange({ severity: e.target.value })}
                className="sr-only"
              />
              <div className={`flex items-center space-x-2 ${
                data.severity === option.value ? option.color : 'text-gray-700'
              }`}>
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">{option.label}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Bug Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Detailed Description *
        </label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe what happened, what you expected to happen, and any error messages you saw..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          required
        />
      </div>

      {/* Steps to Reproduce */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Steps to Reproduce *
        </label>
        <textarea
          value={data.steps}
          onChange={(e) => onChange({ steps: e.target.value })}
          placeholder="Please list the exact steps to reproduce this bug:
1. Go to...
2. Click on...
3. Enter...
4. Bug occurs..."
          rows={5}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          required
        />
      </div>

      {/* Browser Information */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Browser Used *
        </label>
        <select
          value={data.browser}
          onChange={(e) => onChange({ browser: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select your browser</option>
          {browserOptions.map((browser) => (
            <option key={browser} value={browser}>
              {browser}
            </option>
          ))}
        </select>
      </div>

      {/* Screenshot Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Screenshot (Optional)
        </label>
        <div className="space-y-3">
          {!data.screenshot ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            >
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Click to upload a screenshot</p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded">
                    <Upload className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{data.screenshot.name}</p>
                    <p className="text-xs text-gray-500">
                      {(data.screenshot.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeScreenshot}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Screenshots help us understand and fix the issue faster
        </p>
      </div>

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-medium text-amber-900 mb-2">🔍 Tips for effective bug reports:</h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Be as specific as possible about what you were doing</li>
          <li>• Include exact error messages if any appeared</li>
          <li>• Mention if this happens consistently or randomly</li>
          <li>• Screenshots are extremely helpful for visual issues</li>
        </ul>
      </div>
    </div>
  );
};

export default BugReport;