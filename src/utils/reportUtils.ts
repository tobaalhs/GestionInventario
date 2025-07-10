
import { 
  TransactionReport, 
  ReportType, 
  TransactionData,
  ReportSummary,
  ReportStatistics
} from '../interfaces/Report';

// Configuración regional por defecto
const regionConfig = {
  locale: 'es-CL',
  currency: 'CLP',
  timezone: 'America/Santiago'
};

/**
 * Generar código único para reportes
 */
export const generateReportCode = (type: ReportType, date?: Date): string => {
  const now = date || new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6);
  
  const typeMap: Record<ReportType, string> = {
    [ReportType.SALES]: 'VEN',
    [ReportType.PURCHASES]: 'COM',
    [ReportType.COMBINED]: 'MIX',
    [ReportType.PROFIT_LOSS]: 'GYP',
    [ReportType.INVENTORY_VALUE]: 'INV',
    [ReportType.CUSTOMER_ACTIVITY]: 'CLI',
    [ReportType.SUPPLIER_ACTIVITY]: 'PRO',
    [ReportType.PRODUCT_PERFORMANCE]: 'PROD',
    [ReportType.FINANCIAL_SUMMARY]: 'FIN'
  };
  
  const prefix = typeMap[type] || 'REP';
  return `${prefix}-${year}${month}${day}-${timestamp}`;
};

/**
 * Formatear moneda según configuración regional
 */
export const formatCurrency = (amount: number, options?: Intl.NumberFormatOptions): string => {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: regionConfig.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  };
  
  return new Intl.NumberFormat(regionConfig.locale, { ...defaultOptions, ...options }).format(amount);
};

/**
 * Formatear número con separadores de miles
 */
export const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat(regionConfig.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Formatear porcentaje
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return new Intl.NumberFormat(regionConfig.locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

/**
 * Formatear fecha según configuración regional
 */
export const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  return new Intl.DateTimeFormat(regionConfig.locale, { ...defaultOptions, ...options }).format(date);
};

/**
 * Formatear fecha y hora
 */
export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat(regionConfig.locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
};

/**
 * Calcular diferencia en días entre dos fechas
 */
export const daysBetween = (startDate: Date, endDate: Date): number => {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((endDate.getTime() - startDate.getTime()) / msPerDay);
};

/**
 * Obtener rango de fechas para períodos comunes
 */
export const getDateRange = (period: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear'): { startDate: Date; endDate: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case 'today':
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
      
    case 'yesterday':
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        startDate: yesterday,
        endDate: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
      
    case 'thisWeek':
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        startDate: startOfWeek,
        endDate: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
      };
      
    case 'lastWeek':
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
      return {
        startDate: lastWeekStart,
        endDate: new Date(lastWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
      };
      
    case 'thisMonth':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      };
      
    case 'lastMonth':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      };
      
    case 'thisYear':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      };
      
    case 'lastYear':
      return {
        startDate: new Date(now.getFullYear() - 1, 0, 1),
        endDate: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
      };
      
    default:
      return { startDate: today, endDate: today };
  }
};

/**
 * Agrupar transacciones por período
 */
export const groupTransactionsByPeriod = (
  transactions: TransactionData[], 
  period: 'day' | 'week' | 'month' | 'year'
): Record<string, TransactionData[]> => {
  return transactions.reduce((groups, transaction) => {
    let key: string;
    const date = transaction.transactionDate;
    
    switch (period) {
      case 'day':
        key = formatDate(date);
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = formatDate(weekStart);
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        key = String(date.getFullYear());
        break;
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(transaction);
    
    return groups;
  }, {} as Record<string, TransactionData[]>);
};

/**
 * Calcular tasa de crecimiento entre dos períodos
 */
export const calculateGrowthRate = (currentValue: number, previousValue: number): number => {
  if (previousValue === 0) return currentValue > 0 ? 100 : 0;
  return ((currentValue - previousValue) / previousValue) * 100;
};

/**
 * Calcular promedio móvil
 */
export const calculateMovingAverage = (values: number[], windowSize: number): number[] => {
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < windowSize - 1) {
      result.push(values[i]);
    } else {
      const sum = values.slice(i - windowSize + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / windowSize);
    }
  }
  
  return result;
};

/**
 * Filtrar transacciones por criterios múltiples
 */
