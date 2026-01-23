import { helper, format } from '../Utils';

export const useHelpers = () => {
  const result = helper();
  return format(result);
};
