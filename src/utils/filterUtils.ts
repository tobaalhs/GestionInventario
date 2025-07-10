import {
  TransactionFilters,
  ReportGrouping
} from '../interfaces/Report';
import {
  MovementFilters,
  MovementType,
  MovementSortField
} from '../interfaces/Movement';

/**
 * Validar filtros de transacciones
 */
export const validateFilters = (
  filters: TransactionFilters | MovementFilters,
  type: 'transaction' | 'movement'
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validaciones comunes
  if (filters.startDate && filters.endDate) {
    if (filters.startDate >= filters.endDate) {
      errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    const daysDifference = Math.abs(filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 3600 * 24);
    if (daysDifference > 365) {
      errors.push('El período no puede exceder 365 días');
    }

    const now = new Date();
    if (filters.endDate > now) {
      errors.push('La fecha de fin no puede ser futura');
    }
  }

  // Validaciones específicas por tipo
  if (type === 'transaction') {
    const transactionFilters = filters as TransactionFilters;
    
    if (!transactionFilters.includeTypes || transactionFilters.includeTypes.length === 0) {
      errors.push('Debe incluir al menos un tipo de transacción');
    }

    if (transactionFilters.minAmount !== undefined && transactionFilters.minAmount < 0) {
      errors.push('El monto mínimo no puede ser negativo');
    }

    if (transactionFilters.minAmount !== undefined && transactionFilters.maxAmount !== undefined) {
      if (transactionFilters.minAmount > transactionFilters.maxAmount) {
        errors.push('El monto mínimo no puede ser mayor al monto máximo');
      }
    }
  }

  if (type === 'movement') {
    const movementFilters = filters as MovementFilters;

    if (movementFilters.minAmount !== undefined && movementFilters.minAmount < 0) {
      errors.push('El monto mínimo no puede ser negativo');
    }

    if (movementFilters.maxAmount !== undefined && movementFilters.minAmount !== undefined) {
      if (movementFilters.minAmount > movementFilters.maxAmount) {
        errors.push('El monto mínimo no puede ser mayor al monto máximo');
      }
    }

    if (movementFilters.pageSize !== undefined && (movementFilters.pageSize < 1 || movementFilters.pageSize > 1000)) {
      errors.push('El tamaño de página debe estar entre 1 y 1000');
    }

    if (movementFilters.page !== undefined && movementFilters.page < 1) {
      errors.push('El número de página debe ser mayor a 0');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Aplicar filtros rápidos predefinidos
 */
export const applyQuickFilters = (
  baseFilters: TransactionFilters | MovementFilters,
  quickFilter: string,
  type: 'transaction' | 'movement'
): TransactionFilters | MovementFilters => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date(now.getTime());

  switch (quickFilter) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;

    case 'yesterday':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      break;

    case 'thisWeek':
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - now.getDay());
      thisWeekStart.setHours(0, 0, 0, 0);
      startDate = thisWeekStart;
      break;

    case 'lastWeek':
      const lastWeekStart = new Date(now);
      lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
      lastWeekStart.setHours(0, 0, 0, 0);
      startDate = lastWeekStart;
      endDate = new Date(lastWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      break;

    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;

    case 'lastMonth':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;

    case 'thisYear':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;

    case 'lastYear':
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      break;

    case 'last7days':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;

    case 'last30days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;

    case 'last90days':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;

    default:
      return baseFilters;
  }

  return {
    ...baseFilters,
    startDate,
    endDate
  };
};

/**
 * Limpiar filtros vacíos o inválidos
 */
export const cleanFilters = (filters: any): any => {
  const cleaned: any = {};

  Object.keys(filters).forEach(key => {
    const value = filters[key];
    
    // No incluir valores undefined, null, o strings vacíos
    if (value !== undefined && value !== null && value !== '') {
      // Para arrays, solo incluir si no están vacíos
      if (Array.isArray(value)) {
        if (value.length > 0) {
          cleaned[key] = value;
        }
      } else {
        cleaned[key] = value;
      }
    }
  });

  return cleaned;
};

/**
 * Convertir filtros para búsqueda en Firestore
 */
export const convertFiltersForFirestore = (
  filters: TransactionFilters | MovementFilters
): any => {
  const firestoreFilters: any = {};

  // Convertir fechas a Timestamp para Firestore
  if (filters.startDate) {
    firestoreFilters.startDate = filters.startDate;
  }

  if (filters.endDate) {
    firestoreFilters.endDate = filters.endDate;
  }

  // Mantener otros filtros como están
  Object.keys(filters).forEach(key => {
    if (key !== 'startDate' && key !== 'endDate') {
      const value = (filters as any)[key];
      if (value !== undefined && value !== null) {
        firestoreFilters[key] = value;
      }
    }
  });

  return firestoreFilters;
};

/**
 * Generar descripción legible de los filtros aplicados
 */
export const getFiltersDescription = (
  filters: TransactionFilters | MovementFilters,
  type: 'transaction' | 'movement'
): string => {
  const descriptions: string[] = [];

  // Descripción de fechas
  if (filters.startDate && filters.endDate) {
    const startStr = filters.startDate.toLocaleDateString('es-CL');
    const endStr = filters.endDate.toLocaleDateString('es-CL');
    descriptions.push(`Período: ${startStr} - ${endStr}`);
  }

  // Descripción específica por tipo
  if (type === 'transaction') {
    const transactionFilters = filters as TransactionFilters;
    
    if (transactionFilters.includeTypes && transactionFilters.includeTypes.length > 0) {
      const types = transactionFilters.includeTypes.map(t => 
        t === 'sale' ? 'Ventas' : 'Compras'
      );
      descriptions.push(`Tipos: ${types.join(', ')}`);
    }

    if (transactionFilters.minAmount !== undefined || transactionFilters.maxAmount !== undefined) {
      const min = transactionFilters.minAmount !== undefined ? 
        `$${transactionFilters.minAmount.toLocaleString()}` : 'Sin mínimo';
      const max = transactionFilters.maxAmount !== undefined ? 
        `$${transactionFilters.maxAmount.toLocaleString()}` : 'Sin máximo';
      descriptions.push(`Monto: ${min} - ${max}`);
    }

    if (transactionFilters.searchTerm) {
      descriptions.push(`Búsqueda: "${transactionFilters.searchTerm}"`);
    }
  }

  if (type === 'movement') {
    const movementFilters = filters as MovementFilters;
    
    if (movementFilters.movementType && movementFilters.movementType !== 'all') {
      const typeLabels: Record<MovementType, string> = {
        [MovementType.PURCHASE]: 'Compras',
        [MovementType.SALE]: 'Ventas', 
        [MovementType.ADJUSTMENT]: 'Ajustes',
        [MovementType.RETURN]: 'Devoluciones',
        [MovementType.EXPIRED]: 'Vencidos',
        [MovementType.DAMAGED]: 'Dañados',
        [MovementType.TRANSFER]: 'Transferencias'
      };
      descriptions.push(`Tipo: ${typeLabels[movementFilters.movementType as MovementType]}`);
    }

    if (movementFilters.searchTerm) {
      descriptions.push(`Búsqueda: "${movementFilters.searchTerm}"`);
    }

    if (movementFilters.userId) {
      descriptions.push(`Usuario: ${movementFilters.userId}`);
    }
  }

  return descriptions.length > 0 ? descriptions.join(' | ') : 'Sin filtros aplicados';
};

/**
 * Comparar dos conjuntos de filtros
 */
export const compareFilters = (
  filters1: TransactionFilters | MovementFilters,
  filters2: TransactionFilters | MovementFilters
): boolean => {
  // Limpiar ambos filtros para comparación
  const clean1 = cleanFilters(filters1);
  const clean2 = cleanFilters(filters2);

  // Comparar claves
  const keys1 = Object.keys(clean1).sort();
  const keys2 = Object.keys(clean2).sort();

  if (keys1.length !== keys2.length) {
    return false;
  }

  // Comparar valores
  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false;
    }

    const value1 = clean1[key];
    const value2 = clean2[key];

    // Comparación especial para fechas
    if (value1 instanceof Date && value2 instanceof Date) {
      if (value1.getTime() !== value2.getTime()) {
        return false;
      }
    }
    // Comparación especial para arrays
    else if (Array.isArray(value1) && Array.isArray(value2)) {
      if (JSON.stringify(value1.sort()) !== JSON.stringify(value2.sort())) {
        return false;
      }
    }
    // Comparación normal
    else if (value1 !== value2) {
      return false;
    }
  }

  return true;
};

