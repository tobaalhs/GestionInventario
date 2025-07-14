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
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  StockMovement, 
  StockMovementType, 
  StockMovementFilters 
} from '../interfaces/Purchase';
import { getItemById, updateItem } from '../components/inventory/inventoryFunctions';

/**
 * Crear un nuevo movimiento de stock
 */
export const createStockMovement = async (movementData: Omit<StockMovement, 'id' | 'createdAt'>): Promise<string> => {
  try {
    console.log('🏗️ Creando movimiento de stock:', movementData.productName);

    // Obtener información actual del producto
    const productDoc = await getDoc(doc(db, 'items', movementData.productId));
    if (!productDoc.exists()) {
      throw new Error('El producto no existe');
    }

    const productData = productDoc.data();
    const previousStock = productData.stock || 0;

    // Calcular nuevo stock basado en el tipo de movimiento
    let newStock = previousStock;
    switch (movementData.type) {
      case StockMovementType.PURCHASE:
        newStock = previousStock + movementData.quantity;
        break;
      case StockMovementType.SALE:
        newStock = previousStock - movementData.quantity;
        break;
      case StockMovementType.ADJUSTMENT:
        newStock = previousStock + movementData.quantity;
        break;
      case StockMovementType.RETURN:
        newStock = previousStock + movementData.quantity;
        break;
      case StockMovementType.EXPIRED:
      case StockMovementType.DAMAGED:
        newStock = previousStock - movementData.quantity;
        break;
      default:
        throw new Error('Tipo de movimiento no válido');
    }

    // Verificar que el stock no sea negativo
    if (newStock < 0) {
      console.warn(`⚠️ Stock negativo detectado para producto ${movementData.productCode}: ${newStock}`);
    }

    // Preparar datos del movimiento - LIMPIAR VALORES UNDEFINED
    const movement: any = {
      type: movementData.type.toString(), 
      productId: movementData.productId,
      productCode: movementData.productCode,
      productName: movementData.productName,
      quantity: movementData.quantity,
      previousStock,
      newStock,
      userId: movementData.userId,
      userEmail: movementData.userEmail,
      createdAt: Timestamp.now()
    };

    if (movementData.unitPrice !== undefined && movementData.unitPrice !== null) {
      movement.unitPrice = movementData.unitPrice;
    }

    if (movementData.totalValue !== undefined && movementData.totalValue !== null) {
      movement.totalValue = movementData.totalValue;
    } else if (movement.unitPrice) {
      movement.totalValue = movementData.quantity * movement.unitPrice;
    }

    if (movementData.purchaseId) {
      movement.purchaseId = movementData.purchaseId;
    }

    if (movementData.supplierId) {
      movement.supplierId = movementData.supplierId;
    }

    if (movementData.comments) {
      movement.comments = movementData.comments;
    }

    if (movementData.batchCode) {
      movement.batchCode = movementData.batchCode;
    }

    if (movementData.expirationDate) {
      movement.expirationDate = Timestamp.fromDate(new Date(movementData.expirationDate));
    }

    console.log('✅ Datos de movimiento preparados:', {
      type: movement.type,
      productName: movement.productName,
      quantity: movement.quantity,
      previousStock: movement.previousStock,
      newStock: movement.newStock
    });

    // Usar transacción para garantizar consistencia
    const result = await runTransaction(db, async (transaction) => {
      // Crear el movimiento
      const movementRef = doc(collection(db, 'stockMovements'));
      transaction.set(movementRef, movement);

      // Actualizar el stock del producto
      const productRef = doc(db, 'items', movementData.productId);
      transaction.update(productRef, {
        stock: newStock,
        updatedAt: Timestamp.now()
      });

      return movementRef.id;
    });

    console.log('✅ Movimiento de stock creado exitosamente:', result);
    return result;
  } catch (error) {
    console.error('💥 Error creando movimiento de stock:', error);
    throw error;
  }
};

/**
 * Obtener movimientos de stock con filtros
 */
