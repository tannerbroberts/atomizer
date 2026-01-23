import UserService from '../Service';

export const useUserService = () => {
  const service = new UserService();
  return service.getUser('123');
};
