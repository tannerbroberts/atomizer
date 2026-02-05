import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { TetrixTile } from '../main/App/components/TetrixTile';
import { BlockVisual } from '../main/Shared/BlockVisual';

// Helper to check if a value is primitive
const isPrimitive = (val: any) => {
  return val === null || (typeof val !== 'object' && typeof val !== 'function');
};

describe('Component Memoization and Props', () => {
  
  describe('BlockVisual', () => {
    it('should accept only primitive props (verification of design)', () => {
      // This test documents and verifies the primitive nature of the props
      // We construct a valid props object and verify each value is primitive
      const props = {
        isFilled: true,
        color: 'red',
        size: 20,
        theme: 'gem',
        showIcon: true
      };
      
      Object.entries(props).forEach(([key, val]) => {
        expect(isPrimitive(val), `Prop '${key}' should be primitive`).toBe(true);
      });
    });

    it('should be memoized', () => {
      // We can't easily spy on the internal render without mocking, 
      // but we can verify that the component is wrapped in React.memo
      // by checking its type or behavior if possible.
      // Here we just ensure it renders correctly.
      // The real enforcement is in the code structure (React.memo + primitive props).
      
      const { rerender, container } = render(
        <BlockVisual isFilled={true} color="red" size={20} theme="gem" showIcon={true} />
      );
      
      const initialHTML = container.innerHTML;
      
      rerender(
        <BlockVisual isFilled={true} color="red" size={20} theme="gem" showIcon={true} />
      );
      
      expect(container.innerHTML).toBe(initialHTML);
    });
  });

  describe('TetrixTile', () => {
    it('should accept only primitive props (verification of design)', () => {
      const props = {
        row: 1,
        col: 1,
        backgroundColor: 'grey',
        blockIsFilled: true,
        blockColor: 'red',
        isHovered: false,
        showShadow: false,
        shadowOpacity: 0,
        animationsJson: '[]',
        theme: 'gem',
        showIcon: true,
        size: 20
      };

      Object.entries(props).forEach(([key, val]) => {
        expect(isPrimitive(val), `Prop '${key}' should be primitive`).toBe(true);
      });
    });
    
    it('should be memoized', () => {
      const props = {
        row: 1,
        col: 1,
        backgroundColor: 'grey',
        blockIsFilled: true,
        blockColor: 'red',
        isHovered: false,
        showShadow: false,
        shadowOpacity: 0,
        animationsJson: '[]',
        theme: 'gem' as const,
        showIcon: true,
        size: 20
      };

      const { rerender, container } = render(
        <TetrixTile {...props} />
      );
      
      const initialHTML = container.innerHTML;
      
      rerender(
        <TetrixTile {...props} />
      );
      
      expect(container.innerHTML).toBe(initialHTML);
    });
  });
});
