/**
 * Example Unit Test
 */
import { UserFactory } from '../utils/mock-factories';

describe('UserFactory', () => {
  beforeEach(() => {
    UserFactory.reset();
  });
  
  it('should create a user with default values', () => {
    const user = UserFactory.create();
    
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user.userType).toBe('sugar_daddy');
  });
});
