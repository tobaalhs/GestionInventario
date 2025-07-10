import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  startAfter,
  endBefore
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  MovementRecord,
  MovementType,
  MovementFilters,
  MovementSearchResult,
  MovementStatistics,
  MovementSummary,
  MovementSortField,
  MovementFilterValidation,
  ProductMovementStat,
  UserMovementStat,
  DailyMovementStat,
  MonthlyMovementStat,
  CategoryMovementStat
} from '../interfaces/Movement';

/**
 * Convertir datos de Firestore a MovementRecord
 */
const convertFirestoreToMovement = (doc: any): MovementRecord => {
  const data = doc.data();
  
  return {
    id: doc.id,
    date: data.createdAt.toDate(),
    productId: data.productId,
    productCode: data.productCode,
    productName: data.productName,
    type: data.type as MovementType,
    quantity: data.quantity,
    resultingStock: data.newStock,
    previousStock: data.previousStock,
    unitPrice: data.unitPrice,
    totalValue: data.totalValue,
    userId: data.userId,
    userEmail: data.userEmail,
    userName: data.userEmail?.split('@')[0] || 'Usuario desconocido',
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    customerId: data.customerId,
    customerName: data.customerName,
    saleId: data.saleId,
    purchaseId: data.purchaseId,
    batchCode: data.batchCode,
    expirationDate: data.expirationDate?.toDate(),
    comments: data.comments,
    category: data.category || 'Sin categoría',
    createdAt: data.createdAt.toDate()
  };
};

/**
 * Validar filtros de movimientos
 */
