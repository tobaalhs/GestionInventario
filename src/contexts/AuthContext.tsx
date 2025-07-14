import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User, UserRole, LoginCredentials, AuthContextType } from '../interfaces/User';
import { loginWithRutAndPassword, logoutUser } from '../services/authService';

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
    // SUSCRIPCIÓN AL OBSERVABLE (Firebase Auth)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // OBSERVER CALLBACK - Se ejecuta cuando cambia el estado de auth
      if (firebaseUser) {
        try {
          // NOTIFICACIÓN: Usuario autenticado
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // ACTUALIZAR ESTADO DE TODOS LOS COMPONENTES SUSCRITOS
            setCurrentUser({
              uid: firebaseUser.uid,
              rut: userData.rut, // Añadimos el RUT
              email: firebaseUser.email || userData.email || '',
              displayName: firebaseUser.displayName || userData.displayName,
              role: userData.role,
              active: userData.active,
              createdAt: userData.createdAt.toDate(),
              lastLogin: userData.lastLogin ? userData.lastLogin.toDate() : new Date()
            });
          } else {
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
    
    // CLEANUP: Desuscribirse cuando el componente se desmonte
    return () => unsubscribe();
  }, []);

  // Función para iniciar sesión con RUT
  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    try {
      const user = await loginWithRutAndPassword(credentials);
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

  // PROVEER EL ESTADO A TODOS LOS OBSERVADORES (componentes hijos)
  const value: AuthContextType = {
    currentUser,
    isLoading,
    login,
    logout,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}  {/* TODOS LOS COMPONENTES HIJOS SON OBSERVADORES */}
    </AuthContext.Provider>
  );
};