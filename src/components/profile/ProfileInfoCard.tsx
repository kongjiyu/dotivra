// src/components/profile/ProfileInfoCard.tsx - Profile information card
import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, Save, Github } from 'lucide-react';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  githubUsername: string;
  joinedDate: string;
  avatar?: string;
}

interface ProfileInfoCardProps {
  user: UserInfo;
  onProfileEdit: (profileData: any) => Promise<void>;
}

const ProfileInfoCard: React.FC<ProfileInfoCardProps> = ({ user, onProfileEdit }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    githubUsername: user.githubUsername
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    try {
      console.log('📝 Starting profile save process...');
      console.log('Form data to save:', formData);
      setIsSubmitting(true);
      await onProfileEdit(formData);
      setIsEditing(false);
      console.log('✅ Profile save completed successfully');
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      alert('Error saving profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      email: user.email,
      githubUsername: user.githubUsername
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
        {!isEditing ? (
          <button
            onClick={() => {
              console.log('🔧 Edit Profile button clicked');
              setIsEditing(true);
            }}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit Profile
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Profile Avatar & Basic Info */}
      <div className="flex items-start space-x-6 mb-8">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="h-10 w-10 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-1">{user.name}</h3>
          <p className="text-gray-600 mb-2">{user.email}</p>
          <p className="text-sm text-gray-500">Member since {user.joinedDate}</p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={!isEditing}
              className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
              }`}
            />
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={!isEditing}
              className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
              }`}
            />
          </div>
        </div>

        {/* GitHub Username Field */}
        <div>
          <label htmlFor="githubUsername" className="block text-sm font-medium text-gray-700 mb-2">
            GitHub Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Github className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="githubUsername"
              type="text"
              value={formData.githubUsername}
              onChange={(e) => handleInputChange('githubUsername', e.target.value)}
              disabled={!isEditing}
              className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
              }`}
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="md:col-span-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              defaultValue="••••••••"
              disabled={!isEditing}
              className={`w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
              }`}
              placeholder={isEditing ? "Enter new password" : ""}
            />
            {isEditing && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      {isEditing && (
        <div className="mt-6 flex justify-end">
          <button 
            onClick={handleSaveChanges}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileInfoCard;