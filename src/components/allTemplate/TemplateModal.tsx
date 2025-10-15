import React from 'react';
import { templates as allTemplates } from '../../utils/mockData';

interface Props {
  id: number;
  onClose: () => void;
}

const TemplateModal: React.FC<Props> = ({ id, onClose }) => {
  const t = allTemplates.find(x => Number(x.id ?? x.Template_Id) === id);
  if (!t) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Add Document</h2>
            <p className="text-sm text-gray-600 mt-1">Create a new document using <span className="font-medium">{t.TemplateName}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Name *</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., User Authentication API" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Create Document</button>
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;
