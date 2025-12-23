// Test: TypeScript enum usage patterns

export enum Color {
  Red = 'RED',
  Green = 'GREEN', 
  Blue = 'BLUE'
}

export const enum InlineEnum {
  A = 1,
  B = 2
}

// Enum as type annotation
export function paintIt(color: Color): string {
  return `Painting ${color}`;
}
