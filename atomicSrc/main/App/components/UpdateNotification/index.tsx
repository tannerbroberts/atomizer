import React from 'react';
import './UpdateNotification.css';

interface UpdateNotificationProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onUpdate, onDismiss }) => {
  return (
    <div className="update-notification">
      <div className="update-notification-content">
        <div className="update-notification-text">
          <span className="update-icon">🎉</span>
          <div className="update-message">
            <strong>New version available!</strong>
            <span className="update-subtitle">Update now to get the latest features</span>
          </div>
        </div>
        <div className="update-notification-actions">
          <button className="update-button update-button-primary" onClick={onUpdate}>
            Update Now
          </button>
          <button className="update-button update-button-secondary" onClick={onDismiss}>
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export { UpdateNotification };
