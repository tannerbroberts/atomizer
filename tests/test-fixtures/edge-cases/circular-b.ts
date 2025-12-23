// Circular dependency
import { circularA } from './circular-a';

export const circularB = "B uses A: " + typeof circularA;
