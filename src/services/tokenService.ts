import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  DownloadToken, 
  TokenGenerationConfig, 
  TokenValidationResult, 
  TokenDownloadConfig 
} from '../interfaces/DownloadToken';

/**
 * Generar un token único y seguro
 */
const generateSecureToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const tokenLength = 32;
  let result = '';
  
  for (let i = 0; i < tokenLength; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Agregar timestamp para mayor unicidad
  const timestamp = Date.now().toString(36);
  return `${result}_${timestamp}`;
};

/**
 * Crear un token temporal para descarga
 */
export const createDownloadToken = async (config: TokenGenerationConfig): Promise<string> => {
  try {
    console.log('🔗 Creando token de descarga temporal...');

    const token = generateSecureToken();
    const now = new Date();
    const expirationHours = config.expirationHours || 24;
    const expiresAt = new Date(now.getTime() + (expirationHours * 60 * 60 * 1000));

    const tokenData: Omit<DownloadToken, 'id'> = {
      token,
      reportId: config.reportId,
      reportTitle: '', // Se llenará desde el reporte
      format: config.format,
      createdAt: now,
      expiresAt,
      isUsed: false,
      createdByEmail: config.createdByEmail,
      downloadCount: 0,
      maxDownloads: config.maxDownloads || 0 // 0 = ilimitado
    };

    // Guardar en Firestore
    const docRef = await addDoc(collection(db, 'downloadTokens'), {
      ...tokenData,
      createdAt: Timestamp.fromDate(tokenData.createdAt),
      expiresAt: Timestamp.fromDate(tokenData.expiresAt)
    });

    console.log('✅ Token creado exitosamente:', { 
      tokenId: docRef.id, 
      token: token.substring(0, 8) + '...', 
      expiresAt: expiresAt.toISOString() 
    });

    return token;

  } catch (error) {
    console.error('❌ Error creando token de descarga:', error);
    throw new Error('No se pudo crear el token de descarga');
  }
};

/**
 * Validar un token de descarga
 */
export const validateDownloadToken = async (
  token: string, 
  reportId: string, 
  format?: 'excel' | 'pdf'
): Promise<TokenValidationResult> => {
  try {
    console.log('🔍 Validando token de descarga...', { 
      token: token.substring(0, 8) + '...', 
      reportId 
    });

    // Buscar token en la base de datos
    const tokensQuery = query(
      collection(db, 'downloadTokens'),
      where('token', '==', token),
      where('reportId', '==', reportId)
    );

    const querySnapshot = await getDocs(tokensQuery);

    if (querySnapshot.empty) {
      console.warn('⚠️ Token no encontrado');
      return {
        isValid: false,
        error: 'Token de descarga no válido o expirado',
        errorCode: 'NOT_FOUND'
      };
    }

    const tokenDoc = querySnapshot.docs[0];
    const tokenData = tokenDoc.data();
    
    const downloadToken: DownloadToken = {
      id: tokenDoc.id,
      token: tokenData.token,
      reportId: tokenData.reportId,
      reportTitle: tokenData.reportTitle || '',
      format: tokenData.format,
      createdAt: tokenData.createdAt.toDate(),
      expiresAt: tokenData.expiresAt.toDate(),
      isUsed: tokenData.isUsed || false,
      usedAt: tokenData.usedAt?.toDate(),
      createdByEmail: tokenData.createdByEmail,
      downloadCount: tokenData.downloadCount || 0,
      maxDownloads: tokenData.maxDownloads || 0,
      ipAddress: tokenData.ipAddress,
      userAgent: tokenData.userAgent
    };

    // Verificar si el token ha expirado
    const now = new Date();
    if (downloadToken.expiresAt < now) {
      console.warn('⚠️ Token expirado');
      return {
        isValid: false,
        error: 'El enlace de descarga ha expirado',
        errorCode: 'EXPIRED'
      };
    }

    // Verificar límite de descargas si está configurado
    if (downloadToken.maxDownloads > 0 && downloadToken.downloadCount >= downloadToken.maxDownloads) {
      console.warn('⚠️ Límite de descargas excedido');
      return {
        isValid: false,
        error: 'Se ha excedido el límite de descargas para este enlace',
        errorCode: 'MAX_DOWNLOADS_EXCEEDED'
      };
    }

    // Verificar formato si se especifica
    if (format && downloadToken.format !== format) {
      console.warn('⚠️ Formato no coincide');
      return {
        isValid: false,
        error: 'El formato solicitado no coincide con el token',
        errorCode: 'INVALID_FORMAT'
      };
    }

    console.log('✅ Token válido');
    return {
      isValid: true,
      token: downloadToken
    };

  } catch (error) {
    console.error('❌ Error validando token:', error);
    return {
      isValid: false,
      error: 'Error interno al validar el token',
      errorCode: 'NOT_FOUND'
    };
  }
};

/**
 * Marcar token como usado y actualizar estadísticas
 */
