// Consumes enums
import { Color, InlineEnum, paintIt } from './enum-usage';

// Value usage
const color = Color.Red;
const inline = InlineEnum.A;

// Type annotation usage
function setColor(c: Color): void {
  console.log(c);
}

// Function call
const result = paintIt(Color.Blue);
