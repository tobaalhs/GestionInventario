// Reemplaza las importaciones al inicio de purchaseService.ts

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
  limit as firestoreLimit,
  Timestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  Purchase, 
  PurchaseItem, 
  PurchaseStatus, 
  PurchaseFilters,
  PurchaseStatistics,
  ValidationResult,
  ApiResponse
} from '../interfaces/Purchase';
import { PurchaseFormData } from '../interfaces/FormTypes';

// Importaciones de servicios
import { createSupplier, getSupplierByRut } from './supplierService';
import { createStockMovement, updateProductStock } from './stockMovementService';

import { 
  addItemForPurchase, 
  updateStockWithHistoryForPurchase 
} from '../components/inventory/inventoryFunctions';
/**
 * Generar código único para la compra
 */
export const generatePurchaseCode = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6); // Últimos 6 dígitos del timestamp
  
  return `COMP-${year}${month}${day}-${timestamp}`;
};

/**
 * Validar datos de compra antes de procesarla
 */
export const validatePurchaseData = (purchaseData: Partial<Purchase>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validaciones obligatorias
  if (!purchaseData.code || purchaseData.code.trim() === '') {
    errors.push('El código de compra es obligatorio');
  }

  if (!purchaseData.items || purchaseData.items.length === 0) {
    errors.push('Debe incluir al menos un producto en la compra');
  }

  if (!purchaseData.supplierId || purchaseData.supplierId.trim() === '') {
    errors.push('Debe seleccionar un proveedor');
  }

  if (!purchaseData.purchaseDate) {
    errors.push('La fecha de compra es obligatoria');
  }

  if (!purchaseData.userId || purchaseData.userId.trim() === '') {
    errors.push('El usuario responsable es obligatorio');
  }

  // Validaciones de items
  if (purchaseData.items) {
    purchaseData.items.forEach((item, index) => {
      if (!item.productCode || item.productCode.trim() === '') {
        errors.push(`Producto ${index + 1}: El código es obligatorio`);
      }

      if (!item.productName || item.productName.trim() === '') {
        errors.push(`Producto ${index + 1}: El nombre es obligatorio`);
      }

      if (item.quantity <= 0) {
        errors.push(`Producto ${index + 1}: La cantidad debe ser mayor a 0`);
      }

      if (item.unitPrice <= 0) {
        errors.push(`Producto ${index + 1}: El precio debe ser mayor a 0`);
      }

      // Advertencias
      if (item.quantity > 1000) {
        warnings.push(`Producto ${index + 1}: Cantidad muy alta (${item.quantity})`);
      }

      if (item.unitPrice > 1000000) {
        warnings.push(`Producto ${index + 1}: Precio muy alto (${item.unitPrice})`);
      }
    });
  }

  // Validaciones de montos
  if (purchaseData.totalAmount && purchaseData.totalAmount <= 0) {
    errors.push('El monto total debe ser mayor a 0');
  }

  if (purchaseData.totalAmount && purchaseData.totalAmount > 10000000) {
    warnings.push('Monto total muy alto, revise antes de procesar');
  }

  // Validaciones de fecha
  if (purchaseData.purchaseDate) {
    const purchaseDateValue = new Date(purchaseData.purchaseDate);
    const now = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setDate(now.getDate() + 30);

    if (purchaseDateValue > maxFutureDate) {
      errors.push('La fecha de compra no puede ser más de 30 días en el futuro');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Crear una nueva compra
 */
export const createPurchase = async (purchaseData: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    // Validar datos
    const validation = validatePurchaseData(purchaseData);
    if (!validation.isValid) {
      throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
    }

    // Verificar que el código sea único
    const existingPurchase = await getPurchaseByCode(purchaseData.code);
    if (existingPurchase) {
      throw new Error('Ya existe una compra con este código');
    }

    console.log('🏗️ Preparando datos para guardar en Firestore...');

    //  Función helper para limpiar valores undefined
    const cleanObject = (obj: any): any => {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            // Recursivamente limpiar objetos anidados
            const cleanedNested = cleanObject(value);
            if (Object.keys(cleanedNested).length > 0) {
              cleaned[key] = cleanedNested;
            }
          } else {
            cleaned[key] = value;
          }
        }
      });
      return cleaned;
    };

    // Preparar datos para guardar - LIMPIAR VALORES UNDEFINED
    const newPurchase: any = {
      code: purchaseData.code,
      items: purchaseData.items.map(item => cleanObject({
        productId: item.productId || '',
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        category: item.category || 'Sin categoría',
        isNewProduct: item.isNewProduct,
        batchCode: item.batchCode || '',
        // Solo agregar expirationDate si tiene valor
        ...(item.expirationDate && { expirationDate: Timestamp.fromDate(new Date(item.expirationDate)) })
      })),
      supplierId: purchaseData.supplierId || '',
      supplierInfo: cleanObject({
        id: purchaseData.supplierInfo.id || '',
        rut: purchaseData.supplierInfo.rut,
        name: purchaseData.supplierInfo.name,
        contact: purchaseData.supplierInfo.contact,
        email: purchaseData.supplierInfo.email || '',
        phone: purchaseData.supplierInfo.phone || '',
        address: purchaseData.supplierInfo.address || '',
        isActive: purchaseData.supplierInfo.isActive !== false,
        totalPurchases: purchaseData.supplierInfo.totalPurchases || 0,
        createdAt: purchaseData.supplierInfo.createdAt ? Timestamp.fromDate(new Date(purchaseData.supplierInfo.createdAt)) : Timestamp.now(),
        updatedAt: Timestamp.now()
      }),
      purchaseDate: Timestamp.fromDate(new Date(purchaseData.purchaseDate)),
      totalAmount: purchaseData.totalAmount,
      totalQuantity: purchaseData.totalQuantity,
      comments: purchaseData.comments || '',
      userId: purchaseData.userId,
      userEmail: purchaseData.userEmail,
      status: purchaseData.status || PurchaseStatus.PENDING,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // Solo agregar expirationDate si tiene valor
    if (purchaseData.expirationDate) {
      newPurchase.expirationDate = Timestamp.fromDate(new Date(purchaseData.expirationDate));
    }

    console.log('✅ Datos limpiados preparados para Firestore');
    console.log('📊 Estructura final:', {
      itemsCount: newPurchase.items.length,
      supplierId: newPurchase.supplierId,
      supplierName: newPurchase.supplierInfo.name,
      totalAmount: newPurchase.totalAmount
    });

    // Guardar en Firestore
    const docRef = await addDoc(collection(db, 'purchases'), newPurchase);
    
    console.log('✅ Compra creada exitosamente con ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('💥 Error creando compra:', error);
    throw error;
  }
};

