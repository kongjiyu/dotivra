import React, { useEffect, useState } from 'react';
import { X, PencilLine, AlertCircle } from 'lucide-react';

interface EditProjectFormData {
  name: string;
  description: string;
}

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: EditProjectFormData;
  onSubmit?: (projectData: EditProjectFormData) => Promise<void> | void;
}

const DEFAULT_FORM_DATA: EditProjectFormData = {
  name: '',
  description: ''
};

const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSubmit
}) => {
  const [formData, setFormData] = useState<EditProjectFormData>(DEFAULT_FORM_DATA);
  const [uiState, setUiState] = useState({
    errors: {} as Record<string, string>,
    isSubmitting: false
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData({
      name: initialData?.name ?? DEFAULT_FORM_DATA.name,
      description: initialData?.description ?? DEFAULT_FORM_DATA.description
    });
    setUiState(prev => ({ ...prev, errors: {}, isSubmitting: false }));
  }, [isOpen, initialData]);

  const handleInputChange = (field: keyof EditProjectFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (uiState.errors[field]) {
      setUiState(prev => ({
        ...prev,
        errors: { ...prev.errors, [field]: '' }
      }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Project name is required';
    }

    if (!formData.description.trim()) {
      errors.description = 'Project description is required';
    }

    setUiState(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setUiState(prev => ({ ...prev, isSubmitting: true, errors: { ...prev.errors, submit: '' } }));

    try {
      await onSubmit?.(formData);
      setUiState(prev => ({ ...prev, isSubmitting: false }));
      onClose();
    } catch (error) {
      console.error('Failed to update project:', error);
      setUiState(prev => ({
        ...prev,
        isSubmitting: false,
        errors: { ...prev.errors, submit: 'Failed to update project. Please try again.' }
      }));
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <PencilLine className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit Project</h3>
                <p className="text-sm text-gray-600">Update the basic details of your project</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => handleInputChange('name', event.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  uiState.errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your project name"
                required
              />
              {uiState.errors.name && (
                <div className="mt-1 flex items-center space-x-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{uiState.errors.name}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(event) => handleInputChange('description', event.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  uiState.errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe what this project is about"
                rows={4}
                required
              />
              {uiState.errors.description && (
                <div className="mt-1 flex items-center space-x-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{uiState.errors.description}</span>
                </div>
              )}
            </div>

            {uiState.errors.submit && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{uiState.errors.submit}</span>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={uiState.isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uiState.isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {uiState.isSubmitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                <span>{uiState.isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProjectModal;

