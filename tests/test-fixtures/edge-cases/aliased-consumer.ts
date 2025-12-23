// Consumer that uses aliased imports
import { originalName as aliasedName, originalFunction as renamedFunc } from './aliased-imports';

export const result = aliasedName + 1;
export const greeting = renamedFunc();
