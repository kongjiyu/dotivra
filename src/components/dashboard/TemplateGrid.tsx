// src/components/dashboard/TemplateGrid.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Expand } from 'lucide-react';
import type { Template } from '../../../firestoreService';
import { FileText, Code, BookOpen, Settings } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/templates');

        if (response.ok) {
          const data = await response.json();
          setTemplates(data.templates || []);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const featuredTemplates = templates.slice(0, 5);

  return (
    <section className="space-y-3   ">
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

      {/* Horizontal scroll container with better styling */}
      <div className="relative">
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 snap-x snap-mandatory">
            {/* Add Project Card */}
            <div className="flex-shrink-0 w-72 snap-start p-2">
              <button
                type="button"
                onClick={onAddProject}
                className="group w-full cursor-pointer bg-white border-2 border-dotted border-gray-300 rounded-xl transition-all hover:border-blue-500 hover:bg-blue-50/60 hover:shadow-lg px-6 py-8 flex flex-col items-center gap-4 text-center h-56 justify-center transform hover:scale-[1.02]"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 group-hover:shadow-xl">
                  <Plus className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <span className="text-lg font-semibold text-gray-900 block">Add project</span>
                  <span className="text-sm text-gray-600 block leading-relaxed max-w-48">Create a new documentation workspace with templates</span>
                </div>
              </button>
            </div>

            {/* Template Cards */}
            {loading ? (
              // Loading skeleton
              <div className="flex-shrink-0 w-72 snap-start p-2">
                <div className="bg-white border border-gray-200 rounded-xl h-56 animate-pulse">
                  <div className="h-20 bg-gray-200"></div>
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ) : (
              featuredTemplates.map((template, index) => {
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
                const gradientClass = gradientStyles[index % gradientStyles.length];

                return (
                  <div
                    key={template.id}
                    onClick={() => onTemplateClick(template)}
                    className="flex-shrink-0 w-72 snap-start cursor-pointer group p-2"
                  >
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300 h-56 transform hover:scale-[1.02] hover:-translate-y-1">
                      {/* Card Header with Gradient */}
                      <div className={`h-20 bg-gradient-to-r ${gradientClass} flex items-center justify-center relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-black/10"></div>
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center relative z-10">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-6 h-36 flex flex-col justify-between">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                            {template.TemplateName}
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                            {(template as any)['Description '] || template.Description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${template.Category === 'user'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : template.Category === 'developer'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                            {template.Category}
                          </span>
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <span className="text-xs font-bold text-blue-600">→</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* End padding for better scroll */}
            <div className="flex-shrink-0 w-4"></div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Scroll indicators */}
        <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-8 h-8 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center opacity-50 pointer-events-none">
          <span className="text-gray-400 text-sm">←</span>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center opacity-50 pointer-events-none">
          <span className="text-gray-400 text-sm">→</span>
        </div>
      </div>

      <div className="h-px bg-gray-200 " aria-hidden="true" />
    </section>
  );
};

export default TemplateGrid;