export const validateMovementFilters = (filters: MovementFilters): MovementFilterValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar fechas
  if (filters.startDate && filters.endDate) {
    if (filters.startDate >= filters.endDate) {
      errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    const daysDifference = Math.abs(filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 3600 * 24);
    
    if (daysDifference > 365) {
      warnings.push('El período es muy amplio (más de 1 año), la consulta puede ser lenta');
    }

    const now = new Date();
    if (filters.endDate > now) {
      warnings.push('La fecha de fin es futura');
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (filters.startDate < oneYearAgo) {
      warnings.push('El período incluye datos muy antiguos (más de 1 año)');
    }
  }

  // Validar montos
  if (filters.minAmount !== undefined && filters.maxAmount !== undefined) {
    if (filters.minAmount > filters.maxAmount) {
      errors.push('El monto mínimo no puede ser mayor al monto máximo');
    }
  }

  if (filters.minAmount !== undefined && filters.minAmount < 0) {
    errors.push('El monto mínimo no puede ser negativo');
  }

  // Validar paginación
  if (filters.page !== undefined && filters.page < 1) {
    errors.push('El número de página debe ser mayor a 0');
  }

  if (filters.pageSize !== undefined && (filters.pageSize < 1 || filters.pageSize > 1000)) {
    errors.push('El tamaño de página debe estar entre 1 y 1000');
  }

  // Validar código de producto
  if (filters.productCode && filters.productCode.trim().length < 2) {
    warnings.push('El código de producto es muy corto');
  }

  // Validar término de búsqueda
  if (filters.searchTerm && filters.searchTerm.trim().length < 2) {
    warnings.push('El término de búsqueda es muy corto, puede devolver muchos resultados');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    appliedFilters: filters
  };
};

/**
 * Buscar movimientos con filtros y paginación
 */
export const searchMovements = async (filters: MovementFilters): Promise<MovementSearchResult> => {
  try {
    console.log('🔍 Buscando movimientos con filtros:', filters);

    // Validar filtros
    const validation = validateMovementFilters(filters);
    if (!validation.isValid) {
      throw new Error(`Filtros inválidos: ${validation.errors.join(', ')}`);
    }

    let q = collection(db, 'stockMovements');
    let queryConstraints: any[] = [];

    // Aplicar filtros de Firestore
    if (filters.startDate) {
      queryConstraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.startDate)));
    }

    if (filters.endDate) {
      queryConstraints.push(where('createdAt', '<=', Timestamp.fromDate(filters.endDate)));
    }

    if (filters.productId) {
      queryConstraints.push(where('productId', '==', filters.productId));
    }

    if (filters.movementType && filters.movementType !== 'all') {
      queryConstraints.push(where('type', '==', filters.movementType));
    }

    if (filters.userId) {
      queryConstraints.push(where('userId', '==', filters.userId));
    }

    if (filters.supplierId) {
      queryConstraints.push(where('supplierId', '==', filters.supplierId));
    }

    if (filters.customerId) {
      queryConstraints.push(where('customerId', '==', filters.customerId));
    }

    // Ordenamiento
    const sortField = filters.sortBy || MovementSortField.DATE;
    const sortOrder = filters.sortOrder || 'desc';
    
    // Mapear campos de ordenamiento
    let firestoreSortField = 'createdAt';
    switch (sortField) {
      case MovementSortField.DATE:
        firestoreSortField = 'createdAt';
        break;
      case MovementSortField.PRODUCT_NAME:
        firestoreSortField = 'productName';
        break;
      case MovementSortField.PRODUCT_CODE:
        firestoreSortField = 'productCode';
        break;
      case MovementSortField.TYPE:
        firestoreSortField = 'type';
        break;
      case MovementSortField.QUANTITY:
        firestoreSortField = 'quantity';
        break;
      case MovementSortField.TOTAL_VALUE:
        firestoreSortField = 'totalValue';
        break;
      case MovementSortField.USER_NAME:
        firestoreSortField = 'userEmail';
        break;
      case MovementSortField.RESULTING_STOCK:
        firestoreSortField = 'newStock';
        break;
    }

    queryConstraints.push(orderBy(firestoreSortField, sortOrder));

    // Paginación
    const pageSize = filters.pageSize || 50;
    queryConstraints.push(limit(pageSize));

    const finalQuery = query(q, ...queryConstraints);
    const querySnapshot = await getDocs(finalQuery);
    
    // Convertir documentos a MovementRecord
    let movements: MovementRecord[] = querySnapshot.docs.map(convertFirestoreToMovement);

    // Aplicar filtros adicionales (que no se pueden hacer en Firestore)
    movements = applyAdditionalFilters(movements, filters);

    // Calcular totales para la paginación
    const totalCount = movements.length; // Esto sería aproximado en una implementación real
    const currentPage = filters.page || 1;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNext = currentPage < totalPages;
    const hasPrevious = currentPage > 1;

    // Calcular valor total
    const totalValue = movements.reduce((sum, mov) => sum + (mov.totalValue || 0), 0);

    console.log(`✅ Encontrados ${movements.length} movimientos`);

    return {
      movements,
      totalCount,
      totalPages,
      currentPage,
      pageSize,
      hasNext,
      hasPrevious,
      totalValue,
      filters: validation.appliedFilters
    };

  } catch (error) {
    console.error('❌ Error buscando movimientos:', error);
    throw error;
  }
};

/**
 * Aplicar filtros adicionales que no se pueden hacer en Firestore
 */
const applyAdditionalFilters = (movements: MovementRecord[], filters: MovementFilters): MovementRecord[] => {
  let filtered = movements;

  // Filtro por código de producto
  if (filters.productCode) {
    const code = filters.productCode.toLowerCase();
    filtered = filtered.filter(mov => 
      mov.productCode.toLowerCase().includes(code)
    );
  }

  // Filtro por término de búsqueda
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(mov => 
      mov.productName.toLowerCase().includes(term) ||
      mov.productCode.toLowerCase().includes(term) ||
      mov.comments?.toLowerCase().includes(term) ||
      mov.userName.toLowerCase().includes(term) ||
      mov.supplierName?.toLowerCase().includes(term) ||
      mov.customerName?.toLowerCase().includes(term) ||
      mov.batchCode?.toLowerCase().includes(term)
    );
  }

  // Filtro por categoría
  if (filters.category) {
    filtered = filtered.filter(mov => 
      mov.category?.toLowerCase().includes(filters.category!.toLowerCase())
    );
  }

  // Filtro por código de lote
  if (filters.batchCode) {
    filtered = filtered.filter(mov => 
      mov.batchCode?.toLowerCase().includes(filters.batchCode!.toLowerCase())
    );
  }

  // Filtro por montos
  if (filters.minAmount !== undefined) {
    filtered = filtered.filter(mov => (mov.totalValue || 0) >= filters.minAmount!);
  }

  if (filters.maxAmount !== undefined) {
    filtered = filtered.filter(mov => (mov.totalValue || 0) <= filters.maxAmount!);
  }

  // Filtro por productos con fecha de vencimiento
  if (filters.hasExpirationDate !== undefined) {
    filtered = filtered.filter(mov => 
      filters.hasExpirationDate ? mov.expirationDate !== undefined : mov.expirationDate === undefined
    );
  }

  return filtered;
};

