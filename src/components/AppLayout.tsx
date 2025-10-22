import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import FeedbackBanner from './FeedbackBanner';
import FeedbackModal from './FeedbackModal';

export const FeedbackContext = React.createContext<{
  openFeedbackModal: () => void;
} | undefined>(undefined);

export const useFeedback = () => {
  const context = React.useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within AppLayout');
  }
  return context;
};

const AppLayout: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openFeedbackModal = () => {
    setIsModalOpen(true);
  };

  return (
    <FeedbackContext.Provider value={{ openFeedbackModal }}>
      <Outlet />
      <FeedbackBanner onOpenFeedback={openFeedbackModal} />
      <FeedbackModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </FeedbackContext.Provider>
  );
};

export default AppLayout;
