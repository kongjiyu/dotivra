// src/components/profile/ProfileHeader.tsx - Profile header component
import React from 'react';
import { User } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  joinedDate: string;
  avatar?: string;
}

interface ProfileHeaderProps {
  user: User;
  rightContent?: React.ReactNode;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user: _user, rightContent }) => {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account and preferences</p>
          </div>
          {rightContent && (
            <div className="flex items-center space-x-4">
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;