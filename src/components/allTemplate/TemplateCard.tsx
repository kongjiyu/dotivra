import React from 'react';
import type { LegacyTemplate as Template } from '../../types';

interface Props {
  template: Template;
  onUse: (id: number) => void;
}

const TemplateCard: React.FC<Props> = ({ template, onUse }) => {
  const Icon = template.icon as React.ElementType;

  return (
    <article className="template-preview group border border-gray-200 rounded-lg overflow-hidden bg-white cursor-pointer hover:shadow-lg transition-transform transform hover:-translate-y-1">
      <div className={`h-32 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100 p-4 flex items-center justify-center`}>
        <div className="text-center">
          <div className={`inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 text-white mb-2 shadow-sm`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="text-xs text-gray-600">{template.name}</div>
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
        <button onClick={() => onUse(template.id)} className="use-template-btn inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
          <span>Use Template</span>
        </button>
      </div>
    </article>
  );
};

export default TemplateCard;