export const markTokenAsUsed = async (
  tokenId: string, 
  config?: { ipAddress?: string; userAgent?: string }
): Promise<void> => {
  try {
    console.log('📝 Marcando token como usado:', tokenId);

    const tokenRef = doc(db, 'downloadTokens', tokenId);
    const tokenDoc = await getDoc(tokenRef);

    if (!tokenDoc.exists()) {
      throw new Error('Token no encontrado');
    }

    const currentData = tokenDoc.data();
    const newDownloadCount = (currentData.downloadCount || 0) + 1;

    const updateData: any = {
      downloadCount: newDownloadCount,
      usedAt: Timestamp.now()
    };

    // Actualizar información de seguimiento si se proporciona
    if (config?.ipAddress) {
      updateData.ipAddress = config.ipAddress;
    }

    if (config?.userAgent) {
      updateData.userAgent = config.userAgent;
    }

    // Si es la primera vez que se usa, marcar como usado
    if (!currentData.isUsed) {
      updateData.isUsed = true;
    }

    await updateDoc(tokenRef, updateData);

    console.log('✅ Token actualizado exitosamente');

  } catch (error) {
    console.error('❌ Error marcando token como usado:', error);
    throw error;
  }
};

/**
 * Limpiar tokens expirados (función de mantenimiento)
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  try {
    console.log('🧹 Limpiando tokens expirados...');

    const now = new Date();
    const expiredQuery = query(
      collection(db, 'downloadTokens'),
      where('expiresAt', '<', Timestamp.fromDate(now))
    );

    const querySnapshot = await getDocs(expiredQuery);
    let deletedCount = 0;

    // Eliminar tokens expirados en lotes
    const deletePromises = querySnapshot.docs.map(async (docSnapshot) => {
      await deleteDoc(doc(db, 'downloadTokens', docSnapshot.id));
      deletedCount++;
    });

    await Promise.all(deletePromises);

    console.log(`✅ ${deletedCount} tokens expirados eliminados`);
    return deletedCount;

  } catch (error) {
    console.error('❌ Error limpiando tokens expirados:', error);
    return 0;
  }
};

/**
 * Obtener información de un token (sin validar)
 */
export const getTokenInfo = async (tokenId: string): Promise<DownloadToken | null> => {
  try {
    const tokenRef = doc(db, 'downloadTokens', tokenId);
    const tokenDoc = await getDoc(tokenRef);

    if (!tokenDoc.exists()) {
      return null;
    }

    const tokenData = tokenDoc.data();
    
    return {
      id: tokenDoc.id,
      token: tokenData.token,
      reportId: tokenData.reportId,
      reportTitle: tokenData.reportTitle || '',
      format: tokenData.format,
      createdAt: tokenData.createdAt.toDate(),
      expiresAt: tokenData.expiresAt.toDate(),
      isUsed: tokenData.isUsed || false,
      usedAt: tokenData.usedAt?.toDate(),
      createdByEmail: tokenData.createdByEmail,
      downloadCount: tokenData.downloadCount || 0,
      maxDownloads: tokenData.maxDownloads || 0,
      ipAddress: tokenData.ipAddress,
      userAgent: tokenData.userAgent
    };

  } catch (error) {
    console.error('❌ Error obteniendo información del token:', error);
    return null;
  }
};

/**
 * Invalidar un token (marcarlo como expirado)
 */
export const invalidateToken = async (tokenId: string): Promise<void> => {
  try {
    console.log('🚫 Invalidando token:', tokenId);

    const tokenRef = doc(db, 'downloadTokens', tokenId);
    const now = new Date();
    
    await updateDoc(tokenRef, {
      expiresAt: Timestamp.fromDate(new Date(now.getTime() - 1000)), // Expira hace 1 segundo
      isUsed: true,
      usedAt: Timestamp.now()
    });

    console.log('✅ Token invalidado exitosamente');

  } catch (error) {
    console.error('❌ Error invalidando token:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de uso de tokens
 */
export const getTokenStatistics = async (reportId?: string): Promise<{
  totalTokens: number;
  activeTokens: number;
  expiredTokens: number;
  totalDownloads: number;
  averageDownloadsPerToken: number;
}> => {
  try {
    console.log('📊 Obteniendo estadísticas de tokens...');

    let baseQuery = collection(db, 'downloadTokens');
    let queryConstraints: any[] = [];

    if (reportId) {
      queryConstraints.push(where('reportId', '==', reportId));
    }

    const tokensQuery = query(baseQuery, ...queryConstraints);
    const querySnapshot = await getDocs(tokensQuery);
    
    const now = new Date();
    let totalTokens = 0;
    let activeTokens = 0;
    let expiredTokens = 0;
    let totalDownloads = 0;

    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const expiresAt = data.expiresAt.toDate();
      
      totalTokens++;
      totalDownloads += (data.downloadCount || 0);
      
      if (expiresAt > now) {
        activeTokens++;
      } else {
        expiredTokens++;
      }
    });

    const averageDownloadsPerToken = totalTokens > 0 ? totalDownloads / totalTokens : 0;

    const stats = {
      totalTokens,
      activeTokens,
      expiredTokens,
      totalDownloads,
      averageDownloadsPerToken
    };

    console.log('✅ Estadísticas obtenidas:', stats);
    return stats;

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return {
      totalTokens: 0,
      activeTokens: 0,
      expiredTokens: 0,
      totalDownloads: 0,
      averageDownloadsPerToken: 0
    };
  }
};