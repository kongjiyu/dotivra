import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/header/Header';
import { useAuth } from '../context/AuthContext';
import TemplateCard from '../components/allTemplate/TemplateCard';
import TemplateModal from '../components/allTemplate/TemplateModal';
import AIGenerationProgressModal from '../components/modal/AIGenerationProgressModal';
import { getUserDisplayInfo } from '../utils/user';
import { FileText } from 'lucide-react';
import type { LegacyTemplate } from '../types';
import type { Template } from '../../firestoreService';
import { useFeedback } from '../components/AppLayout';
import { showError } from '@/utils/sweetAlert';

const AllTemplate: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const { name: displayName, initials } = getUserDisplayInfo(userProfile, user);
  const { openFeedbackModal } = useFeedback();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'developer' | 'user'>('all');
  const [selected, setSelected] = useState<number | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // AI Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationRepository, setGenerationRepository] = useState('');
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([]);
  const [currentGenerationStep, setCurrentGenerationStep] = useState<string>('parse');

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

  // Count templates by category
  const categoryCounts = useMemo(() => {
    return {
      all: uiTemplates.length,
      developer: uiTemplates.filter(t => t.category === 'developer').length,
      user: uiTemplates.filter(t => t.category === 'user').length,
    };
  }, [uiTemplates]);

  // Handle template selection
  const handleTemplateSelect = (id: number) => {
    setSelected(id);
  };

  // Handle document creation
  const handleCreateDocument = async (data: {
    template: Template;
    projectId?: string;
    newProjectName?: string;
    newProjectDescription?: string;
    selectedRepo?: string;
    documentName: string;
    documentRole: string;
  }) => {
    if (!user) return;

    const {
      template,
      projectId,
      newProjectName,
      newProjectDescription,
      selectedRepo,
      documentName,
      documentRole
    } = data;

    try {
      const idToken = await user.getIdToken();
      
      let finalProjectId = projectId;
      
      // Create new project if needed
      if (!projectId && newProjectName) {
        const createProjectRes = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            projectName: newProjectName,
            description: newProjectDescription || '',
            githubRepo: selectedRepo || ''
          })
        });

        if (!createProjectRes.ok) throw new Error('Failed to create project');
        
        const newProject = await createProjectRes.json();
        finalProjectId = newProject.projectId;
      }

      if (!finalProjectId) {
        showError('Project Required', 'Project ID is required to create a document');
        return;
      }

      // Try AI generation if GitHub repo is available
      let content = template.TemplatePrompt || '';
      const repositoryUrl = selectedRepo;

      if (repositoryUrl && user) {
        const repoMatch = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
        
        if (repoMatch) {
          const [, owner, repo] = repoMatch;
          const repoFullName = `${owner}/${repo}`;
          
          setGenerationRepository(repoFullName);
          setIsGenerating(true);
          
          const steps: GenerationStep[] = [
            { id: 'parse', label: 'Parsing repository information', status: 'completed', details: repoFullName },
            { id: 'structure', label: 'Fetching repository structure', status: 'in-progress', details: 'Analyzing files and directories...' },
            { id: 'analysis', label: 'AI analyzing codebase', status: 'pending', details: 'Understanding project structure...' },
            { id: 'iteration', label: 'AI examining code files', status: 'pending', details: 'Reading relevant files...' },
            { id: 'files', label: 'Processing repository files', status: 'pending', details: 'Gathering context...' },
            { id: 'generate', label: 'Writing documentation', status: 'pending', details: 'AI creating content...' },
            { id: 'done', label: 'Finalizing document', status: 'pending' }
          ];
          setGenerationSteps(steps);
          setCurrentGenerationStep('structure');
          
          // Progress callback for iterative AI
          const handleProgress = (step: string, detail?: string) => {
            setGenerationSteps(prev => prev.map(s => {
              // Mark completed steps based on workflow
              const completedSteps = ['parse'];
              
              if (step === 'analysis' || step === 'iteration' || step === 'files' || step === 'generate' || step === 'done') {
                completedSteps.push('structure');
              }
              if (step === 'iteration' || step === 'files' || step === 'generate' || step === 'done') {
                completedSteps.push('analysis');
              }
              if (step === 'files' || step === 'generate' || step === 'done') {
                completedSteps.push('iteration');
              }
              if (step === 'generate' || step === 'done') {
                completedSteps.push('files');
              }
              if (step === 'done') {
                completedSteps.push('generate');
              }
              
              // Mark completed
              if (completedSteps.includes(s.id) && s.id !== step) {
                return { ...s, status: 'completed' as const };
              }
              
              // Update current step
              if (s.id === step) {
                return { 
                  ...s, 
                  status: step === 'done' ? 'completed' as const : 'in-progress' as const,
                  details: detail || s.details 
                };
              }
              
              // Map 'analysis' and 'files' to 'iteration' step
              if ((step === 'analysis' || step === 'files') && s.id === 'iteration') {
                return {
                  ...s,
                  status: 'in-progress' as const,
                  details: detail || s.details
                };
              }
              
              // Map final content generation to 'generate' step
              if (step === 'init' && s.id === 'structure') {
                return {
                  ...s,
                  status: 'in-progress' as const,
                  details: detail || s.details
                };
              }
              
              return s;
            }));
            setCurrentGenerationStep(step);
          };
          
          try {
            // Generate content using iterative AI method
            content = await aiService.generateDocumentFromTemplateAndRepoIterative(
              user,
              template.TemplatePrompt || '',
              { owner, repo, fullName: repoFullName },
              documentRole,
              documentName,
              handleProgress
            );
            
            // Finalize
            handleProgress('done', 'Document ready!');
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (aiError) {
            console.error('AI generation failed, using template:', aiError);
            
            // Update steps to show error
            setGenerationSteps(prev => prev.map(step => 
              step.status === 'in-progress' 
                ? { ...step, status: 'error' as const, details: 'Failed - using fallback' }
                : step
            ));
            
            // Wait a bit to show error
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }

      // Get user ID
      const userId = user.uid;

      // Determine document category
      let documentCategory = 'General';
      if (documentRole.toLowerCase().includes('user')) {
        documentCategory = 'User';
      } else if (documentRole.toLowerCase().includes('developer') || documentRole.toLowerCase().includes('api')) {
        documentCategory = 'Developer';
      }

      // Create document with consistent field names matching backend expectations
      const createDocRes = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          DocumentName: documentName,
          DocumentType: 'user-manual', // or another appropriate type based on template
          DocumentCategory: documentCategory,
          Content: content,
          Project_Id: finalProjectId,
          User_Id: userId,
          Template_Id: template.Template_Id || template.id,
          IsDraft: false,
        })
      });

      if (!createDocRes.ok) {
        const errorData = await createDocRes.json();
        throw new Error(errorData.error || 'Failed to create document');
      }

      const docData = await createDocRes.json();
      const createdDocument = docData.document || docData;
      
      setIsGenerating(false);
      
      // Navigate to document editor, passing the full document data including content
      // This allows the editor to display content immediately without waiting for Firestore
      navigate(`/document/${docData.documentId}`, {
        state: { documentData: createdDocument }
      });
    } catch (error) {
      console.error('Error creating document:', error);
      showError(
        'Failed to Create Document',
        error instanceof Error ? error.message : 'Failed to create document'
      );
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userName={displayName} initials={initials} onFeedbackClick={openFeedbackModal} />

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

      {/* Template Modal */}
      {selected !== null && (
        <TemplateModal 
          id={selected} 
          onClose={() => setSelected(null)}
          onCreateDocument={handleCreateDocument}
        />
      )}

      {/* AI Generation Progress Modal */}
      <AIGenerationProgressModal
        isOpen={isGenerating}
        repositoryName={generationRepository}
        steps={generationSteps}
        currentStep={currentGenerationStep}
      />
    </div>
  );
};

export default AllTemplate;
