import React from 'react';

import { Pointer, PointerProps } from '../index';
import './ErrorPointer.css';

export type ErrorPointerProps = Omit<PointerProps, 'children'> & {
  /**
   * The error message to display. This prop is mandatory.
   */
  message: string;
};

/**
 * ErrorPointer displays a pointer with an error dialog message.
 * The message prop is mandatory and will throw an error if not provided.
 */
const ErrorPointer: React.FC<ErrorPointerProps> = ({
  message,
  ...pointerProps
}) => {
  if (!message) {
    throw new Error('ErrorPointer requires a "message" prop');
  }

  return (
    <Pointer {...pointerProps}>
      <div className="error-pointer-dialog">
        {message}
      </div>
    </Pointer>
  );
};

export { ErrorPointer };
