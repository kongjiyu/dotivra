// src/pages/Profile.tsx - Main profile page with real user data
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { ProfileHeader, ProfileInfoCard, RecentProjectsCard, DangerZoneCard } from '../components/profile';
import { useAuth } from '../context/AuthContext';
import type { Project } from '../types';

const Profile: React.FC = () => {
  const { user: firebaseUser, userProfile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  // Show loading state while fetching user data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Redirect if no user (shouldn't happen due to ProtectedRoute, but good fallback)
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  // Get GitHub username from provider data
  const getGitHubUsername = () => {
    const githubProvider = firebaseUser.providerData.find(p => p.providerId === 'github.com');
    if (githubProvider) {
      // GitHub provider typically stores username in displayName or we can extract from uid
      return githubProvider.displayName || githubProvider.uid?.split('_')[1] || 'Connected';
    }
    return 'Not connected';
  };

  // Format user data for profile components
  const user = {
    id: firebaseUser.uid,
    name: userProfile?.displayName || firebaseUser.displayName || 'User',
    email: firebaseUser.email || 'No email provided',
    githubUsername: getGitHubUsername(),
    joinedDate: userProfile?.createdAt ? 
      new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      }) : 
      'Recently',
    avatar: firebaseUser.photoURL || undefined,
    provider: userProfile?.provider || 'email',
    providerData: firebaseUser.providerData
  };

  // Recent projects (will be loaded from real data)
  const recentProjects: Project[] = [];

  // Event handlers
  const handleViewAllProjects = () => {
    navigate('/projects');
  };

  const handleProjectClick = (project: Project) => {
    navigate(`/project/${project.id}`);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (firebaseUser) {
        // In a real implementation, you would:
        // 1. Delete user data from Firestore
        // 2. Delete Firebase Auth account
        // 3. Handle any cleanup
        
        // For now, just show a message
        alert('Account deletion would be implemented here. This would delete all your data and sign you out.');
        
        // Uncomment below for actual deletion (WARNING: This will permanently delete the account)
        // await firebaseUser.delete();
        // await signOut();
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Logout Button */}
      <ProfileHeader 
        user={user} 
        rightContent={
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        }
      />

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Profile Information */}
        <ProfileInfoCard user={user} />

        {/* Recent Projects */}
        <RecentProjectsCard
          projects={recentProjects}
          onViewAllProjects={handleViewAllProjects}
          onProjectClick={handleProjectClick}
        />

        {/* Danger Zone */}
        <DangerZoneCard onDeleteAccount={handleDeleteAccount} />
      </div>
    </div>
  );
};

export default Profile;