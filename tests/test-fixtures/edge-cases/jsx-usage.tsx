// Test: JSX usage patterns
import React from 'react';

export const MyComponent = () => <div>Hello</div>;

export function AnotherComponent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

// Higher-order component pattern
export function withWrapper(Component: React.ComponentType) {
  return function Wrapped(props: any) {
    return (
      <div className="wrapper">
        <Component {...props} />
      </div>
    );
  };
}
