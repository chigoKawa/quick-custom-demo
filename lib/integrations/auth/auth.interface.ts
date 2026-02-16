import type { IBaseIntegration } from '../core/types';

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  metadata?: Record<string, any>;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface IAuthIntegration extends IBaseIntegration {
  login(credentials: AuthCredentials): Promise<{ user: User; token: string }>;
  register(userData: Omit<User, 'id'> & { password: string }): Promise<{ user: User; token: string }>;
  logout(): Promise<void>;
  getCurrentUser(token: string): Promise<User | null>;
  updateProfile(userId: string, data: Partial<User>): Promise<User>;
  resetPassword(email: string): Promise<void>;
}
