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

  const handleDeleteAccount = () => {
    console.log('Delete account confirmed');
    // TODO: Implement account deletion logic
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <ProfileHeader user={user} />

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