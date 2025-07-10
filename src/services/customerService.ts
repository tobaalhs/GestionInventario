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
import { Customer, ValidationResult } from '../interfaces/Sale';
import { CustomerFormData, CustomerSearchOptions, CustomerSearchResult } from '../interfaces/Sale';
import { validateRut, formatRut } from '../components/auth/Login';

/**
 * Validar datos de cliente
 */
export const validateCustomerData = (customerData: Partial<Customer>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validaciones obligatorias
  if (!customerData.rut || customerData.rut.trim() === '') {
    errors.push('El RUT es obligatorio');
  } else if (!validateRut(customerData.rut)) {
    errors.push('El RUT no tiene un formato válido');
  }

  if (!customerData.name || customerData.name.trim() === '') {
    errors.push('El nombre del cliente es obligatorio');
  }

  if (!customerData.contact || customerData.contact.trim() === '') {
    errors.push('La información de contacto es obligatoria');
  }

  // Validaciones opcionales
  if (customerData.email && customerData.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerData.email)) {
      errors.push('El email no tiene un formato válido');
    }
  }

  if (customerData.phone && customerData.phone.trim() !== '') {
    const phoneRegex = /^(\+56)?[0-9]{8,9}$/;
    if (!phoneRegex.test(customerData.phone.replace(/\s/g, ''))) {
      warnings.push('El formato del teléfono puede no ser válido');
    }
  }

  // Validaciones de longitud
  if (customerData.name && customerData.name.length > 100) {
    errors.push('El nombre del cliente no puede exceder 100 caracteres');
  }

  if (customerData.contact && customerData.contact.length > 100) {
    errors.push('La información de contacto no puede exceder 100 caracteres');
  }

  if (customerData.address && customerData.address.length > 200) {
    warnings.push('La dirección es muy larga, considere abreviarla');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Crear un nuevo cliente
 */
export const createCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    // Validar datos
    const validation = validateCustomerData(customerData);
    if (!validation.isValid) {
      throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
    }

    // Formatear RUT
    const formattedRut = formatRut(customerData.rut);

    // Verificar que el RUT sea único ENTRE CLIENTES ACTIVOS
    const existingCustomer = await getCustomerByRut(formattedRut);
    if (existingCustomer && existingCustomer.isActive) {
      throw new Error('Ya existe un cliente activo con este RUT');
    }

    // Si existe pero está inactivo, reactivarlo en lugar de crear uno nuevo
    if (existingCustomer && !existingCustomer.isActive) {
      console.log('Reactivando cliente existente:', existingCustomer.id);
      
      // Actualizar datos del cliente inactivo
      await updateCustomer(existingCustomer.id, {
        ...customerData,
        rut: formattedRut,
        name: customerData.name.trim(),
        contact: customerData.contact.trim(),
        email: customerData.email?.trim() || '',
        phone: customerData.phone?.trim() || '',
        address: customerData.address?.trim() || '',
        isActive: true, // Reactivar
        totalPurchases: existingCustomer.totalPurchases || 0,
        totalAmount: existingCustomer.totalAmount || 0
      });
      
      console.log('Cliente reactivado exitosamente:', existingCustomer.id);
      return existingCustomer.id;
    }

    // Preparar datos para guardar (nuevo cliente)
    const newCustomer = {
      rut: formattedRut,
      name: customerData.name.trim(),
      contact: customerData.contact.trim(),
      email: customerData.email?.trim() || '',
      phone: customerData.phone?.trim() || '',
      address: customerData.address?.trim() || '',
      isActive: true,
      totalPurchases: 0,
      totalAmount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    console.log('🏗️ Creando nuevo cliente con datos:', newCustomer);

    // Guardar en Firestore
    const docRef = await addDoc(collection(db, 'customers'), newCustomer);
    
    console.log('✅ Cliente creado exitosamente con ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('💥 Error creando cliente:', error);
    throw error;
  }
};

/**
 * Obtener cliente por ID
 */
export const getCustomerById = async (id: string): Promise<Customer | null> => {
  try {
    const docRef = doc(db, 'customers', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        lastPurchaseDate: data.lastPurchaseDate?.toDate()
      } as Customer;
    }
    
    return null;
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    throw error;
  }
};

/**
 * Obtener cliente por RUT
 */
