import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Supplier, ValidationResult } from '../interfaces/Purchase';
import { SupplierFormData, SupplierSearchOptions, SupplierSearchResult } from '../interfaces/FormTypes';
import { validateRut, formatRut } from '../components/auth/Login';

/**
 * Validar datos de proveedor
 */
export const validateSupplierData = (supplierData: Partial<Supplier>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validaciones obligatorias
  if (!supplierData.rut || supplierData.rut.trim() === '') {
    errors.push('El RUT es obligatorio');
  } else if (!validateRut(supplierData.rut)) {
    errors.push('El RUT no tiene un formato válido');
  }

  if (!supplierData.name || supplierData.name.trim() === '') {
    errors.push('El nombre del proveedor es obligatorio');
  }

  if (!supplierData.contact || supplierData.contact.trim() === '') {
    errors.push('La persona de contacto es obligatoria');
  }

  // Validaciones opcionales
  if (supplierData.email && supplierData.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(supplierData.email)) {
      errors.push('El email no tiene un formato válido');
    }
  }

  if (supplierData.phone && supplierData.phone.trim() !== '') {
    const phoneRegex = /^(\+56)?[0-9]{8,9}$/;
    if (!phoneRegex.test(supplierData.phone.replace(/\s/g, ''))) {
      warnings.push('El formato del teléfono puede no ser válido');
    }
  }

  // Validaciones de longitud
  if (supplierData.name && supplierData.name.length > 100) {
    errors.push('El nombre del proveedor no puede exceder 100 caracteres');
  }

  if (supplierData.contact && supplierData.contact.length > 100) {
    errors.push('El nombre del contacto no puede exceder 100 caracteres');
  }

  if (supplierData.address && supplierData.address.length > 200) {
    warnings.push('La dirección es muy larga, considere abreviarla');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Crear un nuevo proveedor
 */
export const createSupplier = async (supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    // Validar datos
    const validation = validateSupplierData(supplierData);
    if (!validation.isValid) {
      throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
    }

    // Formatear RUT
    const formattedRut = formatRut(supplierData.rut);

    // Verificar que el RUT sea único ENTRE PROVEEDORES ACTIVOS
    const existingSupplier = await getSupplierByRut(formattedRut);
    if (existingSupplier && existingSupplier.isActive) {
      throw new Error('Ya existe un proveedor activo con este RUT');
    }

    // Si existe pero está inactivo, reactivarlo en lugar de crear uno nuevo
    if (existingSupplier && !existingSupplier.isActive) {
      console.log('Reactivando proveedor existente:', existingSupplier.id);
      
      // Actualizar datos del proveedor inactivo
      await updateSupplier(existingSupplier.id, {
        ...supplierData,
        rut: formattedRut,
        name: supplierData.name.trim(),
        contact: supplierData.contact.trim(),
        email: supplierData.email?.trim() || '',
        phone: supplierData.phone?.trim() || '',
        address: supplierData.address?.trim() || '',
        isActive: true, // Reactivar
        totalPurchases: existingSupplier.totalPurchases || 0
      });
      
      console.log('Proveedor reactivado exitosamente:', existingSupplier.id);
      return existingSupplier.id;
    }

    // Preparar datos para guardar (nuevo proveedor)
    // ✅ NO incluir campo "id" - Firestore lo asigna automáticamente
    const newSupplier = {
      rut: formattedRut,
      name: supplierData.name.trim(),
      contact: supplierData.contact.trim(),
      email: supplierData.email?.trim() || '',
      phone: supplierData.phone?.trim() || '',
      address: supplierData.address?.trim() || '',
      isActive: true,
      totalPurchases: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    console.log('🏗️ Creando nuevo proveedor con datos:', newSupplier);

    // Guardar en Firestore - addDoc() retorna una referencia con el ID
    const docRef = await addDoc(collection(db, 'suppliers'), newSupplier);
    
    console.log('✅ Proveedor creado exitosamente con ID:', docRef.id);
    return docRef.id; // ← Este es el ID real del documento
  } catch (error) {
    console.error('💥 Error creando proveedor:', error);
    throw error;
  }
};

/**
 * Obtener proveedor por ID
 */
export const getSupplierById = async (id: string): Promise<Supplier | null> => {
  try {
    const docRef = doc(db, 'suppliers', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        lastPurchaseDate: data.lastPurchaseDate?.toDate()
      } as Supplier;
    }
    
    return null;
  } catch (error) {
    console.error('Error obteniendo proveedor:', error);
    throw error;
  }
};

