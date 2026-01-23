import { helper, format } from './utils';

export const useHelpers = () => {
  const result = helper();
  return format(result);
};
