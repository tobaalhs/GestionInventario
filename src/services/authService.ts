import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    UserCredential 
  } from 'firebase/auth';
  import { 
    doc, 
    setDoc, 
    getDoc, 
    Timestamp, 
    updateDoc,
    collection,
    query,
    where,
    getDocs
  } from 'firebase/firestore';
  import { auth, db } from '../firebase/config';
  import { User, UserRole, LoginCredentials } from '../interfaces/User';
  
  // Convertir el objeto de autenticación de Firebase al modelo de usuario de la aplicación
  const mapFirebaseUser = async (userCredential: UserCredential): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as Omit<User, 'uid'>;
        
        // Actualizar último login
        await updateDoc(doc(db, 'users', userCredential.user.uid), {
          lastLogin: Timestamp.now()
        });
        
        return {
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          displayName: userCredential.user.displayName || userData.displayName,
          role: userData.role,
          active: userData.active,
          createdAt: userData.createdAt,
          lastLogin: new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error al mapear usuario:', error);
      return null;
    }
  };
  
  // Iniciar sesión con email y contraseña
  export const loginWithEmailAndPassword = async (credentials: LoginCredentials): Promise<User | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );
      
      return await mapFirebaseUser(userCredential);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      throw error;
    }
  };
  
  // Cerrar sesión
  export const logoutUser = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  };
  
  // Crear nuevo usuario (solo administradores pueden usar esta función)
  export const createUser = async (
    email: string, 
    password: string, 
    role: UserRole,
    displayName?: string
  ): Promise<User | null> => {
    try {
      // Crear el usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Crear el documento del usuario en Firestore
      const userData: Omit<User, 'uid'> = {
        email,
        displayName: displayName || '',
        role,
        active: true,
        createdAt: new Date()
      };
      
      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      
      return {
        uid: userCredential.user.uid,
        ...userData
      };
    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw error;
    }
  };
  
  // Obtener todos los usuarios (solo para administradores)
  export const getAllUsers = async (): Promise<User[]> => {
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      return usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as User));
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      throw error;
    }
  };
  
  // Obtener usuarios por rol
  export const getUsersByRole = async (role: UserRole): Promise<User[]> => {
    try {
      const usersCollection = collection(db, 'users');
      const roleQuery = query(usersCollection, where('role', '==', role));
      const usersSnapshot = await getDocs(roleQuery);
      
      return usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as User));
    } catch (error) {
      console.error(`Error al obtener usuarios con rol ${role}:`, error);
      throw error;
    }
  };
  
  // Cambiar el estado activo de un usuario
  export const toggleUserActive = async (uid: string, active: boolean): Promise<void> => {
    try {
      await updateDoc(doc(db, 'users', uid), { active });
    } catch (error) {
      console.error('Error al cambiar estado de usuario:', error);
      throw error;
    }
  };
  
  // Cambiar el rol de un usuario
  export const changeUserRole = async (uid: string, role: UserRole): Promise<void> => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch (error) {
      console.error('Error al cambiar rol de usuario:', error);
      throw error;
    }
  };