/**
 * Obtener estadísticas de movimientos
 */
export const getMovementStatistics = async (filters: MovementFilters): Promise<MovementStatistics> => {
  try {
    console.log('📊 Calculando estadísticas de movimientos...');

    // Obtener todos los movimientos para el período
    const searchResult = await searchMovements({
      ...filters,
      pageSize: 10000 // Obtener más registros para estadísticas
    });

    const movements = searchResult.movements;

    if (movements.length === 0) {
      return {
        totalMovements: 0,
        totalValue: 0,
        movementsByType: {} as Record<MovementType, number>,
        valueByType: {} as Record<MovementType, number>,
        topProducts: [],
        topUsers: [],
        dailyTrend: [],
        monthlyTrend: [],
        categoryBreakdown: []
      };
    }

    // Estadísticas básicas
    const totalMovements = movements.length;
    const totalValue = movements.reduce((sum, mov) => sum + (mov.totalValue || 0), 0);

    // Movimientos por tipo
    const movementsByType: Record<MovementType, number> = {} as Record<MovementType, number>;
    const valueByType: Record<MovementType, number> = {} as Record<MovementType, number>;

    Object.values(MovementType).forEach(type => {
      movementsByType[type] = 0;
      valueByType[type] = 0;
    });

    movements.forEach(mov => {
      movementsByType[mov.type] = (movementsByType[mov.type] || 0) + 1;
      valueByType[mov.type] = (valueByType[mov.type] || 0) + (mov.totalValue || 0);
    });

    // Top productos
    const productStats = new Map<string, ProductMovementStat>();
    movements.forEach(mov => {
  const key = mov.productId;
  const existing = productStats.get(key) || {
    productId: mov.productId,
    productCode: mov.productCode,
    productName: mov.productName,
    category: mov.category || 'Sin categoría', // ← Fix: asegurar que sea string
    totalMovements: 0,
    totalQuantity: 0,
    totalValue: 0,
    lastMovementDate: mov.date,
    currentStock: mov.resultingStock
  };

  existing.totalMovements += 1;
  existing.totalQuantity += mov.quantity;
  existing.totalValue += mov.totalValue || 0;
  existing.lastMovementDate = mov.date > existing.lastMovementDate ? mov.date : existing.lastMovementDate;
  existing.currentStock = mov.resultingStock; // El más reciente

  productStats.set(key, existing);
});

    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.totalMovements - a.totalMovements)
      .slice(0, 10);

    // Top usuarios
    const userStats = new Map<string, UserMovementStat>();
    movements.forEach(mov => {
      const key = mov.userId;
      const existing = userStats.get(key) || {
        userId: mov.userId,
        userEmail: mov.userEmail,
        userName: mov.userName,
        totalMovements: 0,
        totalValue: 0,
        movementsByType: {} as Record<MovementType, number>,
        lastActivity: mov.date
      };

      existing.totalMovements += 1;
      existing.totalValue += mov.totalValue || 0;
      existing.movementsByType[mov.type] = (existing.movementsByType[mov.type] || 0) + 1;
      existing.lastActivity = mov.date > existing.lastActivity ? mov.date : existing.lastActivity;

      userStats.set(key, existing);
    });

    const topUsers = Array.from(userStats.values())
      .sort((a, b) => b.totalMovements - a.totalMovements)
      .slice(0, 10);

    // Tendencia diaria
    const dailyStats = new Map<string, DailyMovementStat>();
    movements.forEach(mov => {
      const dateKey = mov.date.toISOString().split('T')[0];
      const existing = dailyStats.get(dateKey) || {
        date: dateKey,
        totalMovements: 0,
        totalValue: 0,
        entriesCount: 0,
        exitsCount: 0,
        entriesValue: 0,
        exitsValue: 0
      };

      existing.totalMovements += 1;
      existing.totalValue += mov.totalValue || 0;

      // Determinar si es entrada o salida
      if ([MovementType.PURCHASE, MovementType.RETURN, MovementType.ADJUSTMENT].includes(mov.type) && mov.quantity > 0) {
        existing.entriesCount += 1;
        existing.entriesValue += mov.totalValue || 0;
      } else {
        existing.exitsCount += 1;
        existing.exitsValue += mov.totalValue || 0;
      }

      dailyStats.set(dateKey, existing);
    });

    const dailyTrend = Array.from(dailyStats.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    // Tendencia mensual
    const monthlyStats = new Map<string, MonthlyMovementStat>();
    movements.forEach(mov => {
      const monthKey = mov.date.toISOString().substring(0, 7); // YYYY-MM
      const existing = monthlyStats.get(monthKey) || {
        month: monthKey,
        totalMovements: 0,
        totalValue: 0,
        entriesCount: 0,
        exitsCount: 0,
        entriesValue: 0,
        exitsValue: 0,
        averageDailyMovements: 0
      };

      existing.totalMovements += 1;
      existing.totalValue += mov.totalValue || 0;

      if ([MovementType.PURCHASE, MovementType.RETURN, MovementType.ADJUSTMENT].includes(mov.type) && mov.quantity > 0) {
        existing.entriesCount += 1;
        existing.entriesValue += mov.totalValue || 0;
      } else {
        existing.exitsCount += 1;
        existing.exitsValue += mov.totalValue || 0;
      }

      monthlyStats.set(monthKey, existing);
    });

    // Calcular promedios diarios para cada mes
    monthlyStats.forEach((stat, monthKey) => {
      const daysInMonth = getDaysInMonth(monthKey);
      stat.averageDailyMovements = stat.totalMovements / daysInMonth;
    });

    const monthlyTrend = Array.from(monthlyStats.values())
      .sort((a, b) => a.month.localeCompare(b.month));

    // Desglose por categoría
    const categoryStats = new Map<string, CategoryMovementStat>();
    movements.forEach(mov => {
      const category = mov.category || 'Sin categoría';
      const existing = categoryStats.get(category) || {
        category,
        totalMovements: 0,
        totalValue: 0,
        percentage: 0,
        products: [],
        averageValue: 0
      };

      existing.totalMovements += 1;
      existing.totalValue += mov.totalValue || 0;
      
      if (!existing.products.includes(mov.productId)) {
        existing.products.push(mov.productId);
      }

      categoryStats.set(category, existing);
    });

    // Calcular porcentajes y promedios
    categoryStats.forEach(stat => {
      stat.percentage = totalValue > 0 ? (stat.totalValue / totalValue) * 100 : 0;
      stat.averageValue = stat.totalMovements > 0 ? stat.totalValue / stat.totalMovements : 0;
    });

    const categoryBreakdown = Array.from(categoryStats.values())
      .sort((a, b) => b.totalValue - a.totalValue);

    console.log('✅ Estadísticas calculadas exitosamente');

    return {
      totalMovements,
      totalValue,
      movementsByType,
      valueByType,
      topProducts,
      topUsers,
      dailyTrend,
      monthlyTrend,
      categoryBreakdown
    };

  } catch (error) {
    console.error('❌ Error calculando estadísticas:', error);
    throw error;
  }
};

