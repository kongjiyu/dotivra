// src/components/dashboard/TemplateGrid.tsx
import React from 'react';
import { mockTemplates } from '../../utils/mockData';
import type { Template } from '../../types';

interface TemplateGridProps {
  onTemplateClick: (template: Template) => void;
  onExploreAll: () => void;
}

const TemplateGrid: React.FC<TemplateGridProps> = ({ onTemplateClick, onExploreAll }) => {
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Document Templates</h2>
          <p className="text-gray-600 text-sm mt-1">Choose a template to create documentation</p>
        </div>
        <button
          onClick={onExploreAll}
          className="px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all"
        >
          Explore All
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <div
              key={template.id}
              onClick={() => onTemplateClick(template)}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {template.description}
                  </p>
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      template.category === 'user' 
                        ? 'bg-green-100 text-green-700'
                        : template.category === 'developer'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {template.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateGrid;