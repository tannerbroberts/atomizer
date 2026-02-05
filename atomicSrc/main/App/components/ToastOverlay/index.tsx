import React, { useState, useEffect } from 'react';
import './ToastOverlay.css';

interface ToastMessage {
  id: number;
  text: string;
}

const ToastOverlay: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleShowToast = (event: CustomEvent<{ message: string }>) => {
      const newToast = {
        id: Date.now(),
        text: event.detail.message,
      };

      setToasts((prev) => [...prev, newToast]);

      // Remove toast after 3 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3000);
    };

    window.addEventListener('tetrix-show-toast' as any, handleShowToast as any);

    return () => {
      window.removeEventListener('tetrix-show-toast' as any, handleShowToast as any);
    };
  }, []);

  return (
    <div className="toast-overlay-container">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast-message">
          {toast.text}
        </div>
      ))}
    </div>
  );
};

export { ToastOverlay };
