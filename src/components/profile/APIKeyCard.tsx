import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

const APIKeyCard: React.FC = () => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing API key on mount
  useEffect(() => {
    const loadApiKey = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'Users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.apiKeyAI) {
            setApiKey(data.apiKeyAI);
          }
        }
      } catch (error) {
        console.error('Error loading API key:', error);
      } finally {
        setLoading(false);
      }
    };

    loadApiKey();
  }, [user]);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      alert('Please enter an API key');
      return;
    }

    if (!user) {
      alert('You must be logged in to save API key');
      return;
    }

    setSaving(true);
    try {
      // Save API key to Users collection
      await updateDoc(doc(db, 'Users', user.uid), {
        apiKeyAI: apiKey.trim()
      });
      
      alert('API key saved successfully!');
    } catch (error: any) {
      console.error('Error saving API key:', error);
      alert(`Failed to save API key: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetApiKey = async () => {
    if (!user) {
      alert('You must be logged in to reset API key');
      return;
    }

    const confirmReset = window.confirm('Are you sure you want to reset your API key? This action cannot be undone.');
    if (!confirmReset) return;

    setSaving(true);
    try {
      // Remove API key from Users collection
      await updateDoc(doc(db, 'Users', user.uid), {
        apiKeyAI: null
      });
      
      setApiKey('');
      alert('API key reset successfully!');
    } catch (error: any) {
      console.error('Error resetting API key:', error);
      alert(`Failed to reset API key: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
            <Key className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Assistant API Key</h2>
            <p className="text-sm text-blue-600">Add your AI API key for AI features</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-5 space-y-4">
        {/* API Key Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            AI API Key
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full pl-4 pr-12 py-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600 transition-colors"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-blue-600">
            🔒 Your key is stored securely in your profile
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveApiKey}
            disabled={!apiKey.trim() || saving || loading}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r text-white from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-all text-sm shadow-md hover:shadow-lg"
          >
            <div className="text-white">{saving ? 'Updating...' : loading ? 'Loading...' : 'Update API Key'}</div>
          </button>
          
          <button
            type="button"
            onClick={handleResetApiKey}
            disabled={!apiKey || saving || loading}
            className="px-4 py-2.5 bg-white text-red-600 border-2 border-red-300 rounded-lg hover:bg-red-50 hover:border-red-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed font-medium transition-all text-sm"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default APIKeyCard;
