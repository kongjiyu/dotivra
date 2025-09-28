// src/pages/Profile.tsx - Main profile page (moved from components)
import React from 'react';
import { ProfileHeader, ProfileInfoCard, RecentProjectsCard, DangerZoneCard } from '../components/profile';
import type { Project } from '../types';

const Profile: React.FC = () => {
  // Mock user data
  const user = {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@company.com',
    githubUsername: 'johndoe',
    joinedDate: 'January 2024',
    avatar: undefined
  };

  // Recent projects (will be loaded from real data)
  const recentProjects: Project[] = [];

  // Event handlers
  const handleViewAllProjects = () => {
    console.log('View all projects clicked');
    // TODO: Navigate to projects page or show all projects modal
  };

  const handleProjectClick = (project: Project) => {
    console.log('Project clicked:', project.name);
    // TODO: Navigate to project view
    // navigate(`/project/${project.id}`);
  };

  const handleDeleteAccount = async () => {
    try {
      console.log('Calling profile delete API...');
      
      const response = await fetch('http://localhost:3001/api/profile/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          confirmDelete: true
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Profile delete API response:', data);
        alert('Account deletion request sent successfully!');
        // TODO: Handle successful deletion (e.g., redirect to login)
      } else {
        console.error('Profile delete failed:', data.error);
        alert('Failed to delete account. Please try again.');
      }
    } catch (error) {
      console.error('Profile delete API error:', error);
      alert('Network error. Please check your connection and try again.');
    }
  };

  const handleProfileEdit = async (profileData: any) => {
    try {
      console.log('Calling profile edit API...', profileData);
      
      const response = await fetch('http://localhost:3001/api/profile/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          ...profileData
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Profile edit API response:', data);
        alert('Profile updated successfully!');
        // TODO: Update user state with new data
      } else {
        console.error('Profile edit failed:', data.error);
        alert('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Profile edit API error:', error);
      alert('Network error. Please check your connection and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <ProfileHeader user={user} />

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Profile Information */}
        <ProfileInfoCard user={user} onProfileEdit={handleProfileEdit} />

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