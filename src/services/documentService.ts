// src/services/documentService.ts
/**
 * Service for document operations like saving as template and copying documents
 */

import { API_ENDPOINTS } from '@/lib/apiConfig';
import type { Document, Template } from '@/types';

/**
 * Save current document as a template
 */
export const saveDocumentAsTemplate = async (document: Document): Promise<Template> => {
  console.log('💾 Saving document as template:', document.DocumentName);
  
  // Create template data from document
  const templateData = {
    TemplateName: `${document.DocumentName} Template`,
    TemplatePrompt: `Template based on "${document.DocumentName}"`,
    Category: document.DocumentCategory || 'general',
    Description: `Template created from document: ${document.DocumentName}. ${document.DocumentType ? `Type: ${document.DocumentType}.` : ''} This template preserves the structure and formatting for reuse in new documents.`,
    Created_Time: new Date().toISOString()
  };

  try {
    const response = await fetch(API_ENDPOINTS.templates(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Template created successfully:', result);
      return result.template || result;
    } else {
      throw new Error(`Failed to create template: ${response.status}`);
    }
  } catch (error) {
    console.log('⚠️ Backend unavailable, creating mock template');
    
    // Fallback: Create mock template (simulate success)
    const mockTemplate: Template = {
      id: `template-${Date.now()}`,
      TemplateName: templateData.TemplateName,
      TemplatePrompt: templateData.TemplatePrompt,
      Category: templateData.Category,
      Description: templateData.Description,
      Created_Time: new Date()
    };
    
    // Store in localStorage for persistence during session
    const existingTemplates = JSON.parse(localStorage.getItem('mockTemplates') || '[]');
    existingTemplates.push(mockTemplate);
    localStorage.setItem('mockTemplates', JSON.stringify(existingTemplates));
    
    console.log('✅ Mock template created:', mockTemplate);
    return mockTemplate;
  }
};

/**
 * Create a copy of the current document
 */
export const copyDocument = async (document: Document, targetProjectId?: string): Promise<Document> => {
  console.log('📄 Creating copy of document:', document.DocumentName);
  
  // Create new document data based on original
  const newDocumentData = {
    DocumentName: `Copy of ${document.DocumentName}`,
    DocumentType: document.DocumentType,
    DocumentCategory: document.DocumentCategory,
    Project_Id: targetProjectId || document.Project_Id,
    Template_Id: document.Template_Id,
    User_Id: document.User_Id,
    Content: document.Content,
    IsDraft: true, // New copies start as drafts
    Created_Time: new Date().toISOString(),
    Updated_Time: new Date().toISOString()
  };

  try {
    const response = await fetch(API_ENDPOINTS.documents(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newDocumentData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Document copied successfully:', result);
      return result.document || result;
    } else {
      throw new Error(`Failed to copy document: ${response.status}`);
    }
  } catch (error) {
    console.log('⚠️ Backend unavailable, creating mock document copy');
    
    // Fallback: Create mock document copy
    const mockDocument: Document = {
      id: `doc-copy-${Date.now()}`,
      DocumentName: newDocumentData.DocumentName,
      DocumentType: newDocumentData.DocumentType,
      DocumentCategory: newDocumentData.DocumentCategory,
      Project_Id: newDocumentData.Project_Id,
      Template_Id: newDocumentData.Template_Id,
      User_Id: newDocumentData.User_Id || 'mock-user-1',
      Content: newDocumentData.Content,
      IsDraft: true,
      Created_Time: new Date(),
      Updated_Time: new Date(),
      EditedBy: newDocumentData.User_Id || 'mock-user-1',
      Hash: `hash-${Date.now()}`
    };
    
    // Store in localStorage for persistence during session
    const existingDocuments = JSON.parse(localStorage.getItem('mockDocuments') || '[]');
    existingDocuments.push(mockDocument);
    localStorage.setItem('mockDocuments', JSON.stringify(existingDocuments));
    
    console.log('✅ Mock document copy created:', mockDocument);
    return mockDocument;
  }
};

/**
 * Get all templates (including session-created mock templates)
 */
export const getAllTemplates = async (): Promise<Template[]> => {
  try {
    const response = await fetch(API_ENDPOINTS.templates());
    
    if (response.ok) {
      const result = await response.json();
      const serverTemplates = Array.isArray(result) ? result : (result.templates || []);
      
      // Merge with session mock templates
      const mockTemplates = JSON.parse(localStorage.getItem('mockTemplates') || '[]');
      
      return [...serverTemplates, ...mockTemplates];
    } else {
      throw new Error(`Failed to fetch templates: ${response.status}`);
    }
  } catch (error) {
    console.log('⚠️ Backend unavailable, using mock templates');
    
    // Fallback to mock templates from utils and localStorage
    const { templates: defaultTemplates } = await import('@/utils/mockData');
    const sessionTemplates = JSON.parse(localStorage.getItem('mockTemplates') || '[]');
    
    // Convert default templates to proper format
    const formattedTemplates: Template[] = defaultTemplates.map(t => ({
      id: t.id,
      TemplateName: t.TemplateName,
      TemplatePrompt: t.TemplatePrompt,
      Category: t.Category,
      Description: t.Description,
      Created_Time: new Date()
    }));
    
    return [...formattedTemplates, ...sessionTemplates];
  }
};

/**
 * Show notification using toast system
 */
export const showNotification = async (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
  console.log(`🔔 ${type.toUpperCase()}: ${message}`);
  
  try {
    const { showToast } = await import('@/utils/notifications');
    showToast(message, { type, duration: type === 'error' ? 6000 : 4000 });
  } catch (error) {
    // Fallback to browser notification or alert if toast system fails
    console.warn('Toast system not available, falling back to alert:', error);
    
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`Dotivra - ${type}`, {
        body: message,
        icon: '/vite.svg'
      });
    } else {
      alert(`${type.toUpperCase()}: ${message}`);
    }
  }
};