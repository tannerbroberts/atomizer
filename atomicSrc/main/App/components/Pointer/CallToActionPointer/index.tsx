import React, { useEffect, useState } from 'react';

import { saveCallToActionTimestamp, loadCallToActionTimestamp } from '../../../utils/persistence';
import { Pointer, PointerProps } from '../index';
import './CallToActionPointer.css';

export type CallToActionPointerProps = Omit<PointerProps, 'children' | 'isVisible'> & {
  /**
   * Unique key for this call-to-action. Used for persistence.
   * This prop is mandatory.
   */
  callKey: string;

  /**
   * Label/message to display in the call-to-action.
   * This prop is mandatory.
   */
  label: string;

  /**
   * Timeout in milliseconds before the call-to-action automatically appears.
   * This prop is mandatory.
   */
  timeout: number;
};

/**
 * CallToActionPointer displays a pointer with a dismissible call-to-action message.
 * It tracks when it was last dismissed using IndexedDB and only shows again after the timeout.
 * All props (callKey, label, timeout) are mandatory and will throw errors if not provided.
 */
const CallToActionPointer: React.FC<CallToActionPointerProps> = ({
  callKey,
  label,
  timeout,
  ...pointerProps
}) => {
  // Validate mandatory props
  if (!callKey) {
    throw new Error('CallToActionPointer requires a "callKey" prop');
  }
  if (!label) {
    throw new Error('CallToActionPointer requires a "label" prop');
  }
  if (timeout === undefined || timeout === null) {
    throw new Error('CallToActionPointer requires a "timeout" prop');
  }

  const [isVisible, setIsVisible] = useState(false);
  const [isDismissedForSession, setIsDismissedForSession] = useState(false);

  useEffect(() => {
    const checkVisibility = async () => {
      if (isDismissedForSession) {
        setIsVisible(false);
        return;
      }

      try {
        const lastDismissedResult = await loadCallToActionTimestamp(callKey);
        const now = Date.now();

        let lastDismissed: number | null = null;
        if (lastDismissedResult.status === 'success') {
          lastDismissed = lastDismissedResult.data;
        }

        if (!lastDismissed || (now - lastDismissed) >= timeout) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      } catch (error) {
        console.error('Failed to load call-to-action timestamp:', error);
        // Default to showing on error
        setIsVisible(true);
      }
    };

    checkVisibility();
  }, [callKey, timeout, isDismissedForSession]);

  const handleDismiss = async () => {
    setIsDismissedForSession(true);
    setIsVisible(false);

    try {
      await saveCallToActionTimestamp(callKey, Date.now());
    } catch (error) {
      console.error('Failed to save call-to-action timestamp:', error);
    }
  };

  return (
    <Pointer {...pointerProps} isVisible={isVisible}>
      <div className="call-to-action-pointer-container">
        <div className="call-to-action-pointer-message">
          {label}
        </div>
        <button
          className="call-to-action-pointer-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss call to action"
        >
          ✕
        </button>
      </div>
    </Pointer>
  );
};

export { CallToActionPointer };
