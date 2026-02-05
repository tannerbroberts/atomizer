import { useState, useEffect } from 'react';

/**
 * Hook to manage visual error states (pulsing animations)
 * @param triggerTimestamp - A timestamp or value that changes when the error occurs
 * @param duration - Duration of the error state in ms (default 1200ms = 3 cycles of 400ms)
 * @returns boolean indicating if the error state is active
 */
export const useVisualError = (triggerTimestamp: number | null, duration: number = 1200) => {
  const [isErrorActive, setIsErrorActive] = useState(false);

  useEffect(() => {
    if (triggerTimestamp) {
      setIsErrorActive(true);
      const timer = setTimeout(() => setIsErrorActive(false), duration);
      return () => clearTimeout(timer);
    }
  }, [triggerTimestamp, duration]);

  return isErrorActive;
};