/**
 * Obtener compra por ID
 */
export const getPurchaseById = async (id: string): Promise<Purchase | null> => {
  try {
    const docRef = doc(db, 'purchases', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        purchaseDate: data.purchaseDate.toDate(),
        expirationDate: data.expirationDate?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Purchase;
    }
    
    return null;
  } catch (error) {
    console.error('Error obteniendo compra:', error);
    throw error;
  }
};

/**
 * Obtener compra por código
 */
export const getPurchaseByCode = async (code: string): Promise<Purchase | null> => {
  try {
    const q = query(
      collection(db, 'purchases'),
      where('code', '==', code),
      firestoreLimit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        purchaseDate: data.purchaseDate.toDate(),
        expirationDate: data.expirationDate?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Purchase;
    }
    
    return null;
  } catch (error) {
    console.error('Error obteniendo compra por código:', error);
    throw error;
  }
};

/**
 * Obtener todas las compras con filtros opcionales
 */
export const getPurchases = async (filters?: PurchaseFilters): Promise<Purchase[]> => {
  try {
    let q = collection(db, 'purchases');
    let queryConstraints: any[] = [];

    // Aplicar filtros
    if (filters) {
      if (filters.supplierId) {
        queryConstraints.push(where('supplierId', '==', filters.supplierId));
      }

      if (filters.status) {
        queryConstraints.push(where('status', '==', filters.status));
      }

      if (filters.startDate) {
        queryConstraints.push(where('purchaseDate', '>=', Timestamp.fromDate(filters.startDate)));
      }

      if (filters.endDate) {
        queryConstraints.push(where('purchaseDate', '<=', Timestamp.fromDate(filters.endDate)));
      }

      if (filters.minAmount) {
        queryConstraints.push(where('totalAmount', '>=', filters.minAmount));
      }

      if (filters.maxAmount) {
        queryConstraints.push(where('totalAmount', '<=', filters.maxAmount));
      }
    }

    // Ordenar por fecha de creación (más recientes primero)
    queryConstraints.push(orderBy('createdAt', 'desc'));

    const finalQuery = query(q, ...queryConstraints);
    const querySnapshot = await getDocs(finalQuery);
    
    const purchases: Purchase[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        purchaseDate: data.purchaseDate.toDate(),
        expirationDate: data.expirationDate?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Purchase;
    });

    // Filtro adicional por término de búsqueda (no soportado por Firestore directamente)
    if (filters?.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      return purchases.filter(purchase => 
        purchase.code.toLowerCase().includes(searchTerm) ||
        purchase.comments?.toLowerCase().includes(searchTerm) ||
        purchase.supplierInfo.name.toLowerCase().includes(searchTerm)
      );
    }

    return purchases;
  } catch (error) {
    console.error('Error obteniendo compras:', error);
    throw error;
  }
};

