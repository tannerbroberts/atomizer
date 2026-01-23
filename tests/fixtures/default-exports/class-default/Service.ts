export default class UserService {
  getUser(id: string) {
    return { id, name: 'User' };
  }

  saveUser(user: any) {
    console.log('Saving user', user);
  }
}