/**
 * Obtener proveedor por RUT
 */
export const getSupplierByRut = async (rut: string): Promise<Supplier | null> => {
  try {
    console.log('🔍 Buscando proveedor con RUT:', rut);
    
    // Limpiar y formatear RUT para búsqueda
    const cleanRut = rut.replace(/[.-\s]/g, '');
    const formattedRut = formatRut(cleanRut);
    
    console.log('📝 RUT formateado para búsqueda:', formattedRut);
    
    const q = query(
      collection(db, 'suppliers'),
      where('rut', '==', formattedRut),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('📊 Documentos encontrados:', querySnapshot.docs.length);
    
    if (!querySnapshot.empty) {
      const docSnapshot = querySnapshot.docs[0];
      const data = docSnapshot.data();
      
      console.log('✅ Proveedor encontrado:', { 
        firestoreId: docSnapshot.id, // ← ID real del documento
        dataId: data.id, // ← Campo "id" interno (probablemente vacío)
        rut: data.rut, 
        name: data.name, 
        isActive: data.isActive 
      });
      
      // ✅ USAR EL ID DEL DOCUMENTO, NO EL CAMPO "id"
      const supplier: Supplier = {
        id: docSnapshot.id, // ← ESTO ES LO IMPORTANTE
        rut: data.rut,
        name: data.name,
        contact: data.contact,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        isActive: data.isActive !== false,
        totalPurchases: data.totalPurchases || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastPurchaseDate: data.lastPurchaseDate?.toDate() || undefined
      };
      
      console.log('🎯 Objeto Supplier construido con ID:', supplier.id);
      return supplier;
    }
    
    console.log('❌ No se encontró proveedor con RUT:', formattedRut);
    return null;
  } catch (error) {
    console.error('💥 Error obteniendo proveedor por RUT:', error);
    throw error;
  }
};

/**
 * Obtener todos los proveedores
 */
export const getSuppliers = async (activeOnly: boolean = true): Promise<Supplier[]> => {
  try {
    let q = collection(db, 'suppliers');
    let queryConstraints: any[] = [];

    if (activeOnly) {
      queryConstraints.push(where('isActive', '==', true));
    }

    // Ordenar por nombre
    queryConstraints.push(orderBy('name', 'asc'));

    const finalQuery = query(q, ...queryConstraints);
    const querySnapshot = await getDocs(finalQuery);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        lastPurchaseDate: data.lastPurchaseDate?.toDate()
      } as Supplier;
    });
  } catch (error) {
    console.error('Error obteniendo proveedores:', error);
    throw error;
  }
};

/**
 * Buscar proveedores por término
 */
export const searchSuppliers = async (searchOptions: SupplierSearchOptions): Promise<SupplierSearchResult[]> => {
  try {
    const { searchTerm, activeOnly, hasRecentPurchases, maxResults } = searchOptions;
    
    // Obtener todos los proveedores (Firestore no soporta búsqueda de texto completa)
    const allSuppliers = await getSuppliers(activeOnly);
    
    // Filtrar por término de búsqueda
    let filteredSuppliers = allSuppliers;
    
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      filteredSuppliers = allSuppliers.filter(supplier => 
        supplier.rut.toLowerCase().includes(term) ||
        supplier.name.toLowerCase().includes(term) ||
        supplier.contact.toLowerCase().includes(term) ||
        supplier.email?.toLowerCase().includes(term)
      );
    }

    // Filtrar por compras recientes
    if (hasRecentPurchases) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      filteredSuppliers = filteredSuppliers.filter(supplier => 
        supplier.lastPurchaseDate && supplier.lastPurchaseDate >= sixMonthsAgo
      );
    }

    // Convertir a formato de resultado de búsqueda
    const results: SupplierSearchResult[] = filteredSuppliers.map(supplier => ({
      id: supplier.id,
      rut: supplier.rut,
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      phone: supplier.phone,
      isActive: supplier.isActive,
      totalPurchases: supplier.totalPurchases || 0,
      lastPurchaseDate: supplier.lastPurchaseDate,
      averageDeliveryTime: calculateAverageDeliveryTime(supplier.id) // TODO: Implementar
    }));

    // Ordenar por relevancia (proveedores con más compras primero)
    results.sort((a, b) => {
      if (b.totalPurchases !== a.totalPurchases) {
        return b.totalPurchases - a.totalPurchases;
      }
      return a.name.localeCompare(b.name);
    });

    // Limitar resultados
    return results.slice(0, maxResults);
  } catch (error) {
    console.error('Error buscando proveedores:', error);
    throw error;
  }
};

