// src/pages/Profile.tsx - Main profile page with real user data
import React from 'react';
import Header from '../components/header/Header';
import { ProfileInfoCard, DangerZoneCard } from '../components/profile';
import GitHubConnectionCard from '../components/profile/GitHubConnectionCard';
import { useAuth } from '../context/AuthContext';
import { getUserDisplayInfo } from '../utils/user';

const Profile: React.FC = () => {
  const { user: firebaseUser, userProfile, loading } = useAuth();

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

  const { name: headerName, initials: headerInitials } = getUserDisplayInfo(userProfile, firebaseUser);

  // Logout is handled via the global header dropdown

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
      <Header userName={headerName} initials={headerInitials} />
      {/* Header with Logout Button */}
     

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Profile Information */}
        <ProfileInfoCard user={user} />

        {/* GitHub Integration */}
        <GitHubConnectionCard onConnectionChange={(connected) => {
          console.log('GitHub connection status changed:', connected);
        }} />

        {/* Danger Zone */}
        <DangerZoneCard onDeleteAccount={handleDeleteAccount} />
      </div>
    </div>
  );
};

export default Profile;