export const getStockMovements = async (filters?: StockMovementFilters): Promise<StockMovement[]> => {
  try {
    let q = collection(db, 'stockMovements');
    let queryConstraints: any[] = [];

    // Aplicar filtros
    if (filters) {
      if (filters.productId) {
        queryConstraints.push(where('productId', '==', filters.productId));
      }

      if (filters.type) {
        queryConstraints.push(where('type', '==', filters.type));
      }

      if (filters.userId) {
        queryConstraints.push(where('userId', '==', filters.userId));
      }

      if (filters.startDate) {
        queryConstraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.startDate)));
      }

      if (filters.endDate) {
        queryConstraints.push(where('createdAt', '<=', Timestamp.fromDate(filters.endDate)));
      }
    }

    // Ordenar por fecha de creación (más recientes primero)
    queryConstraints.push(orderBy('createdAt', 'desc'));

    const finalQuery = query(q, ...queryConstraints);
    const querySnapshot = await getDocs(finalQuery);
    
    const movements: StockMovement[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        expirationDate: data.expirationDate?.toDate()
      } as StockMovement;
    });

    // Filtro adicional por término de búsqueda (no soportado por Firestore directamente)
    if (filters?.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      return movements.filter(movement => 
        movement.productCode.toLowerCase().includes(searchTerm) ||
        movement.productName.toLowerCase().includes(searchTerm) ||
        movement.comments?.toLowerCase().includes(searchTerm)
      );
    }

    return movements;
  } catch (error) {
    console.error('Error obteniendo movimientos de stock:', error);
    throw error;
  }
};

/**
 * Obtener movimientos por producto
 */
export const getMovementsByProduct = async (productId: string): Promise<StockMovement[]> => {
  try {
    const filters: StockMovementFilters = { productId };
    return await getStockMovements(filters);
  } catch (error) {
    console.error('Error obteniendo movimientos por producto:', error);
    throw error;
  }
};

/**
 * Obtener movimientos por tipo
 */
export const getMovementsByType = async (type: StockMovementType): Promise<StockMovement[]> => {
  try {
    const filters: StockMovementFilters = { type };
    return await getStockMovements(filters);
  } catch (error) {
    console.error('Error obteniendo movimientos por tipo:', error);
    throw error;
  }
};

/**
 * Actualizar stock de un producto directamente
 */
export const updateProductStock = async (
  productId: string, 
  quantity: number, 
  operation: 'add' | 'subtract' | 'set' = 'add'
): Promise<void> => {
  try {
    console.log(`Actualizando stock del producto ${productId}: ${operation} ${quantity}`);

    await runTransaction(db, async (transaction) => {
      const productRef = doc(db, 'items', productId);
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists()) {
        throw new Error('El producto no existe');
      }

      const currentStock = productDoc.data().stock || 0;
      let newStock: number;

      switch (operation) {
        case 'add':
          newStock = currentStock + quantity;
          break;
        case 'subtract':
          newStock = currentStock - quantity;
          break;
        case 'set':
          newStock = quantity;
          break;
        default:
          throw new Error('Operación no válida');
      }

      // Verificar stock negativo
      if (newStock < 0) {
        console.warn(`Stock negativo para producto ${productId}: ${newStock}`);
      }

      transaction.update(productRef, {
        stock: newStock,
        updatedAt: Timestamp.now()
      });
    });

    console.log('Stock actualizado exitosamente');
  } catch (error) {
    console.error('Error actualizando stock:', error);
    throw error;
  }
};

/**
 * Crear movimiento de ajuste de stock
 */
export const createStockAdjustment = async (
  productId: string,
  newStock: number,
  reason: string,
  userId: string,
  userEmail: string
): Promise<string> => {
  try {
    // Obtener stock actual
    const productDoc = await getDoc(doc(db, 'items', productId));
    if (!productDoc.exists()) {
      throw new Error('El producto no existe');
    }

    const productData = productDoc.data();
    const currentStock = productData.stock || 0;
    const adjustment = newStock - currentStock;

    if (adjustment === 0) {
      throw new Error('No hay diferencia en el stock para ajustar');
    }

    // Crear movimiento de ajuste
    const movementData: Omit<StockMovement, 'id' | 'createdAt'> = {
      type: StockMovementType.ADJUSTMENT,
      productId,
      productCode: productData.code,
      productName: productData.name,
      quantity: adjustment, // Positivo o negativo
      previousStock: currentStock,
      newStock: 0, // Se calculará en createStockMovement
      userId,
      userEmail,
      comments: `Ajuste de stock: ${reason}`
    };

    return await createStockMovement(movementData);
  } catch (error) {
    console.error('Error creando ajuste de stock:', error);
    throw error;
  }
};

