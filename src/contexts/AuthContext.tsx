import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User, UserRole, LoginCredentials, AuthContextType } from '../interfaces/User';
import { loginWithEmailAndPassword, logoutUser } from '../services/authService';

// Singleton para evitar múltiples instancias del contexto
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  isAdmin: false
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

// Proveedor de autenticación
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Obtener datos adicionales de la bd
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            setCurrentUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || userData.displayName,
              role: userData.role,
              active: userData.active,
              createdAt: userData.createdAt.toDate(),
              lastLogin: userData.lastLogin ? userData.lastLogin.toDate() : new Date()
            });
          } else {
            // Usuario autenticado pero sin documento en Firestore
            setCurrentUser(null);
          }
        } catch (error) {
          console.error('Error al obtener datos de usuario:', error);
          setCurrentUser(null);
        }
      } else {
        // Usuario no autenticado
        setCurrentUser(null);
      }
      
      setIsLoading(false);
    });
    
    // Limpiar la suscripción cuando el componente se desmonte
    return () => unsubscribe();
  }, []);

  // Función para iniciar sesión
  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    try {
      const user = await loginWithEmailAndPassword(credentials);
      if (!user) {
        throw new Error('No se pudo obtener la información del usuario');
      }
      setCurrentUser(user);
    } catch (error) {
      console.error('Error en contexto de autenticación (login):', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await logoutUser();
      setCurrentUser(null);
    } catch (error) {
      console.error('Error en contexto de autenticación (logout):', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar si el usuario es administrador
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const value: AuthContextType = {
    currentUser,
    isLoading,
    login,
    logout,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};