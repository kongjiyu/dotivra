// src/components/profile/DangerZoneCard.tsx - Danger zone section
import React from 'react';

interface DangerZoneCardProps {
  onDeleteAccount: () => void;
}

const DangerZoneCard: React.FC<DangerZoneCardProps> = ({ onDeleteAccount }) => {
  const handleDeleteClick = () => {
    // Show confirmation dialog in real implementation
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    
    if (confirmed) {
      onDeleteAccount();
    }
  };

  return (
    <div className="bg-white border border-red-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h2>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Delete Account</h3>
          <p className="text-sm text-gray-600">Permanently delete your account and all data</p>
        </div>
        <button 
          onClick={handleDeleteClick}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
};

export default DangerZoneCard;