/**
 * Registrar venta (salida de stock)
 */
export const registerSale = async (
  productId: string,
  quantity: number,
  unitPrice: number,
  userId: string,
  userEmail: string,
  comments?: string
): Promise<string> => {
  try {
    // Verificar stock disponible
    const productDoc = await getDoc(doc(db, 'items', productId));
    if (!productDoc.exists()) {
      throw new Error('El producto no existe');
    }

    const productData = productDoc.data();
    const currentStock = productData.stock || 0;

    if (currentStock < quantity) {
      throw new Error(`Stock insuficiente. Disponible: ${currentStock}, Solicitado: ${quantity}`);
    }

    // Crear movimiento de venta
    const movementData: Omit<StockMovement, 'id' | 'createdAt'> = {
      type: StockMovementType.SALE,
      productId,
      productCode: productData.code,
      productName: productData.name,
      quantity,
      previousStock: currentStock,
      newStock: 0, // Se calculará en createStockMovement
      unitPrice,
      totalValue: quantity * unitPrice,
      userId,
      userEmail,
      comments: comments || 'Venta registrada'
    };

    return await createStockMovement(movementData);
  } catch (error) {
    console.error('Error registrando venta:', error);
    throw error;
  }
};

/**
 * Registrar devolución (entrada de stock)
 */
export const registerReturn = async (
  productId: string,
  quantity: number,
  reason: string,
  userId: string,
  userEmail: string
): Promise<string> => {
  try {
    const productDoc = await getDoc(doc(db, 'items', productId));
    if (!productDoc.exists()) {
      throw new Error('El producto no existe');
    }

    const productData = productDoc.data();

    // Crear movimiento de devolución
    const movementData: Omit<StockMovement, 'id' | 'createdAt'> = {
      type: StockMovementType.RETURN,
      productId,
      productCode: productData.code,
      productName: productData.name,
      quantity,
      previousStock: productData.stock || 0,
      newStock: 0, // Se calculará en createStockMovement
      userId,
      userEmail,
      comments: `Devolución: ${reason}`
    };

    return await createStockMovement(movementData);
  } catch (error) {
    console.error('Error registrando devolución:', error);
    throw error;
  }
};

/**
 * Registrar productos vencidos
 */
export const registerExpiredProducts = async (
  productId: string,
  quantity: number,
  expirationDate: Date,
  userId: string,
  userEmail: string
): Promise<string> => {
  try {
    const productDoc = await getDoc(doc(db, 'items', productId));
    if (!productDoc.exists()) {
      throw new Error('El producto no existe');
    }

    const productData = productDoc.data();

    // Crear movimiento de productos vencidos
    const movementData: Omit<StockMovement, 'id' | 'createdAt'> = {
      type: StockMovementType.EXPIRED,
      productId,
      productCode: productData.code,
      productName: productData.name,
      quantity,
      previousStock: productData.stock || 0,
      newStock: 0, // Se calculará en createStockMovement
      userId,
      userEmail,
      comments: `Productos vencidos el ${expirationDate.toLocaleDateString('es-CL')}`,
      expirationDate
    };

    return await createStockMovement(movementData);
  } catch (error) {
    console.error('Error registrando productos vencidos:', error);
    throw error;
  }
};

/**
 * Obtener resumen de movimientos por período
 */
export const getMovementsSummary = async (startDate: Date, endDate: Date) => {
  try {
    const filters: StockMovementFilters = { startDate, endDate };
    const movements = await getStockMovements(filters);

    const summary = {
      totalMovements: movements.length,
      purchases: movements.filter(m => m.type === StockMovementType.PURCHASE).length,
      sales: movements.filter(m => m.type === StockMovementType.SALE).length,
      adjustments: movements.filter(m => m.type === StockMovementType.ADJUSTMENT).length,
      returns: movements.filter(m => m.type === StockMovementType.RETURN).length,
      expired: movements.filter(m => m.type === StockMovementType.EXPIRED).length,
      damaged: movements.filter(m => m.type === StockMovementType.DAMAGED).length,
      totalValue: movements
        .filter(m => m.totalValue)
        .reduce((sum, m) => sum + (m.totalValue || 0), 0),
      totalQuantityIn: movements
        .filter(m => [StockMovementType.PURCHASE, StockMovementType.RETURN, StockMovementType.ADJUSTMENT].includes(m.type) && m.quantity > 0)
        .reduce((sum, m) => sum + m.quantity, 0),
      totalQuantityOut: movements
        .filter(m => [StockMovementType.SALE, StockMovementType.EXPIRED, StockMovementType.DAMAGED].includes(m.type) || (m.type === StockMovementType.ADJUSTMENT && m.quantity < 0))
        .reduce((sum, m) => sum + Math.abs(m.quantity), 0)
    };

    return summary;
  } catch (error) {
    console.error('Error obteniendo resumen de movimientos:', error);
    throw error;
  }
};

