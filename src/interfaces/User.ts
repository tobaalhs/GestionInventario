export enum UserRole {
  ADMIN = 'admin',
  EMPLOYEE = 'employee'
}

export interface User {
  uid: string;
  rut: string;
  email?: string;
  displayName?: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  lastLogin?: Date;
  securityQuestion?: string;
  securityAnswer?: string;
}

export interface LoginCredentials {
  rut: string;
  password: string;
}

export interface RegisterCredentials {
  rut: string;
  email: string;
  password: string;
  displayName?: string;
  securityQuestion: string;
  securityAnswer: string;
}

export interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}