/**
 * Obtener resumen de movimientos para un período
 */
export const getMovementSummary = async (
  startDate: Date, 
  endDate: Date,
  compareWithPrevious: boolean = true
): Promise<MovementSummary> => {
  try {
    console.log('📋 Generando resumen de movimientos...');

    // Obtener movimientos del período actual
    const currentPeriodResult = await searchMovements({
      startDate,
      endDate,
      pageSize: 10000
    });

    const currentMovements = currentPeriodResult.movements;

    // Calcular estadísticas del período actual
    const totalMovements = currentMovements.length;
    const totalValue = currentMovements.reduce((sum, mov) => sum + (mov.totalValue || 0), 0);
    
    const entries = currentMovements.filter(mov => 
      [MovementType.PURCHASE, MovementType.RETURN, MovementType.ADJUSTMENT].includes(mov.type) && mov.quantity > 0
    );
    const exits = currentMovements.filter(mov => 
      [MovementType.SALE, MovementType.EXPIRED, MovementType.DAMAGED].includes(mov.type) ||
      (mov.type === MovementType.ADJUSTMENT && mov.quantity < 0)
    );

    const entriesCount = entries.length;
    const exitsCount = exits.length;
    const entriesValue = entries.reduce((sum, mov) => sum + (mov.totalValue || 0), 0);
    const exitsValue = exits.reduce((sum, mov) => sum + (mov.totalValue || 0), 0);

    const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    const averageMovementsPerDay = daysDifference > 0 ? totalMovements / daysDifference : 0;
    const averageValuePerDay = daysDifference > 0 ? totalValue / daysDifference : 0;

    // Calcular cambios vs período anterior si se solicita
    let movementsChange = 0;
    let valueChange = 0;

    if (compareWithPrevious && daysDifference > 0) {
      const previousStartDate = new Date(startDate.getTime() - (daysDifference * 24 * 60 * 60 * 1000));
      const previousEndDate = new Date(startDate.getTime() - 1);

      const previousPeriodResult = await searchMovements({
        startDate: previousStartDate,
        endDate: previousEndDate,
        pageSize: 10000
      });

      const previousMovements = previousPeriodResult.movements;
      const previousTotalMovements = previousMovements.length;
      const previousTotalValue = previousMovements.reduce((sum, mov) => sum + (mov.totalValue || 0), 0);

      if (previousTotalMovements > 0) {
        movementsChange = ((totalMovements - previousTotalMovements) / previousTotalMovements) * 100;
      }

      if (previousTotalValue > 0) {
        valueChange = ((totalValue - previousTotalValue) / previousTotalValue) * 100;
      }
    }

    // Encontrar highlights
    const mostActiveProduct = currentMovements.length > 0 ? 
      getMostActiveProduct(currentMovements) : null;

    const mostActiveUser = currentMovements.length > 0 ? 
      getMostActiveUser(currentMovements) : null;

    const largestMovement = currentMovements.length > 0 ? 
      currentMovements.reduce((max, mov) => 
        (mov.totalValue || 0) > (max.totalValue || 0) ? mov : max
      ) : null;

    const mostActiveDay = currentMovements.length > 0 ? 
      getMostActiveDay(currentMovements) : null;

    return {
      period: {
        startDate,
        endDate
      },
      totals: {
        movements: totalMovements,
        value: totalValue,
        entries: entriesCount,
        exits: exitsCount,
        entriesValue,
        exitsValue
      },
      trends: {
        movementsChange,
        valueChange,
        averageMovementsPerDay,
        averageValuePerDay
      },
      highlights: {
        mostActiveProduct,
        mostActiveUser,
        largestMovement,
        mostActiveDay
      }
    };

  } catch (error) {
    console.error('❌ Error generando resumen:', error);
    throw error;
  }
};

