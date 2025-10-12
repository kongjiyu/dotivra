// src/components/dashboard/TemplateGrid.tsx
import React from 'react';
import { Plus, Expand } from 'lucide-react';
import { templates } from '../../utils/mockData';
import type { Template } from '../../types';
import { FileText, Code, BookOpen, Settings } from 'lucide-react';

interface TemplateGridProps {
  onTemplateClick: (template: Template) => void;
  onExploreAll: () => void;
  onAddProject: () => void;
}

const gradientStyles = [
  'from-blue-500 to-purple-600',
  'from-green-400 to-blue-500',
  'from-orange-400 to-pink-500',
  'from-indigo-500 to-sky-500',
  'from-amber-400 to-rose-500',
  'from-teal-400 to-cyan-500',
];

const TemplateGrid: React.FC<TemplateGridProps> = ({
  onTemplateClick,
  onExploreAll,
  onAddProject,
}) => {
  const featuredTemplates = templates.slice(0, 5);

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-gray-800">Start a new project</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Pick a template to quickly scaffold new documentation
          </p>
        </div>
        <button
          onClick={onExploreAll}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-blue-600 border border-gray-300 rounded-full hover:bg-gray-50 hover:border-blue-500 transition-all"
          type="button"
        >
          Template gallery
          <Expand className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 flex-nowrap">
        <div className="flex-shrink-0 w-64">
          <button
            type="button"
            onClick={onAddProject}
            className="group w-full cursor-pointer bg-white border-2 border-dotted border-gray-300 rounded-lg transition-all hover:border-blue-500 hover:bg-blue-50/60 px-5 py-4 flex flex-col items-center gap-3 text-center h-44 justify-center"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl shadow-sm transition-transform group-hover:scale-105">
              <Plus className="h-6 w-6" />
            </div>
            <div className="mt-2">
              <span className="text-sm font-medium text-gray-800 block">Add project</span>
              <span className="text-xs text-gray-500 block mt-1">Create a new documentation workspace</span>
            </div>
          </button>
        </div>

        {featuredTemplates.map((template, index) => {
          // Get icon based on category or template name
          const getIcon = () => {
            if (template.Category === 'developer') {
              return template.TemplateName?.includes('API') ? Code : Settings;
            } else if (template.Category === 'user') {
              return BookOpen;
            } else {
              return FileText;
            }
          };
          const Icon = getIcon();
          
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
                    {template.TemplateName}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {template.Description}
                  </p>
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      template.Category === 'user' 
                        ? 'bg-green-100 text-green-700'
                        : template.Category === 'developer'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {template.Category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-px bg-gray-200 mt-6" aria-hidden="true" />
    </section>
  );
};

export default TemplateGrid;