/**
 * Crear filtros por defecto
 */
export const createDefaultFilters = (type: 'transaction' | 'movement'): TransactionFilters | MovementFilters => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Mes pasado
  const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); // Fin del mes pasado

  if (type === 'transaction') {
    return {
      startDate,
      endDate,
      includeTypes: ['sale', 'purchase'],
      groupBy: ReportGrouping.NONE,
      includePendingTransactions: true,
      includeDeletedTransactions: false
    } as TransactionFilters;
  } else {
    return {
      startDate,
      endDate,
      movementType: 'all',
      sortBy: MovementSortField.DATE,
      sortOrder: 'desc',
      pageSize: 50,
      page: 1
    } as MovementFilters;
  }
};

/**
 * Obtener filtros guardados del localStorage
 */
export const getSavedFilters = (key: string): any | null => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Convertir fechas de string a Date
      if (parsed.startDate) {
        parsed.startDate = new Date(parsed.startDate);
      }
      if (parsed.endDate) {
        parsed.endDate = new Date(parsed.endDate);
      }
      
      return parsed;
    }
  } catch (error) {
    console.error('Error cargando filtros guardados:', error);
  }
  return null;
};

/**
 * Guardar filtros en localStorage
 */
export const saveFilters = (key: string, filters: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(filters));
  } catch (error) {
    console.error('Error guardando filtros:', error);
  }
};

/**
 * Eliminar filtros guardados
 */
export const removeSavedFilters = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error eliminando filtros guardados:', error);
  }
};

export default {
  validateFilters,
  applyQuickFilters,
  cleanFilters,
  convertFiltersForFirestore,
  getFiltersDescription,
  compareFilters,
  createDefaultFilters,
  getSavedFilters,
  saveFilters,
  removeSavedFilters
};