/**
 * Obtener movimientos recientes
 */
export const getRecentMovements = async (limitCount: number = 50): Promise<StockMovement[]> => {
  try {
    const q = query(
      collection(db, 'stockMovements'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        expirationDate: data.expirationDate?.toDate()
      } as StockMovement;
    });
  } catch (error) {
    console.error('Error obteniendo movimientos recientes:', error);
    throw error;
  }
};

/**
 * Calcular valor total del inventario
 */
export const calculateInventoryValue = async (): Promise<number> => {
  try {
    // Obtener todos los productos activos
    const q = query(
      collection(db, 'items'),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    let totalValue = 0;
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const stock = data.stock || 0;
      const price = data.price || 0;
      totalValue += stock * price;
    });

    return totalValue;
  } catch (error) {
    console.error('Error calculando valor del inventario:', error);
    throw error;
  }
};

/**
 * Obtener productos con stock bajo
 */
export const getLowStockProducts = async (threshold: number = 5): Promise<any[]> => {
  try {
    const q = query(
      collection(db, 'items'),
      where('isActive', '==', true),
      where('stock', '<=', threshold)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        code: data.code,
        name: data.name,
        stock: data.stock,
        category: data.category,
        price: data.price,
        sellPrice: data.sellPrice
      };
    });
  } catch (error) {
    console.error('Error obteniendo productos con stock bajo:', error);
    throw error;
  }
};

/**
 * Validar movimiento antes de crearlo
 */