export const getCustomerByRut = async (rut: string): Promise<Customer | null> => {
  try {
    console.log('🔍 Buscando cliente con RUT:', rut);
    
    // Limpiar y formatear RUT para búsqueda
    const cleanRut = rut.replace(/[.-\s]/g, '');
    const formattedRut = formatRut(cleanRut);
    
    console.log('📝 RUT formateado para búsqueda:', formattedRut);
    
    const q = query(
      collection(db, 'customers'),
      where('rut', '==', formattedRut),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('📊 Documentos encontrados:', querySnapshot.docs.length);
    
    if (!querySnapshot.empty) {
      const docSnapshot = querySnapshot.docs[0];
      const data = docSnapshot.data();
      
      console.log('✅ Cliente encontrado:', { 
        firestoreId: docSnapshot.id,
        rut: data.rut, 
        name: data.name, 
        isActive: data.isActive 
      });
      
      const customer: Customer = {
        id: docSnapshot.id,
        rut: data.rut,
        name: data.name,
        contact: data.contact,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        isActive: data.isActive !== false,
        totalPurchases: data.totalPurchases || 0,
        totalAmount: data.totalAmount || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastPurchaseDate: data.lastPurchaseDate?.toDate() || undefined
      };
      
      console.log('🎯 Objeto Customer construido con ID:', customer.id);
      return customer;
    }
    
    console.log('❌ No se encontró cliente con RUT:', formattedRut);
    return null;
  } catch (error) {
    console.error('💥 Error obteniendo cliente por RUT:', error);
    throw error;
  }
};

/**
 * Obtener todos los clientes
 */
export const getCustomers = async (activeOnly: boolean = true): Promise<Customer[]> => {
  try {
    let q = collection(db, 'customers');
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
      } as Customer;
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    throw error;
  }
};

/**
 * Buscar clientes por término
 */
export const searchCustomers = async (searchOptions: CustomerSearchOptions): Promise<CustomerSearchResult[]> => {
  try {
    const { searchTerm, activeOnly, hasRecentPurchases, maxResults } = searchOptions;
    
    // Obtener todos los clientes (Firestore no soporta búsqueda de texto completa)
    const allCustomers = await getCustomers(activeOnly);
    
    // Filtrar por término de búsqueda
    let filteredCustomers = allCustomers;
    
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      filteredCustomers = allCustomers.filter(customer => 
        customer.rut.toLowerCase().includes(term) ||
        customer.name.toLowerCase().includes(term) ||
        customer.contact.toLowerCase().includes(term) ||
        customer.email?.toLowerCase().includes(term)
      );
    }

    // Filtrar por compras recientes
    if (hasRecentPurchases) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      filteredCustomers = filteredCustomers.filter(customer => 
        customer.lastPurchaseDate && customer.lastPurchaseDate >= threeMonthsAgo
      );
    }

    // Convertir a formato de resultado de búsqueda
    const results: CustomerSearchResult[] = filteredCustomers.map(customer => ({
      id: customer.id,
      rut: customer.rut,
      name: customer.name,
      contact: customer.contact,
      email: customer.email,
      phone: customer.phone,
      isActive: customer.isActive,
      totalPurchases: customer.totalPurchases || 0,
      totalAmount: customer.totalAmount || 0,
      lastPurchaseDate: customer.lastPurchaseDate
    }));

    // Ordenar por relevancia (clientes con más compras primero)
    results.sort((a, b) => {
      if (b.totalPurchases !== a.totalPurchases) {
        return b.totalPurchases - a.totalPurchases;
      }
      return a.name.localeCompare(b.name);
    });

    // Limitar resultados
    return results.slice(0, maxResults);
  } catch (error) {
    console.error('Error buscando clientes:', error);
    throw error;
  }
};

/**
 * Actualizar un cliente
 */
export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<void> => {
  try {
    const docRef = doc(db, 'customers', id);
    
    // Verificar que el cliente existe
    const existingCustomer = await getCustomerById(id);
    if (!existingCustomer) {
      throw new Error('El cliente no existe');
    }

    // Si se actualiza el RUT, verificar que sea único
    if (updates.rut && updates.rut !== existingCustomer.rut) {
      const customerWithSameRut = await getCustomerByRut(updates.rut);
      if (customerWithSameRut && customerWithSameRut.id !== id) {
        throw new Error('Ya existe otro cliente con este RUT');
      }
      updates.rut = formatRut(updates.rut);
    }

    // Validar datos actualizados
    const updatedData = { ...existingCustomer, ...updates };
    const validation = validateCustomerData(updatedData);
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
    console.log('Cliente actualizado exitosamente:', id);
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    throw error;
  }
};

/**
 * Eliminar un cliente (soft delete)
 */
export const deleteCustomer = async (id: string): Promise<void> => {
  try {
    // Verificar que el cliente existe
    const existingCustomer = await getCustomerById(id);
    if (!existingCustomer) {
      throw new Error('El cliente no existe');
    }

    // Verificar que no tenga compras recientes
    const hasRecentPurchases = await customerHasRecentPurchases(id);
    if (hasRecentPurchases) {
      throw new Error('No se puede eliminar un cliente con compras recientes. Use desactivar en su lugar.');
    }

    // Soft delete - marcar como inactivo
    await updateCustomer(id, { 
      isActive: false,
      updatedAt: new Date()
    });
    
    console.log('Cliente desactivado exitosamente:', id);
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    throw error;
  }
};

