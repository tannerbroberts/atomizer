// Test: Circular dependencies should not cause infinite loops
import { circularB } from './circular-b';

export const circularA = "A uses B: " + circularB;
