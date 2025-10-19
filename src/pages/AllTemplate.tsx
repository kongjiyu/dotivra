import React, { useMemo, useState, useEffect } from 'react';
import Header from '../components/header/Header';
import { useAuth } from '../context/AuthContext';
import TemplateCard from '../components/allTemplate/TemplateCard';
import AddDocumentFromTemplate from '../components/modal/addDocumentFromTemplate';
import { getUserDisplayInfo } from '../utils/user';
import { FileText } from 'lucide-react';
import type { LegacyTemplate } from '../types';
import type { Template } from '../../firestoreService';

const AllTemplate: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { name: displayName, initials } = getUserDisplayInfo(userProfile, user);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'developer' | 'user'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/templates');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch templates: ${response.status}`);
        }
        
        const data = await response.json();
        setTemplates(data.templates || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // Adapt backend/template schema to UI card schema
  const uiTemplates: LegacyTemplate[] = useMemo(() => {
    const mapped = (templates || []).map((t: any, index: number) => {
      // Use a numeric ID based on index since Firebase IDs are strings
      const result = {
        id: index,
        name: t.TemplateName ?? t.name ?? 'Template',
        // Handle both "Description" and "Description " (with trailing space)
        description: t['Description '] ?? t.Description ?? t.description ?? '',
        icon: FileText,
        category: (t.Category as 'user' | 'developer' | 'general') ?? 'general',
      };
      
      return result;
    });
    
    return mapped;
  }, [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = uiTemplates;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(t => t.category === selectedCategory);
    }
    
    // Filter by search query
    if (q) {
      result = result.filter(t => (t.name + ' ' + t.description).toLowerCase().includes(q));
    }
    
    return result;
  }, [query, uiTemplates, selectedCategory]);

  // Handle template selection
  const handleTemplateSelect = (id: number) => {
    const template = templates[id]; // Use original template data from API
    if (template) {
      setSelectedTemplate(template);
    }
  };

  // Handle document creation
  const handleCreateDocument = async (data: any) => {
    console.log('Creating document with data:', data);
    // TODO: Implement document creation logic
    setSelectedTemplate(null);
  };

  // Count templates by category
  const categoryCounts = useMemo(() => {
    return {
      all: uiTemplates.length,
      developer: uiTemplates.filter(t => t.category === 'developer').length,
      user: uiTemplates.filter(t => t.category === 'user').length,
    };
  }, [uiTemplates]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userName={displayName} initials={initials} />

      <main className="max-w-6xl mx-auto px-6 pb-16">
        <div className="flex items-end justify-between gap-4 py-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Templates</h1>
            <p className="text-gray-600 text-sm mt-1">Choose a template to kickstart your project documentation</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-6">
          <div className="flex-1">
            <label htmlFor="searchInput" className="sr-only">Search templates</label>
            <input id="searchInput" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search templates..." className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              selectedCategory === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All Templates
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100">
              {categoryCounts.all}
            </span>
          </button>
          <button
            onClick={() => setSelectedCategory('developer')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              selectedCategory === 'developer'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Developer
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              {categoryCounts.developer}
            </span>
          </button>
          <button
            onClick={() => setSelectedCategory('user')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              selectedCategory === 'user'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            User
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              {categoryCounts.user}
            </span>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading templates...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-red-600 mb-2">Error loading templates</p>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
        )}

        {/* Templates Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.length > 0 ? (
              filtered.map(t => (
                <TemplateCard key={t.id} template={t} onUse={handleTemplateSelect} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-600">No templates found</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Document Modal */}
      <AddDocumentFromTemplate
        isOpen={selectedTemplate !== null}
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        onCreateDocument={handleCreateDocument}
      />
    </div>
  );
};

export default AllTemplate;
