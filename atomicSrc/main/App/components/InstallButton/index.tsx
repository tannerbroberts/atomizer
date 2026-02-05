import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './InstallButton.css';

// Interface for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const InstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      console.log('Captured beforeinstallprompt event');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  // Don't render if installed
  if (isInstalled) {
    return null;
  }

  // Render if we have a prompt OR if we're on iOS (and not installed)
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <>
      <button
        className="menu-action-button install-pwa-button"
        onClick={handleInstallClick}
        title="Install Tetrix as an app for offline play"
      >
        Install App 📱
      </button>

      {showIOSInstructions && createPortal(
        <div className="ios-instructions-overlay" onClick={() => setShowIOSInstructions(false)}>
          <div className="ios-instructions-card" onClick={(e) => e.stopPropagation()}>
            <button className="ios-close-button" onClick={() => setShowIOSInstructions(false)}>✕</button>
            <h3>Install on iOS</h3>
            <div className="ios-step">
              <span className="ios-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span>
              <span>Tap the <strong>Share</strong> button in your browser menu bar.</span>
            </div>
            <div className="ios-step">
              <span className="ios-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </span>
              <span>Scroll down and select <strong>Add to Home Screen</strong>.</span>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export { InstallButton };
