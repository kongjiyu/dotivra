import React from 'react';
import { Lightbulb, Target, Zap } from 'lucide-react';

interface FeatureRequestData {
  title: string;
  description: string;
  useCase: string;
  priority: string;
}

interface FeatureRequestProps {
  data: FeatureRequestData;
  onChange: (data: Partial<FeatureRequestData>) => void;
}

const FeatureRequest: React.FC<FeatureRequestProps> = ({ data, onChange }) => {
  const priorityOptions = [
    {
      value: 'low',
      label: 'Low Priority',
      description: 'Nice to have, would improve experience',
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-200',
      icon: Target
    },
    {
      value: 'medium',
      label: 'Medium Priority', 
      description: 'Would be helpful for workflow efficiency',
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
      icon: Target
    },
    {
      value: 'high',
      label: 'High Priority',
      description: 'Important for productivity and user satisfaction',
      color: 'text-orange-600',
      bg: 'bg-orange-50 border-orange-200',
      icon: Zap
    },
    {
      value: 'critical',
      label: 'Critical Need',
      description: 'Essential feature missing from workflow',
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200',
      icon: Zap
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Feature Request
        </h3>
        <p className="text-gray-600 mb-6">
          Share your ideas for new features or improvements that would make the platform better.
        </p>
      </div>

      {/* Feature Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Feature Title *
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Brief title for your feature request (e.g., 'Dark mode toggle', 'Bulk export option')"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      {/* Detailed Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Detailed Description *
        </label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe the feature in detail. What should it do? How should it work? What problem does it solve?"
          rows={5}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          required
        />
      </div>

      {/* Use Case */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Use Case & Benefits *
        </label>
        <textarea
          value={data.useCase}
          onChange={(e) => onChange({ useCase: e.target.value })}
          placeholder="Explain how you would use this feature and what benefits it would provide. Include specific scenarios or workflows where this would be helpful."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          required
        />
      </div>

      {/* Priority Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Priority Level *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {priorityOptions.map((option) => {
            const Icon = option.icon;
            return (
              <label
                key={option.value}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  data.priority === option.value
                    ? `${option.bg} border-current ${option.color}`
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  value={option.value}
                  checked={data.priority === option.value}
                  onChange={(e) => onChange({ priority: e.target.value })}
                  className="sr-only"
                />
                <div className={`flex items-start space-x-3 ${
                  data.priority === option.value ? option.color : 'text-gray-700'
                }`}>
                  <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm opacity-75 mt-1">
                      {option.description}
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Examples Section */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-medium text-purple-900 mb-2 flex items-center">
          <Lightbulb className="h-4 w-4 mr-2" />
          Examples of great feature requests:
        </h4>
        <div className="text-sm text-purple-800 space-y-3">
          <div>
            <div className="font-medium">"Keyboard shortcuts for common actions"</div>
            <div className="opacity-75">Would allow power users to navigate faster, similar to Slack's shortcuts</div>
          </div>
          <div>
            <div className="font-medium">"Team collaboration on documents"</div>
            <div className="opacity-75">Multiple users could edit simultaneously with real-time sync and comments</div>
          </div>
          <div>
            <div className="font-medium">"Advanced search filters"</div>
            <div className="opacity-75">Filter by date, author, project type to find documents faster</div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 Tips for effective feature requests:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Focus on the problem you're trying to solve, not just the solution</li>
          <li>• Provide specific examples of how you'd use the feature</li>
          <li>• Consider how this might benefit other users too</li>
          <li>• Reference similar features in other tools if helpful</li>
          <li>• Be open to alternative implementations of your idea</li>
        </ul>
      </div>
    </div>
  );
};

export default FeatureRequest;