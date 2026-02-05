import './FullScreenButton.css';
import { useEffect, useState, useRef } from 'react';

import { CallToActionPointer } from '../Pointer/CallToActionPointer';

function FullScreenButton() {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Check if running in standalone mode (PWA)
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
        || window.matchMedia('(display-mode: fullscreen)').matches
        || (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Listen for changes
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');

    const handleChange = () => checkStandalone();

    if (standaloneQuery.addEventListener) {
      standaloneQuery.addEventListener('change', handleChange);
      fullscreenQuery.addEventListener('change', handleChange);
      return () => {
        standaloneQuery.removeEventListener('change', handleChange);
        fullscreenQuery.removeEventListener('change', handleChange);
      };
    }
    // Fallback for older browsers
    standaloneQuery.addListener(handleChange);
    fullscreenQuery.addListener(handleChange);
    return () => {
      standaloneQuery.removeListener(handleChange);
      fullscreenQuery.removeListener(handleChange);
    };
  }, []);

  const goFullScreen = () => {
    // make the browser full screen
    const doc = document.documentElement;
    if (doc.requestFullscreen && !isFullScreen) {
      doc.requestFullscreen();
      setIsFullScreen(true);
    }
  };

  useEffect(() => {
    const fullScreenChangeHandler = () => {
      if (document.fullscreenElement) {
        setIsFullScreen(true);
      } else {
        setIsFullScreen(false);
      }
    };
    document.addEventListener('fullscreenchange', fullScreenChangeHandler);
    return () => {
      document.removeEventListener('fullscreenchange', fullScreenChangeHandler);
    };
  });

  return (
    <>
      {!isFullScreen && !isStandalone ? (
        <button
          ref={buttonRef}
          className="full-screen-button"
          onClick={goFullScreen}
          aria-label="Enter Full Screen"
        >
          <span>+</span>
        </button>
      ) : null}

      {!isStandalone && (
        <CallToActionPointer
          targetRef={buttonRef}
          callKey="fullscreen-button"
          label="Try fullscreen mode!"
          timeout={5 * 60 * 60 * 1000}
          offsetFromTarget={80}
        />
      )}
    </>
  );
}

export { FullScreenButton };
