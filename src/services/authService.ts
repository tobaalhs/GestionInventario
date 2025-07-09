import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  UserCredential,
  sendPasswordResetEmail
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
import { User, UserRole, LoginCredentials, RegisterCredentials } from '../interfaces/User';

// Convertir el objeto de autenticación de Firebase al modelo de usuario de la aplicación
const mapFirebaseUser = async (userCredential: UserCredential): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Actualizar último login
      await updateDoc(doc(db, 'users', userCredential.user.uid), {
        lastLogin: Timestamp.now()
      });
      
      return {
        uid: userCredential.user.uid,
        rut: userData.rut,
        email: userCredential.user.email || userData.email || '',
        displayName: userCredential.user.displayName || userData.displayName,
        role: userData.role,
        active: userData.active,
        createdAt: userData.createdAt.toDate(),
        lastLogin: new Date(),
        securityQuestion: userData.securityQuestion,
        securityAnswer: userData.securityAnswer
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error al mapear usuario:', error);
    return null;
  }
};

// Buscar usuario por RUT
export const getUserByRut = async (rut: string): Promise<{email: string, exists: boolean, uid?: string}> => {
  try {
    const usersCollection = collection(db, 'users');
    const rutQuery = query(usersCollection, where('rut', '==', rut));
    const usersSnapshot = await getDocs(rutQuery);
    
    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0].data();
      const uid = usersSnapshot.docs[0].id;
      return { email: userData.email, exists: true, uid };
    }
    
    return { email: '', exists: false };
  } catch (error) {
    console.error('Error al buscar usuario por RUT:', error);
    throw error;
  }
};

// Iniciar sesión con RUT y contraseña
export const loginWithRutAndPassword = async (credentials: LoginCredentials): Promise<User | null> => {
  try {
    // Buscar email asociado al RUT
    const userInfo = await getUserByRut(credentials.rut);
    
    if (!userInfo.exists) {
      throw new Error('Usuario no encontrado');
    }
    
    // Verificar si el usuario está bloqueado
    if (userInfo.uid) {
      const userDoc = await getDoc(doc(db, 'users', userInfo.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.active === false) {
          throw new Error('Esta cuenta ha sido bloqueada. Por favor, contacte al administrador.');
        }
      }
    }
    
    // Iniciar sesión con email y contraseña en Firebase Auth
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      userInfo.email, 
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

// Obtener la pregunta de seguridad por RUT
export const getSecurityQuestionByRut = async (rut: string): Promise<string | null> => {
  try {
    const userInfo = await getUserByRut(rut);
    
    if (!userInfo.exists) {
      return null;
    }
    
    // Buscar el documento de usuario
    const usersCollection = collection(db, 'users');
    const rutQuery = query(usersCollection, where('rut', '==', rut));
    const usersSnapshot = await getDocs(rutQuery);
    
    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0].data();
      return userData.securityQuestion || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error al obtener pregunta de seguridad:', error);
    throw error;
  }
};

// Verificar respuesta a pregunta de seguridad
export const verifySecurityAnswer = async (rut: string, answer: string): Promise<boolean> => {
  try {
    // Buscar el documento de usuario
    const usersCollection = collection(db, 'users');
    const rutQuery = query(usersCollection, where('rut', '==', rut));
    const usersSnapshot = await getDocs(rutQuery);
    
    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0].data();
      return userData.securityAnswer === answer;
    }
    
    return false;
  } catch (error) {
    console.error('Error al verificar respuesta:', error);
    throw error;
  }
};