/**
 * Obtener el producto más activo
 */
const getMostActiveProduct = (movements: MovementRecord[]): ProductMovementStat | null => {
  const productStats = new Map<string, ProductMovementStat>();
  
  movements.forEach(mov => {
  const key = mov.productId;
  const existing = productStats.get(key) || {
    productId: mov.productId,
    productCode: mov.productCode,
    productName: mov.productName,
    category: mov.category || 'Sin categoría', // ← Fix: asegurar que sea string
    totalMovements: 0,
    totalQuantity: 0,
    totalValue: 0,
    lastMovementDate: mov.date,
    currentStock: mov.resultingStock
  };

  existing.totalMovements += 1;
  existing.totalQuantity += mov.quantity;
  existing.totalValue += mov.totalValue || 0;
  existing.lastMovementDate = mov.date > existing.lastMovementDate ? mov.date : existing.lastMovementDate;

  productStats.set(key, existing);
});

  const sortedProducts = Array.from(productStats.values())
    .sort((a, b) => b.totalMovements - a.totalMovements);

  return sortedProducts.length > 0 ? sortedProducts[0] : null;
};

/**
 * Obtener el usuario más activo
 */
const getMostActiveUser = (movements: MovementRecord[]): UserMovementStat | null => {
  const userStats = new Map<string, UserMovementStat>();
  
  movements.forEach(mov => {
    const key = mov.userId;
    const existing = userStats.get(key) || {
      userId: mov.userId,
      userEmail: mov.userEmail,
      userName: mov.userName,
      totalMovements: 0,
      totalValue: 0,
      movementsByType: {} as Record<MovementType, number>,
      lastActivity: mov.date
    };

    existing.totalMovements += 1;
    existing.totalValue += mov.totalValue || 0;
    existing.movementsByType[mov.type] = (existing.movementsByType[mov.type] || 0) + 1;
    existing.lastActivity = mov.date > existing.lastActivity ? mov.date : existing.lastActivity;

    userStats.set(key, existing);
  });

  const sortedUsers = Array.from(userStats.values())
    .sort((a, b) => b.totalMovements - a.totalMovements);

  return sortedUsers.length > 0 ? sortedUsers[0] : null;
};

