export enum UserRole {
    ADMIN = 'admin',
    EMPLOYEE = 'employee'
  }
  
  export interface User {
    uid: string;
    email: string;
    displayName?: string;
    role: UserRole;
    active: boolean;
    createdAt: Date;
    lastLogin?: Date;
  }
  
  export interface LoginCredentials {
    email: string;
    password: string;
  }
  
  export interface AuthContextType {
    currentUser: User | null;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    isAdmin: boolean;
  }