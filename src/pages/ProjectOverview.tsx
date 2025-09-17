// src/pages/ProjectView.tsx - Thin wrapper page with routing
import React from 'react';
import ProjectViewComponent from '../components/project/ProjectView';

const ProjectOverview: React.FC = () => {
  // The component now handles URL params internally
  return <ProjectViewComponent />;
};

export default ProjectOverview;