/**
 * Obtener el día más activo
 */
const getMostActiveDay = (movements: MovementRecord[]): DailyMovementStat | null => {
  const dailyStats = new Map<string, DailyMovementStat>();
  
  movements.forEach(mov => {
    const dateKey = mov.date.toISOString().split('T')[0];
    const existing = dailyStats.get(dateKey) || {
      date: dateKey,
      totalMovements: 0,
      totalValue: 0,
      entriesCount: 0,
      exitsCount: 0,
      entriesValue: 0,
      exitsValue: 0
    };

    existing.totalMovements += 1;
    existing.totalValue += mov.totalValue || 0;

    dailyStats.set(dateKey, existing);
  });

  const sortedDays = Array.from(dailyStats.values())
    .sort((a, b) => b.totalMovements - a.totalMovements);

  return sortedDays.length > 0 ? sortedDays[0] : null;
};

/**
 * Obtener días en un mes específico
 */
const getDaysInMonth = (monthKey: string): number => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};

/**
 * Obtener movimientos por producto específico
 */
export const getMovementsByProduct = async (productId: string, limit?: number): Promise<MovementRecord[]> => {
  try {
    const filters: MovementFilters = {
      productId,
      sortBy: MovementSortField.DATE,
      sortOrder: 'desc',
      pageSize: limit || 100
    };

    const result = await searchMovements(filters);
    return result.movements;
  } catch (error) {
    console.error('Error obteniendo movimientos por producto:', error);
    throw error;
  }
};

/**
 * Obtener movimientos por usuario específico
 */
export const getMovementsByUser = async (userId: string, limit?: number): Promise<MovementRecord[]> => {
  try {
    const filters: MovementFilters = {
      userId,
      sortBy: MovementSortField.DATE,
      sortOrder: 'desc',
      pageSize: limit || 100
    };

    const result = await searchMovements(filters);
    return result.movements;
  } catch (error) {
    console.error('Error obteniendo movimientos por usuario:', error);
    throw error;
  }
};

/**
 * Obtener movimientos recientes
 */
export const getRecentMovements = async (limit: number = 50): Promise<MovementRecord[]> => {
  try {
    const filters: MovementFilters = {
      sortBy: MovementSortField.DATE,
      sortOrder: 'desc',
      pageSize: limit
    };

    const result = await searchMovements(filters);
    return result.movements;
  } catch (error) {
    console.error('Error obteniendo movimientos recientes:', error);
    throw error;
  }
};