export const filterTransactions = (
  transactions: TransactionData[],
  filters: {
    dateRange?: { startDate: Date; endDate: Date };
    types?: ('sale' | 'purchase')[];
    minAmount?: number;
    maxAmount?: number;
    customerIds?: string[];
    supplierIds?: string[];
    productIds?: string[];
    searchTerm?: string;
  }
): TransactionData[] => {
  return transactions.filter(transaction => {
    // Filtro por fecha
    if (filters.dateRange) {
      const transDate = transaction.transactionDate;
      if (transDate < filters.dateRange.startDate || transDate > filters.dateRange.endDate) {
        return false;
      }
    }
    
    // Filtro por tipo
    if (filters.types && filters.types.length > 0) {
      if (!filters.types.includes(transaction.type)) {
        return false;
      }
    }
    
    // Filtro por monto
    if (filters.minAmount !== undefined && transaction.totalAmount < filters.minAmount) {
      return false;
    }
    if (filters.maxAmount !== undefined && transaction.totalAmount > filters.maxAmount) {
      return false;
    }
    
    // Filtro por cliente/proveedor
    if (filters.customerIds && filters.customerIds.length > 0) {
      if (transaction.type === 'sale' && !filters.customerIds.includes(transaction.counterparty.id)) {
        return false;
      }
    }
    if (filters.supplierIds && filters.supplierIds.length > 0) {
      if (transaction.type === 'purchase' && !filters.supplierIds.includes(transaction.counterparty.id)) {
        return false;
      }
    }
    
    // Filtro por productos
    if (filters.productIds && filters.productIds.length > 0) {
      const hasProduct = transaction.items.some(item => filters.productIds!.includes(item.productId));
      if (!hasProduct) {
        return false;
      }
    }
    
    // Filtro por término de búsqueda
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const searchableText = [
        transaction.code,
        transaction.counterparty.name,
        transaction.counterparty.rut,
        transaction.comments || '',
        ...transaction.items.map(item => `${item.productName} ${item.productCode}`)
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * Calcular métricas de resumen para un conjunto de transacciones
 */
export const calculateTransactionMetrics = (transactions: TransactionData[]) => {
  const totalTransactions = transactions.length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalQuantity = transactions.reduce((sum, t) => sum + t.totalQuantity, 0);
  const totalItems = transactions.reduce((sum, t) => sum + t.items.length, 0);
  
  const sales = transactions.filter(t => t.type === 'sale');
  const purchases = transactions.filter(t => t.type === 'purchase');
  
  const salesAmount = sales.reduce((sum, t) => sum + t.totalAmount, 0);
  const purchasesAmount = purchases.reduce((sum, t) => sum + t.totalAmount, 0);
  
  return {
    totalTransactions,
    totalAmount,
    totalQuantity,
    totalItems,
    averageAmount: totalTransactions > 0 ? totalAmount / totalTransactions : 0,
    averageQuantity: totalTransactions > 0 ? totalQuantity / totalTransactions : 0,
    salesCount: sales.length,
    purchasesCount: purchases.length,
    salesAmount,
    purchasesAmount,
    netAmount: salesAmount - purchasesAmount,
    salesPercentage: totalAmount > 0 ? (salesAmount / totalAmount) * 100 : 0,
    purchasesPercentage: totalAmount > 0 ? (purchasesAmount / totalAmount) * 100 : 0
  };
};

/**
 * Generar colores para gráficos
 */
export const generateChartColors = (count: number): string[] => {
  const baseColors = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#84cc16', // Lime
    '#f97316', // Orange
    '#6b7280'  // Gray
  ];
  
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i < baseColors.length) {
      colors.push(baseColors[i]);
    } else {
      // Generar colores adicionales con variaciones
      const baseIndex = i % baseColors.length;
      const variation = Math.floor(i / baseColors.length) * 20;
      colors.push(adjustColorBrightness(baseColors[baseIndex], variation));
    }
  }
  
  return colors;
};

/**
 * Ajustar brillo de un color
 */
export const adjustColorBrightness = (color: string, percent: number): string => {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
};

/**
 * Validar rango de fechas
 */
export const validateDateRange = (startDate: Date, endDate: Date): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (startDate >= endDate) {
    errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
  }
  
  const now = new Date();
  if (endDate > now) {
    errors.push('La fecha de fin no puede ser futura');
  }
  
  const maxRange = 365; // días
  const daysDiff = daysBetween(startDate, endDate);
  if (daysDiff > maxRange) {
    errors.push(`El rango de fechas no puede exceder ${maxRange} días`);
  }
  
  const minDate = new Date('2020-01-01'); // Fecha mínima del sistema
  if (startDate < minDate) {
    errors.push(`La fecha de inicio no puede ser anterior a ${formatDate(minDate)}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Escapar texto para CSV
 */
export const escapeCSV = (text: string): string => {
  if (!text) return '';
  
  // Si contiene comas, comillas o saltos de línea, envolver en comillas
  if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    // Escapar comillas duplicándolas y envolver en comillas
    return `"${text.replace(/"/g, '""')}"`;
  }
  
  return text;
};

/**
 * Generar nombre de archivo para exportación
 */
export const generateExportFileName = (
  type: string,
  format: string,
  includeTimestamp: boolean = true
): string => {
  let fileName = type.toLowerCase().replace(/\s+/g, '_');
  
  if (includeTimestamp) {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '-')
      .split('T')[0] + '_' + 
      now.toTimeString().split(' ')[0].replace(/:/g, '-');
    fileName += `_${timestamp}`;
  }
  
  return `${fileName}.${format}`;
};

/**
 * Truncar texto con puntos suspensivos
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Calcular tiempo estimado de procesamiento
 */
export const estimateProcessingTime = (recordCount: number, complexity: 'low' | 'medium' | 'high' = 'medium'): number => {
  const baseTime = 2; // segundos base
  const multipliers = {
    low: 0.001,
    medium: 0.002,
    high: 0.005
  };
  
  return Math.max(baseTime, Math.round(recordCount * multipliers[complexity]));
};

/**
 * Formatear duración en segundos a texto legible
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} segundo${seconds !== 1 ? 's' : ''}`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} minuto${minutes !== 1 ? 's' : ''}${remainingSeconds > 0 ? ` y ${remainingSeconds} segundo${remainingSeconds !== 1 ? 's' : ''}` : ''}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hora${hours !== 1 ? 's' : ''}${minutes > 0 ? ` y ${minutes} minuto${minutes !== 1 ? 's' : ''}` : ''}`;
  }
};

export default {
  generateReportCode,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
  formatDateTime,
  daysBetween,
  getDateRange,
  groupTransactionsByPeriod,
  calculateGrowthRate,
  calculateMovingAverage,
  filterTransactions,
  calculateTransactionMetrics,
  generateChartColors,
  adjustColorBrightness,
  validateDateRange,
  escapeCSV,
  generateExportFileName,
  truncateText,
  estimateProcessingTime,
  formatDuration
};