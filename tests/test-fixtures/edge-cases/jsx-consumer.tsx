// Consumes JSX components
import React from 'react';
import { MyComponent, AnotherComponent, withWrapper } from './jsx-usage';

// Direct JSX usage - should be tracked
export const App = () => (
  <AnotherComponent>
    <MyComponent />
  </AnotherComponent>
);

// HOC usage
const WrappedComponent = withWrapper(MyComponent);

// Usage as value, not JSX
const componentRef = MyComponent;
console.log(componentRef);
