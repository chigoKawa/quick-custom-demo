import { BaseIntegration } from '../core/base-integration';
import type { IAuthIntegration, User, AuthCredentials } from './auth.interface';

export class MockAuthAdapter extends BaseIntegration implements IAuthIntegration {
  private users: Map<string, User & { password: string }> = new Map();
  private tokens: Map<string, string> = new Map();

  async initialize(): Promise<void> {
    await super.initialize();

    // Create demo user
    this.users.set('demo@example.com', {
      id: 'user-demo',
      email: 'demo@example.com',
      name: 'Demo User',
      password: 'demo123',
      role: 'customer',
    });
  }

  async login(credentials: AuthCredentials): Promise<{ user: User; token: string }> {
    await this.simulateLatency();

    const user = this.users.get(credentials.email);
    if (!user || user.password !== credentials.password) {
      throw new Error('Invalid credentials');
    }

    const token = `mock-token-${Date.now()}`;
    this.tokens.set(token, user.id);

    const { password, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  async register(userData: Omit<User, 'id'> & { password: string }): Promise<{ user: User; token: string }> {
    await this.simulateLatency();

    if (this.users.has(userData.email)) {
      throw new Error('User already exists');
    }

    const newUser = {
      id: `user-${Date.now()}`,
      ...userData,
    };

    this.users.set(newUser.email, newUser);

    const token = `mock-token-${Date.now()}`;
    this.tokens.set(token, newUser.id);

    const { password, ...userWithoutPassword } = newUser;

    return { user: userWithoutPassword, token };
  }

  async logout(): Promise<void> {
    await this.simulateLatency();
    // In real implementation, would invalidate token
    this.log('info', 'User logged out');
  }

  async getCurrentUser(token: string): Promise<User | null> {
    await this.simulateLatency();

    const userId = this.tokens.get(token);
    if (!userId) {
      return null;
    }

    const user = Array.from(this.users.values()).find((u) => u.id === userId);
    if (!user) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    await this.simulateLatency();

    const user = Array.from(this.users.values()).find((u) => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    Object.assign(user, data);

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async resetPassword(email: string): Promise<void> {
    await this.simulateLatency();

    const user = this.users.get(email);
    if (!user) {
      // Don't reveal if user exists
      this.log('info', 'Password reset requested for:', email);
      return;
    }

    this.log('info', 'Password reset email sent to:', email);
  }
}
