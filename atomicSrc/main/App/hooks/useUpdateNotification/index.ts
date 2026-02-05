import { useState, useEffect } from 'react';

import { usePWAUpdate } from '../usePWAUpdate';

export const useUpdateNotification = () => {
  const { needRefresh, updateServiceWorker } = usePWAUpdate();
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  // Show update notification when update is available
  useEffect(() => {
    if (needRefresh) {
      setShowUpdateNotification(true);
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    setShowUpdateNotification(false);
    await updateServiceWorker(true); // This will reload the page
  };

  const handleDismissUpdate = () => {
    setShowUpdateNotification(false);
  };

  return {
    showUpdateNotification,
    handleUpdate,
    handleDismissUpdate,
  };
};
