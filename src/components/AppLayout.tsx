import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import FeedbackBanner from './FeedbackBanner';
import FeedbackModal from './FeedbackModal';

const AppLayout: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Outlet />
      <FeedbackBanner onOpenFeedback={() => setIsModalOpen(true)} />
      <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default AppLayout;