// BUILDER PARA CONSTRUCCIÓN COMPLEJA DE USUARIOS
export const createUserWithSecurity = async (
  credentials: RegisterCredentials,
  role: UserRole = UserRole.EMPLOYEE
): Promise<User | null> => {
  try {
    // Verificar que el RUT no esté duplicado
    const rutExists = await getUserByRut(credentials.rut);
    if (rutExists.exists) {
      throw new Error('El RUT ya está registrado');
    }
    
    // Construir autenticación Firebase
    const userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
    
    // Construir documento de usuario en Firestore
    const userData: Omit<User, 'uid'> = {
      rut: credentials.rut,
      email: credentials.email,
      displayName: credentials.displayName || '',
      role,
      active: true,
      createdAt: new Date(),
      securityQuestion: credentials.securityQuestion,
      securityAnswer: credentials.securityAnswer
    };
    
    //Persistir en base de datos
    await setDoc(doc(db, 'users', userCredential.user.uid), userData);
    
    // Retornar producto final construido
    return {
      uid: userCredential.user.uid,
      ...userData
    };
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
};

// Crear nuevo usuario (solo administradores pueden usar esta función)
export const createUser = async (
  rut: string,
  email: string, 
  password: string, 
  role: UserRole,
  displayName?: string,
  securityQuestion?: string,
  securityAnswer?: string
): Promise<User | null> => {
  try {
    // Verificar que el RUT no esté duplicado
    const rutExists = await getUserByRut(rut);
    if (rutExists.exists) {
      throw new Error('El RUT ya está registrado');
    }
    
    // Crear el usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Crear el documento del usuario en Firestore
    const userData: Omit<User, 'uid'> = {
      rut,
      email,
      displayName: displayName || '',
      role,
      active: true,
      createdAt: new Date(),
      securityQuestion,
      securityAnswer
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

// Solicitar restablecimiento de contraseña
export const requestPasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error al solicitar restablecimiento de contraseña:', error);
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

export const activateUser = async (uid: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', uid), { 
      active: true,
      loginAttempts: 0,
      blockedAt: null
    });
  } catch (error) {
    console.error('Error al activar usuario:', error);
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

// Actualizar contraseña de usuario
export const updateUserPassword = async (uid: string, newPassword: string): Promise<void> => {
  try {
    // En un caso real, deberías usar las funciones de Firebase Auth para cambiar la contraseña
    // Aquí solo actualizamos un campo en Firestore para simularlo
    await updateDoc(doc(db, 'users', uid), { 
      passwordLastUpdated: Timestamp.now() 
    });
  } catch (error) {
    console.error('Error al actualizar contraseña:', error);
    throw error;
  }
};

// Bloquear usuario después de intentos fallidos
export const blockUserAfterFailedAttempts = async (uid: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', uid), { 
      active: false,
      blockedAt: Timestamp.now(),
      loginAttempts: 0
    });
  } catch (error) {
    console.error('Error al bloquear usuario:', error);
    throw error;
  }
};

// Incrementar contador de intentos fallidos
export const incrementFailedLoginAttempts = async (uid: string, currentAttempts: number): Promise<number> => {
  try {
    const newAttempts = currentAttempts + 1;
    await updateDoc(doc(db, 'users', uid), { 
      loginAttempts: newAttempts 
    });
    return newAttempts;
  } catch (error) {
    console.error('Error al incrementar intentos fallidos:', error);
    throw error;
  }
};

// Reiniciar contador de intentos fallidos
export const resetLoginAttempts = async (uid: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', uid), { 
      loginAttempts: 0 
    });
  } catch (error) {
    console.error('Error al reiniciar intentos fallidos:', error);
    throw error;
  }
};

export const getBlockedUsers = async (): Promise<User[]> => {
  try {
    const usersCollection = collection(db, 'users');
    const blockedQuery = query(usersCollection, where('active', '==', false));
    const usersSnapshot = await getDocs(blockedQuery);
    
    const blockedUsers = usersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    } as User));

    return blockedUsers.sort((a, b) => {
      const nameA = a.displayName || '';
      const nameB = b.displayName || '';
      return nameA.localeCompare(nameB);
    });
  } catch (error) {
    console.error('Error al obtener usuarios bloqueados:', error);
    throw new Error('Error al cargar la lista de usuarios bloqueados');
  }
};

export const verifyAdminPassword = async (email: string, password: string): Promise<boolean> => {
  try {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return !!credential;
  } catch (error) {
    console.error('Error verificando contraseña de admin:', error);
    return false;
  }
};

export const toggleUserActiveWithTimestamps = async (uid: string, active: boolean): Promise<void> => {
  try {
    const updateData: any = { 
      active,
      updatedAt: Timestamp.now()
    };

    if (!active) {
      updateData.blockedAt = Timestamp.now();
    } else {
      updateData.unblockedAt = Timestamp.now();
    }

    await updateDoc(doc(db, 'users', uid), updateData);
  } catch (error) {
    console.error('Error al cambiar estado de usuario:', error);
    throw error;
  }
};

// Exportar la nueva función de login
export { loginWithRutAndPassword as loginWithEmailAndPassword };