/**
 * Verificar si un cliente tiene compras recientes
 */
const customerHasRecentPurchases = async (customerId: string): Promise<boolean> => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const q = query(
      collection(db, 'sales'),
      where('customerId', '==', customerId),
      where('saleDate', '>=', Timestamp.fromDate(threeMonthsAgo)),
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
 * Reactivar un cliente
 */
export const reactivateCustomer = async (id: string): Promise<void> => {
  try {
    await updateCustomer(id, { 
      isActive: true,
      updatedAt: new Date()
    });
    
    console.log('Cliente reactivado exitosamente:', id);
  } catch (error) {
    console.error('Error reactivando cliente:', error);
    throw error;
  }
};

/**
 * Actualizar estadísticas de compras del cliente
 */
export const updateCustomerPurchaseStats = async (customerId: string): Promise<void> => {
  try {
    const customer = await getCustomerById(customerId);
    if (!customer) {
      throw new Error('El cliente no existe');
    }

    // Obtener todas las ventas del cliente
    const q = query(
      collection(db, 'sales'),
      where('customerId', '==', customerId),
      where('status', '==', 'completed')
    );

    const querySnapshot = await getDocs(q);
    const sales = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        saleDate: data.saleDate.toDate(),
        totalAmount: data.totalAmount
      };
    });

    // Calcular estadísticas
    const totalPurchases = sales.length;
    const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const lastPurchaseDate = sales.length > 0 ? 
      new Date(Math.max(...sales.map(p => p.saleDate.getTime()))) : 
      undefined;

    // Actualizar cliente
    await updateCustomer(customerId, {
      totalPurchases,
      totalAmount,
      lastPurchaseDate
    });

    console.log('Estadísticas de cliente actualizadas:', customerId);
  } catch (error) {
    console.error('Error actualizando estadísticas de cliente:', error);
    throw error;
  }
};

/**
 * Obtener clientes activos para selector
 */
export const getActiveCustomers = async (): Promise<CustomerSearchResult[]> => {
  try {
    const customers = await getCustomers(true);
    
    return customers.map(customer => ({
      id: customer.id,
      rut: customer.rut,
      name: customer.name,
      contact: customer.contact,
      email: customer.email,
      phone: customer.phone,
      isActive: customer.isActive,
      totalPurchases: customer.totalPurchases || 0,
      totalAmount: customer.totalAmount || 0,
      lastPurchaseDate: customer.lastPurchaseDate
    }));
  } catch (error) {
    console.error('Error obteniendo clientes activos:', error);
    throw error;
  }
};

/**
 * Validar RUT de cliente específicamente
 */
export const validateCustomerRut = (rut: string): { isValid: boolean; formatted: string; error?: string } => {
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
 * Crear cliente desde formulario
 */
export const createCustomerFromForm = async (formData: CustomerFormData, userId: string, userEmail: string): Promise<string> => {
  try {
    const customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> = {
      rut: formData.rut,
      name: formData.name,
      contact: formData.contact,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      isActive: true,
      totalPurchases: 0,
      totalAmount: 0
    };

    return await createCustomer(customerData);
  } catch (error) {
    console.error('Error creando cliente desde formulario:', error);
    throw error;
  }
};

/**
 * Verificar si RUT de cliente es único
 */
export const isCustomerRutUnique = async (rut: string, excludeId?: string): Promise<boolean> => {
  try {
    const existingCustomer = await getCustomerByRut(rut);
    
    if (!existingCustomer) {
      return true; // RUT único
    }

    // Si se proporciona un ID para excluir (edición), verificar que no sea el mismo
    if (excludeId && existingCustomer.id === excludeId) {
      return true; // Es el mismo cliente
    }

    return false; // RUT ya existe
  } catch (error) {
    console.error('Error verificando RUT único:', error);
    return false;
  }
};

/**
 * Obtener top clientes por monto
 */
export const getTopCustomers = async (limit: number = 10): Promise<Customer[]> => {
  try {
    const customers = await getCustomers(true);
    
    // Ordenar por monto total descendente
    const sortedCustomers = customers.sort((a, b) => b.totalAmount - a.totalAmount);
    
    return sortedCustomers.slice(0, limit);
  } catch (error) {
    console.error('Error obteniendo top clientes:', error);
    throw error;
  }
};

/**
 * Buscar clientes por texto libre
 */
export const searchCustomersByText = async (searchTerm: string, maxResults: number = 10): Promise<CustomerSearchResult[]> => {
  try {
    const searchOptions: CustomerSearchOptions = {
      searchTerm,
      activeOnly: true,
      hasRecentPurchases: false,
      maxResults
    };
    
    return await searchCustomers(searchOptions);
  } catch (error) {
    console.error('Error buscando clientes por texto:', error);
    throw error;
  }
};