/**
 * Actualizar una compra
 */
export const updatePurchase = async (id: string, updates: Partial<Purchase>): Promise<void> => {
  try {
    const docRef = doc(db, 'purchases', id);
    
    // Verificar que la compra existe
    const existingPurchase = await getPurchaseById(id);
    if (!existingPurchase) {
      throw new Error('La compra no existe');
    }

    // Preparar actualizaciones
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now()
    };

    // Si se actualiza la fecha de compra, convertir a Timestamp
    if (updates.purchaseDate) {
      updateData.purchaseDate = Timestamp.fromDate(new Date(updates.purchaseDate));
    }

    if (updates.expirationDate) {
      updateData.expirationDate = Timestamp.fromDate(new Date(updates.expirationDate));
    }

    await updateDoc(docRef, updateData);
    console.log('Compra actualizada exitosamente:', id);
  } catch (error) {
    console.error('Error actualizando compra:', error);
    throw error;
  }
};

/**
 * Eliminar una compra
 */
export const deletePurchase = async (id: string): Promise<void> => {
  try {
    // Verificar que la compra existe
    const existingPurchase = await getPurchaseById(id);
    if (!existingPurchase) {
      throw new Error('La compra no existe');
    }

    // Verificar que se puede eliminar (solo compras pendientes o canceladas)
    if (existingPurchase.status === PurchaseStatus.COMPLETED) {
      throw new Error('No se puede eliminar una compra completada');
    }

    const docRef = doc(db, 'purchases', id);
    await deleteDoc(docRef);
    
    console.log('Compra eliminada exitosamente:', id);
  } catch (error) {
    console.error('Error eliminando compra:', error);
    throw error;
  }
};

/**
 * Procesar transacción completa de compra

 */
