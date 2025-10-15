// src/utils/templateUtils.ts - Utility functions for template handling
import type { Template } from '../types';
import { FileText, Code, BookOpen, Settings, Users, FileCheck } from 'lucide-react';

/**
 * Template utility functions to handle property access safely
 * Provides backward compatibility between old and new template formats
 */

export const getTemplateName = (template: Template): string => {
  return template.TemplateName || (template as any).name || 'Untitled Template';
};

export const getTemplateDescription = (template: Template): string => {
  return template.Description || (template as any).description || 'No description available';
};

export const getTemplateCategory = (template: Template): string => {
  return template.Category || (template as any).category || 'general';
};

export const getTemplateIcon = (template: Template) => {
  // Check if template has an icon property (for backward compatibility)
  if ((template as any).icon) {
    return (template as any).icon;
  }
  
  // Get icon based on category or template name
  const category = getTemplateCategory(template);
  const name = getTemplateName(template);
  
  if (category === 'developer') {
    if (name.toLowerCase().includes('api')) return Code;
    if (name.toLowerCase().includes('technical')) return Settings;
    return Code;
  } else if (category === 'user') {
    if (name.toLowerCase().includes('guide')) return BookOpen;
    if (name.toLowerCase().includes('story')) return Users;
    return BookOpen;
  } else {
    if (name.toLowerCase().includes('srs') || name.toLowerCase().includes('specification')) return FileCheck;
    if (name.toLowerCase().includes('meeting') || name.toLowerCase().includes('notes')) return FileText;
    return FileText;
  }
};

export const getTemplateCategoryColor = (template: Template): string => {
  const category = getTemplateCategory(template);
  switch (category) {
    case 'user':
      return 'bg-green-100 text-green-700';
    case 'developer':
      return 'bg-purple-100 text-purple-700';
    case 'general':
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

/**
 * Create a safe template object with all required properties
 */
export const createSafeTemplate = (template: Template): Template & {
  safeName: string;
  safeDescription: string;
  safeCategory: string;
  safeIcon: any;
  safeCategoryColor: string;
} => {
  return {
    ...template,
    safeName: getTemplateName(template),
    safeDescription: getTemplateDescription(template),
    safeCategory: getTemplateCategory(template),
    safeIcon: getTemplateIcon(template),
    safeCategoryColor: getTemplateCategoryColor(template)
  };
};

/**
 * Validate template has required properties
 */
export const isValidTemplate = (template: any): template is Template => {
  return (
    template &&
    typeof template === 'object' &&
    (template.TemplateName || template.name) &&
    (template.id || template.Template_Id)
  );
};

/**
 * Filter templates by category
 */
export const filterTemplatesByCategory = (templates: Template[], category: string): Template[] => {
  return templates.filter(template => getTemplateCategory(template) === category);
};

/**
 * Search templates by name or description
 */
export const searchTemplates = (templates: Template[], searchTerm: string): Template[] => {
  const term = searchTerm.toLowerCase();
  return templates.filter(template => {
    const name = getTemplateName(template).toLowerCase();
    const description = getTemplateDescription(template).toLowerCase();
    return name.includes(term) || description.includes(term);
  });
};