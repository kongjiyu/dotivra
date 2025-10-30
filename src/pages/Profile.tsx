// src/pages/Profile.tsx - Main profile page with real user data
import React, { useState } from 'react';
import Header from '../components/header/Header';
import { ProfileInfoCard, DangerZoneCard } from '../components/profile';
import GitHubConnectionCard from '../components/profile/GitHubConnectionCard';
import { useAuth } from '../context/AuthContext';
import { getUserDisplayInfo } from '../utils/user';
import { useFeedback } from '../components/AppLayout';
import { showError } from '@/utils/sweetAlert';
import { deleteUser } from 'firebase/auth';
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import Swal from 'sweetalert2';

const Profile: React.FC = () => {
  const { user: firebaseUser, userProfile, loading } = useAuth();
  const { openFeedbackModal } = useFeedback();
  const [githubConnected, setGithubConnected] = useState(false);

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

  // Get GitHub username from userProfile or provider data
  const getGitHubUsername = () => {
    // First check userProfile for githubUsername
    if (userProfile?.githubUsername) {
      return userProfile.githubUsername;
    }
    // Then check provider data
    const githubProvider = firebaseUser.providerData.find(p => p.providerId === 'github.com');
    if (githubProvider) {
      return githubProvider.displayName || githubProvider.uid?.split('_')[1] || 'Connected';
    }
    // If GitHub is connected via OAuth, show connected status
    if (githubConnected) {
      return 'Connected';
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
    if (!firebaseUser) return;

    try {
      // Show loading state immediately
      Swal.fire({
        title: 'Deleting Account...',
        html: 'Please wait while we delete your account and all associated data.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // 1. Delete user's projects and associated documents
      const projectsQuery = query(
        collection(db, 'Projects'),
        where('User_Id', '==', firebaseUser.uid)
      );
      const projectsSnapshot = await getDocs(projectsQuery);

      // Delete each project's documents first
      for (const projectDoc of projectsSnapshot.docs) {
        const projectId = projectDoc.id;
        
        // Delete all documents for this project
        const documentsQuery = query(
          collection(db, 'Documents'),
          where('Project_Id', '==', projectId)
        );
        const documentsSnapshot = await getDocs(documentsQuery);
        
        for (const documentDoc of documentsSnapshot.docs) {
          await deleteDoc(doc(db, 'Documents', documentDoc.id));
        }
        
        // Delete the project
        await deleteDoc(doc(db, 'Projects', projectDoc.id));
      }

      // 2. Delete user profile from Firestore
      await deleteDoc(doc(db, 'Users', firebaseUser.uid));

      // 3. Delete Firebase Auth account
      await deleteUser(firebaseUser);

      // 4. Show success and redirect
      Swal.fire({
        title: 'Account Deleted',
        text: 'Your account and all data have been permanently deleted.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error: any) {
      // Handle specific errors
      if (error.code === 'auth/requires-recent-login') {
        Swal.fire({
          title: 'Re-authentication Required',
          html: 'For security reasons, you need to log in again before deleting your account.<br><br>Click "Log Out" to sign out, then log back in and try again.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Log Out Now',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#DC2626',
        }).then((result) => {
          if (result.isConfirmed) {
            // Log out the user
            auth.signOut().then(() => {
              window.location.href = '/login';
            });
          }
        });
      } else {
        showError(
          'Delete Failed',
          error.message || 'Failed to delete account. Please try again.'
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userName={headerName} initials={headerInitials} onFeedbackClick={openFeedbackModal} />
      {/* Header with Logout Button */}
     

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Profile Information */}
        <ProfileInfoCard user={user} />

        {/* GitHub Integration */}
        <GitHubConnectionCard onConnectionChange={(connected) => {
          setGithubConnected(connected);
        }} />

        {/* Danger Zone */}
        <DangerZoneCard onDeleteAccount={handleDeleteAccount} />
      </div>
    </div>
  );
};

export default Profile;
