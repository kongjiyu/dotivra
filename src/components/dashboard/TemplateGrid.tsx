// src/components/dashboard/TemplateGrid.tsx
import React from 'react';
import { Plus, Expand } from 'lucide-react';
import { templates } from '../../utils/mockData';
import type { Template } from '../../types';

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
          const Icon = template.icon;
          return (
            <div key={template.id} className="flex-shrink-0 w-64">
              <button
                type="button"
                onClick={() => onTemplateClick(template)}
                className="group w-full bg-white border border-gray-200 rounded-lg px-4 py-4 text-left transition-all hover:border-blue-500 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 h-44 flex flex-col justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-14 w-14 p-1 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradientStyles[index % gradientStyles.length]} text-white shadow-sm transition-transform group-hover:scale-105`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{template.name}</p>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{template.category}</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed max-h-10 overflow-hidden mt-3">
                  {template.description}
                </p>
              </button>
            </div>
          );
        })}
      </div>

      <div className="h-px bg-gray-200 mt-6" aria-hidden="true" />
    </section>
  );
};

export default TemplateGrid;
