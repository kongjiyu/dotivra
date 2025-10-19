import React from 'react';
import type { LegacyTemplate as Template } from '../../types';

interface Props {
  template: Template;
  onUse: (id: number) => void;
}

const TemplateCard: React.FC<Props> = ({ template, onUse }) => {
  const Icon = template.icon as React.ElementType;

  const handleClick = () => {
    onUse(template.id);
  };

  const getCategoryColor = () => {
    switch (template.category) {
      case 'developer':
        return 'bg-purple-100 text-purple-700';
      case 'user':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <article 
      onClick={handleClick}
      className="template-preview group border border-gray-200 rounded-lg overflow-hidden bg-white cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
    >
      <div className="h-32 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 text-white mb-2 shadow-sm">
            <Icon className="h-6 w-6" />
          </div>
          <div className="text-xs text-gray-600">{template.name}</div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900">{template.name}</h4>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor()}`}>
            {template.category}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
        <div className="text-sm text-blue-600 font-medium group-hover:text-blue-700">
          Click to use template →
        </div>
      </div>
    </article>
  );
};

export default TemplateCard;