export const processPurchaseTransaction = async (purchaseData: Purchase): Promise<void> => {
  try {
    console.log('Iniciando procesamiento de compra:', purchaseData.code);
    console.log('Datos del proveedor recibidos:', {
      supplierId: purchaseData.supplierId,
      supplierName: purchaseData.supplierInfo.name,
      hasSupplierData: !!purchaseData.supplierInfo
    });

    // Usar transacción de Firestore para garantizar consistencia
    await runTransaction(db, async (transaction) => {
      // 1. Manejar proveedor
      let finalSupplierId = purchaseData.supplierId;
      
      if (!finalSupplierId || finalSupplierId.trim() === '') {
        // Caso: Proveedor nuevo - crear uno nuevo
        console.log('Creando nuevo proveedor...');
        finalSupplierId = await createSupplier(purchaseData.supplierInfo);
        console.log('Nuevo proveedor creado con ID:', finalSupplierId);
      } else {
        // Caso: Proveedor existente - solo usar el ID proporcionado
        console.log('Usando proveedor existente con ID:', finalSupplierId);
      }

      // Actualizar el purchaseData con el ID final del proveedor
      purchaseData.supplierId = finalSupplierId;

      // 2. Procesar cada producto
      for (const item of purchaseData.items) {
        let productId = item.productId;

        if (item.isNewProduct || !productId) {
          //  CASO 1: PRODUCTO NUEVO 
          console.log('Registrando nuevo producto con historial:', item.productName);
          
          const newProductData = {
            name: item.productName,
            code: item.productCode,
            category: item.category || 'Sin categoría',
            price: item.unitPrice,
            sellPrice: item.unitPrice * 1.3, // 30% de margen por defecto
            supplier: purchaseData.supplierInfo.name,
            stock: item.quantity, 
            description: '',
            imageUrl: '',
            imageAlt: `Imagen de ${item.productName}`,
            isActive: true
          };

          productId = await addItemForPurchase(
            newProductData,
            purchaseData.userId,
            purchaseData.userEmail,
            purchaseData.code 
          );
          
          // Actualizar el item con el ID del producto creado
          item.productId = productId;
        } else {
          //  CASO 2: PRODUCTO EXISTENTE - CON HISTORIAL
          console.log('Actualizando producto existente con historial:', item.productName);
          
          //  REGISTRAR HISTORIAL DEL CAMBIO DE STOCK
          await updateStockWithHistoryForPurchase(
            productId,
            item.quantity,
            item.unitPrice,
            purchaseData.userId,
            purchaseData.userEmail,
            purchaseData.code,
            purchaseData.supplierInfo.name
          );
        }

        // 3. Crear movimiento de stock (esto SÍ actualiza el stock)
        console.log('Creando movimiento de stock para:', item.productName);
        
        const movementData: any = {
          type: 'purchase' as any,
          productId: productId,
          productCode: item.productCode,
          productName: item.productName,
          quantity: item.quantity,
          previousStock: 0, // Se calculará en createStockMovement
          newStock: 0, // Se calculará en createStockMovement
          unitPrice: item.unitPrice,
          totalValue: item.totalPrice,
          purchaseId: '', // Se asignará después de crear la compra
          supplierId: finalSupplierId,
          userId: purchaseData.userId,
          userEmail: purchaseData.userEmail,
          comments: `Compra ${purchaseData.code}`,
          batchCode: item.batchCode
        };
        
        // Solo agregar expirationDate si tiene valor
        if (item.expirationDate) {
          movementData.expirationDate = item.expirationDate;
        }
        
        //  ESTA FUNCIÓN YA ACTUALIZA EL STOCK CORRECTAMENTE
        await createStockMovement(movementData);
      }

      // 4. Crear la compra
      console.log('Registrando compra en base de datos...');
      
      const purchaseId = await createPurchase({
        ...purchaseData,
        supplierId: finalSupplierId,
        status: PurchaseStatus.COMPLETED
      });

      console.log('✅ Compra procesada exitosamente con historial completo:', purchaseData.code);
    });

  } catch (error) {
    console.error('Error procesando transacción de compra:', error);
    throw new Error(`Error procesando compra: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};

/**
 * Cancelar una compra
 */
export const cancelPurchase = async (id: string, reason?: string): Promise<void> => {
  try {
    const purchase = await getPurchaseById(id);
    if (!purchase) {
      throw new Error('La compra no existe');
    }

    if (purchase.status === PurchaseStatus.COMPLETED) {
      throw new Error('No se puede cancelar una compra completada');
    }

    await updatePurchase(id, {
      status: PurchaseStatus.CANCELLED,
      comments: purchase.comments ? 
        `${purchase.comments}\n\nCANCELADA: ${reason || 'Sin motivo especificado'}` :
        `CANCELADA: ${reason || 'Sin motivo especificado'}`
    });

    console.log('Compra cancelada exitosamente:', id);
  } catch (error) {
    console.error('Error cancelando compra:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de compras
 */
export const getPurchaseStatistics = async (startDate?: Date, endDate?: Date): Promise<PurchaseStatistics> => {
  try {
    const filters: PurchaseFilters = {};
    
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const purchases = await getPurchases(filters);

    // Calcular estadísticas básicas
    const totalPurchases = purchases.length;
    const totalAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalItems = purchases.reduce((sum, p) => sum + p.totalQuantity, 0);
    const averagePurchaseAmount = totalPurchases > 0 ? totalAmount / totalPurchases : 0;

    // Top proveedores
    const supplierStatsMap = new Map<string, { name: string; purchases: number; amount: number }>();
    purchases.forEach(purchase => {
      const key = purchase.supplierId;
      const existing = supplierStatsMap.get(key) || { 
        name: purchase.supplierInfo.name, 
        purchases: 0, 
        amount: 0 
      };
      existing.purchases += 1;
      existing.amount += purchase.totalAmount;
      supplierStatsMap.set(key, existing);
    });

    const topSuppliers = Array.from(supplierStatsMap.entries())
      .map(([id, stats]) => ({
        supplierId: id,
        supplierName: stats.name,
        totalPurchases: stats.purchases,
        totalAmount: stats.amount,
        percentage: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    // Tendencia mensual
    const monthlyStatsMap = new Map<string, { purchases: number; amount: number; items: number }>();
    purchases.forEach(purchase => {
      const monthKey = purchase.purchaseDate.toISOString().substring(0, 7); // YYYY-MM
      const existing = monthlyStatsMap.get(monthKey) || { purchases: 0, amount: 0, items: 0 };
      existing.purchases += 1;
      existing.amount += purchase.totalAmount;
      existing.items += purchase.totalQuantity;
      monthlyStatsMap.set(monthKey, existing);
    });

    const monthlyTrend = Array.from(monthlyStatsMap.entries())
      .map(([month, stats]) => ({
        month,
        purchases: stats.purchases,
        amount: stats.amount,
        items: stats.items
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Desglose por categoría
    const categoryStatsMap = new Map<string, { purchases: number; amount: number; items: number }>();
    purchases.forEach(purchase => {
      purchase.items.forEach(item => {
        const category = item.category || 'Sin categoría';
        const existing = categoryStatsMap.get(category) || { purchases: 0, amount: 0, items: 0 };
        existing.purchases += 1;
        existing.amount += item.totalPrice;
        existing.items += item.quantity;
        categoryStatsMap.set(category, existing);
      });
    });

    const categoryBreakdown = Array.from(categoryStatsMap.entries())
      .map(([category, stats]) => ({
        category,
        purchases: stats.purchases,
        amount: stats.amount,
        items: stats.items,
        percentage: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalPurchases,
      totalAmount,
      totalItems,
      averagePurchaseAmount,
      topSuppliers,
      monthlyTrend,
      categoryBreakdown
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    throw error;
  }
};

/**
 * Buscar compras por término
 */
export const searchPurchases = async (searchTerm: string): Promise<Purchase[]> => {
  try {
    const filters: PurchaseFilters = {
      searchTerm: searchTerm.trim()
    };
    
    return await getPurchases(filters);
  } catch (error) {
    console.error('Error buscando compras:', error);
    throw error;
  }
};

/**
 * Obtener compras recientes
 */
export const getRecentPurchases = async (limitCount: number = 10): Promise<Purchase[]> => {
  try {
    const q = query(
      collection(db, 'purchases'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        purchaseDate: data.purchaseDate.toDate(),
        expirationDate: data.expirationDate?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Purchase;
    });
  } catch (error) {
    console.error('Error obteniendo compras recientes:', error);
    throw error;
  }
};

/**
 * Verificar si un código de compra ya existe
 */
export const isPurchaseCodeUnique = async (code: string): Promise<boolean> => {
  try {
    const existingPurchase = await getPurchaseByCode(code);
    return existingPurchase === null;
  } catch (error) {
    console.error('Error verificando código único:', error);
    return false;
  }
};