export const validateMovement = (movementData: Partial<StockMovement>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!movementData.productId) {
    errors.push('El ID del producto es obligatorio');
  }

  if (!movementData.type) {
    errors.push('El tipo de movimiento es obligatorio');
  }

  if (!movementData.quantity || movementData.quantity <= 0) {
    errors.push('La cantidad debe ser mayor a 0');
  }

  if (!movementData.userId) {
    errors.push('El usuario responsable es obligatorio');
  }

  if (!movementData.userEmail) {
    errors.push('El email del usuario es obligatorio');
  }

  if (movementData.unitPrice && movementData.unitPrice < 0) {
    errors.push('El precio unitario no puede ser negativo');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Obtener historial completo de un producto
 */
export const getProductHistory = async (productId: string): Promise<StockMovement[]> => {
  try {
    const movements = await getMovementsByProduct(productId);
    
    // Ordenar por fecha de creación (más antiguos primero para ver la evolución)
    return movements.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  } catch (error) {
    console.error('Error obteniendo historial del producto:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de movimientos por usuario
 */
export const getMovementStatsByUser = async (userId: string, startDate?: Date, endDate?: Date) => {
  try {
    const filters: StockMovementFilters = { userId };
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const movements = await getStockMovements(filters);

    const stats = {
      totalMovements: movements.length,
      movementsByType: {} as Record<string, number>,
      totalValue: 0,
      productsAffected: [] as string[]
    };

    const uniqueProducts = new Set<string>();

    movements.forEach(movement => {
      // Contar por tipo
      const typeKey = movement.type.toString();
      stats.movementsByType[typeKey] = (stats.movementsByType[typeKey] || 0) + 1;
      
      // Sumar valor total
      if (movement.totalValue) {
        stats.totalValue += movement.totalValue;
      }
      
      // Productos únicos afectados
      uniqueProducts.add(movement.productId);
    });

    stats.productsAffected = Array.from(uniqueProducts);

    return {
      ...stats,
      uniqueProductsAffected: uniqueProducts.size
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas por usuario:', error);
    throw error;
  }
};

/**
 * Reversar un movimiento (crear movimiento opuesto)
 */
export const reverseMovement = async (
  movementId: string, 
  reason: string, 
  userId: string, 
  userEmail: string
): Promise<string> => {
  try {
    // Obtener el movimiento original
    const movementDoc = await getDoc(doc(db, 'stockMovements', movementId));
    if (!movementDoc.exists()) {
      throw new Error('El movimiento no existe');
    }

    const originalMovement = movementDoc.data() as StockMovement;

    // Determinar el tipo de movimiento inverso
    let reverseType: StockMovementType;
    let reverseQuantity = originalMovement.quantity;

    switch (originalMovement.type) {
      case StockMovementType.PURCHASE:
        reverseType = StockMovementType.ADJUSTMENT;
        reverseQuantity = -originalMovement.quantity; // Restar lo que se agregó
        break;
      case StockMovementType.SALE:
        reverseType = StockMovementType.RETURN;
        break;
      case StockMovementType.ADJUSTMENT:
        reverseType = StockMovementType.ADJUSTMENT;
        reverseQuantity = -originalMovement.quantity; // Opuesto al ajuste
        break;
      case StockMovementType.RETURN:
        reverseType = StockMovementType.ADJUSTMENT;
        reverseQuantity = -originalMovement.quantity; // Restar la devolución
        break;
      default:
        throw new Error('No se puede reversar este tipo de movimiento');
    }

    // Crear movimiento de reversión
    const reverseMovementData: Omit<StockMovement, 'id' | 'createdAt'> = {
      type: reverseType,
      productId: originalMovement.productId,
      productCode: originalMovement.productCode,
      productName: originalMovement.productName,
      quantity: Math.abs(reverseQuantity), // Siempre positivo para el registro
      previousStock: 0, // Se calculará en createStockMovement
      newStock: 0, // Se calculará en createStockMovement
      unitPrice: originalMovement.unitPrice,
      userId,
      userEmail,
      comments: `REVERSIÓN de movimiento ${movementId}: ${reason}`
    };

    return await createStockMovement(reverseMovementData);
  } catch (error) {
    console.error('Error reversando movimiento:', error);
    throw error;
  }
};

/**
 * Crear movimiento de transferencia (placeholder para futuras implementaciones)
 */
export const createTransferMovement = async (
  productId: string,
  quantity: number,
  fromLocation: string,
  toLocation: string,
  userId: string,
  userEmail: string
): Promise<string> => {
  try {
    const productDoc = await getDoc(doc(db, 'items', productId));
    if (!productDoc.exists()) {
      throw new Error('El producto no existe');
    }

    const productData = productDoc.data();

    // Por ahora solo registrar como movimiento de transferencia
    const movementData: Omit<StockMovement, 'id' | 'createdAt'> = {
      type: StockMovementType.TRANSFER,
      productId,
      productCode: productData.code,
      productName: productData.name,
      quantity,
      previousStock: productData.stock || 0,
      newStock: 0, // Sin cambio en stock total
      userId,
      userEmail,
      comments: `Transferencia de ${fromLocation} a ${toLocation}`
    };

    return await createStockMovement(movementData);
  } catch (error) {
    console.error('Error creando transferencia:', error);
    throw error;
  }
};

/**
 * Obtener movimientos por lote
 */
export const getMovementsByBatch = async (batchCode: string): Promise<StockMovement[]> => {
  try {
    const q = query(
      collection(db, 'stockMovements'),
      where('batchCode', '==', batchCode),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        expirationDate: data.expirationDate?.toDate()
      } as StockMovement;
    });
  } catch (error) {
    console.error('Error obteniendo movimientos por lote:', error);
    throw error;
  }
};

/**
 * Limpiar movimientos antiguos (función de mantenimiento)
 */
export const cleanupOldMovements = async (olderThanDays: number = 365): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const q = query(
      collection(db, 'stockMovements'),
      where('createdAt', '<', Timestamp.fromDate(cutoffDate))
    );
    
    const querySnapshot = await getDocs(q);
    const deleteCount = querySnapshot.docs.length;

    // En un entorno de producción, esto debería hacerse en lotes
    // para evitar timeouts con grandes cantidades de datos
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    console.log(`${deleteCount} movimientos antiguos eliminados`);
    return deleteCount;
  } catch (error) {
    console.error('Error limpiando movimientos antiguos:', error);
    throw error;
  }
};