/**
 * Calcular tiempo promedio de entrega (placeholder)
 * TODO: Implementar basado en historial de compras
 */
const calculateAverageDeliveryTime = (supplierId: string): number => {
  // Por ahora retorna un valor por defecto
  // En una implementación real, calcularía basado en el historial
  return 7; // 7 días promedio
};

/**
 * Actualizar un proveedor
 */
export const updateSupplier = async (id: string, updates: Partial<Supplier>): Promise<void> => {
  try {
    const docRef = doc(db, 'suppliers', id);
    
    // Verificar que el proveedor existe
    const existingSupplier = await getSupplierById(id);
    if (!existingSupplier) {
      throw new Error('El proveedor no existe');
    }

    // Si se actualiza el RUT, verificar que sea único
    if (updates.rut && updates.rut !== existingSupplier.rut) {
      const supplierWithSameRut = await getSupplierByRut(updates.rut);
      if (supplierWithSameRut && supplierWithSameRut.id !== id) {
        throw new Error('Ya existe otro proveedor con este RUT');
      }
      updates.rut = formatRut(updates.rut);
    }

    // Validar datos actualizados
    const updatedData = { ...existingSupplier, ...updates };
    const validation = validateSupplierData(updatedData);
    if (!validation.isValid) {
      throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
    }

    // Preparar actualizaciones
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now()
    };

    // Convertir lastPurchaseDate a Timestamp si se proporciona
    if (updateData.lastPurchaseDate) {
      updateData.lastPurchaseDate = Timestamp.fromDate(new Date(updateData.lastPurchaseDate));
    }

    // Limpiar campos de texto
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.contact) updateData.contact = updateData.contact.trim();
    if (updateData.email) updateData.email = updateData.email.trim();
    if (updateData.phone) updateData.phone = updateData.phone.trim();
    if (updateData.address) updateData.address = updateData.address.trim();

    await updateDoc(docRef, updateData);
    console.log('Proveedor actualizado exitosamente:', id);
  } catch (error) {
    console.error('Error actualizando proveedor:', error);
    throw error;
  }
};

/**
 * Eliminar un proveedor (soft delete)
 */
export const deleteSupplier = async (id: string): Promise<void> => {
  try {
    // Verificar que el proveedor existe
    const existingSupplier = await getSupplierById(id);
    if (!existingSupplier) {
      throw new Error('El proveedor no existe');
    }

    // Verificar que no tenga compras recientes
    const hasRecentPurchases = await supplierHasRecentPurchases(id);
    if (hasRecentPurchases) {
      throw new Error('No se puede eliminar un proveedor con compras recientes. Use desactivar en su lugar.');
    }

    // Soft delete - marcar como inactivo
    await updateSupplier(id, { 
      isActive: false,
      updatedAt: new Date()
    });
    
    console.log('Proveedor desactivado exitosamente:', id);
  } catch (error) {
    console.error('Error eliminando proveedor:', error);
    throw error;
  }
};

/**
 * Verificar si un proveedor tiene compras recientes
 */
const supplierHasRecentPurchases = async (supplierId: string): Promise<boolean> => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const q = query(
      collection(db, 'purchases'),
      where('supplierId', '==', supplierId),
      where('purchaseDate', '>=', Timestamp.fromDate(threeMonthsAgo)),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error verificando compras recientes:', error);
    return true; // En caso de error, asumir que sí tiene compras recientes
  }
};

