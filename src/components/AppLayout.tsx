import React from 'react';
import { Outlet } from 'react-router-dom';
import FeedbackBanner from './FeedbackBanner';

const AppLayout: React.FC = () => {
  return (
    <>
      <Outlet />
      <FeedbackBanner />
    </>
  );
};

export default AppLayout;
