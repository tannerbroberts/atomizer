import React from 'react';
import { createPortal } from 'react-dom';
import './Overlay.css';

export interface OverlayProps {
  /** Content to render inside the overlay */
  children: React.ReactNode;
  /** Whether the overlay is open/visible */
  isOpen?: boolean;
  /** Called when the backdrop is clicked (useful for closing) */
  onBackdropClick?: () => void;
  /** Called when Escape key is pressed */
  onEscapeKey?: () => void;
  /** Additional class name for the backdrop */
  className?: string;
  /** Additional class name for the content container */
  contentClassName?: string;
  /** Whether to use a portal to render at document.body (default: false) */
  usePortal?: boolean;
  /** Whether the overlay should be centered (default: true) */
  centered?: boolean;
  /** Whether to apply blur backdrop filter (default: true) */
  blur?: boolean;
  /** ARIA label for the dialog */
  ariaLabel?: string;
  /** ARIA labelledby for the dialog */
  ariaLabelledBy?: string;
}

/**
 * Overlay - A reusable overlay component that ensures content never overflows the viewport.
 *
 * Features:
 * - Viewport-constrained sizing with dvh/dvw for mobile compatibility
 * - Scrollable content area when content exceeds available space
 * - Optional portal rendering
 * - Backdrop click handling
 * - Escape key handling
 * - Accessible dialog semantics
 */
const Overlay: React.FC<OverlayProps> = ({
  children,
  isOpen = true,
  onBackdropClick,
  onEscapeKey,
  className = '',
  contentClassName = '',
  usePortal = false,
  centered = true,
  blur = true,
  ariaLabel,
  ariaLabelledBy,
}) => {
  // Handle Escape key
  React.useEffect(() => {
    if (!isOpen || !onEscapeKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscapeKey();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onEscapeKey]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onBackdropClick) {
      onBackdropClick();
    }
  };

  const overlayContent = (
    <div
      className={`overlay-backdrop ${blur ? 'overlay-blur' : ''} ${centered ? 'overlay-centered' : ''} ${className}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      <div className={`overlay-content ${contentClassName}`}>
        {children}
      </div>
    </div>
  );

  if (usePortal) {
    return createPortal(overlayContent, document.body);
  }

  return overlayContent;
};

export { Overlay };