/**
 * Reactivar un proveedor
 */
export const reactivateSupplier = async (id: string): Promise<void> => {
  try {
    await updateSupplier(id, { 
      isActive: true,
      updatedAt: new Date()
    });
    
    console.log('Proveedor reactivado exitosamente:', id);
  } catch (error) {
    console.error('Error reactivando proveedor:', error);
    throw error;
  }
};

/**
 * Actualizar estadísticas de compras del proveedor
 */
export const updateSupplierPurchaseStats = async (supplierId: string): Promise<void> => {
  try {
    const supplier = await getSupplierById(supplierId);
    if (!supplier) {
      throw new Error('El proveedor no existe');
    }

    // Obtener todas las compras del proveedor
    const q = query(
      collection(db, 'purchases'),
      where('supplierId', '==', supplierId),
      where('status', '==', 'completed')
    );

    const querySnapshot = await getDocs(q);
    const purchases = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        purchaseDate: data.purchaseDate.toDate(),
        totalAmount: data.totalAmount
      };
    });

    // Calcular estadísticas
    const totalPurchases = purchases.length;
    const lastPurchaseDate = purchases.length > 0 ? 
      new Date(Math.max(...purchases.map(p => p.purchaseDate.getTime()))) : 
      undefined; // ✅ Cambiar null a undefined

    // Actualizar proveedor
    await updateSupplier(supplierId, {
      totalPurchases,
      lastPurchaseDate
    });

    console.log('Estadísticas de proveedor actualizadas:', supplierId);
  } catch (error) {
    console.error('Error actualizando estadísticas de proveedor:', error);
    throw error;
  }
};

/**
 * Obtener proveedores activos para selector
 */
export const getActiveSuppliers = async (): Promise<SupplierSearchResult[]> => {
  try {
    const suppliers = await getSuppliers(true);
    
    return suppliers.map(supplier => ({
      id: supplier.id,
      rut: supplier.rut,
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      phone: supplier.phone,
      isActive: supplier.isActive,
      totalPurchases: supplier.totalPurchases || 0,
      lastPurchaseDate: supplier.lastPurchaseDate,
      averageDeliveryTime: 7 // Valor por defecto
    }));
  } catch (error) {
    console.error('Error obteniendo proveedores activos:', error);
    throw error;
  }
};

/**
 * Validar RUT de proveedor específicamente
 */
export const validateSupplierRut = (rut: string): { isValid: boolean; formatted: string; error?: string } => {
  try {
    if (!rut || rut.trim() === '') {
      return { isValid: false, formatted: '', error: 'El RUT es obligatorio' };
    }

    const cleanRut = rut.replace(/[.-]/g, '');
    if (cleanRut.length < 8) {
      return { isValid: false, formatted: '', error: 'El RUT debe tener al menos 8 caracteres' };
    }

    const isValid = validateRut(rut);
    const formatted = formatRut(cleanRut);

    return {
      isValid,
      formatted,
      error: isValid ? undefined : 'El RUT no es válido'
    };
  } catch (error) {
    return { isValid: false, formatted: '', error: 'Error validando RUT' };
  }
};

/**
 * Crear proveedor desde formulario
 */
export const createSupplierFromForm = async (formData: SupplierFormData, userId: string, userEmail: string): Promise<string> => {
  try {
    const supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> = {
      rut: formData.rut,
      name: formData.name,
      contact: formData.contact,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      isActive: true,
      totalPurchases: 0
    };

    return await createSupplier(supplierData);
  } catch (error) {
    console.error('Error creando proveedor desde formulario:', error);
    throw error;
  }
};

/**
 * Verificar si RUT de proveedor es único
 */
export const isSupplierRutUnique = async (rut: string, excludeId?: string): Promise<boolean> => {
  try {
    const existingSupplier = await getSupplierByRut(rut);
    
    if (!existingSupplier) {
      return true; // RUT único
    }

    // Si se proporciona un ID para excluir (edición), verificar que no sea el mismo
    if (excludeId && existingSupplier.id === excludeId) {
      return true; // Es el mismo proveedor
    }

    return false; // RUT ya existe
  } catch (error) {
    console.error('Error verificando RUT único:', error);
    return false;
  }
};