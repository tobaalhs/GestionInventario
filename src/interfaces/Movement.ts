/**
 * Interface para movimientos de stock con información extendida para reportes
 */
export interface MovementRecord {
  id: string;
  date: Date;
  productId: string;
  productCode: string;
  productName: string;
  type: MovementType;
  quantity: number;
  resultingStock: number;
  previousStock: number;
  unitPrice?: number;
  totalValue?: number;
  userId: string;
  userEmail: string;
  userName: string;
  supplierId?: string;
  supplierName?: string;
  customerId?: string;
  customerName?: string;
  saleId?: string;
  purchaseId?: string;
  batchCode?: string;
  expirationDate?: Date;
  comments?: string;
  category?: string;
  createdAt: Date;
}

/**
 * Tipos de movimientos para el historial
 */
export enum MovementType {
  PURCHASE = 'purchase',     // Compra (entrada)
  SALE = 'sale',            // Venta (salida)
  ADJUSTMENT = 'adjustment', // Ajuste manual
  RETURN = 'return',        // Devolución
  EXPIRED = 'expired',      // Producto vencido
  DAMAGED = 'damaged',      // Producto dañado
  TRANSFER = 'transfer'     // Transferencia
}

/**
 * Filtros para el historial de movimientos (VERSIÓN ACTUALIZADA)
 */
export interface MovementFilters {
  startDate?: Date;
  endDate?: Date;
  productId?: string;
  productCode?: string;
  movementType?: MovementType | 'all';
  userId?: string;
  supplierId?: string;
  customerId?: string;
  minAmount?: number;
  maxAmount?: number;
  minQuantity?: number; 
  maxQuantity?: number; 
  searchTerm?: string;
  category?: string;
  batchCode?: string;
  hasExpirationDate?: boolean;
  hasComments?: boolean; 
  sortBy?: MovementSortField;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Campos disponibles para ordenamiento
 */
export enum MovementSortField {
  DATE = 'date',
  PRODUCT_NAME = 'productName',
  PRODUCT_CODE = 'productCode',
  TYPE = 'type',
  QUANTITY = 'quantity',
  TOTAL_VALUE = 'totalValue',
  USER_NAME = 'userName',
  RESULTING_STOCK = 'resultingStock'
}

/**
 * Resultado de búsqueda de movimientos con paginación
 */
export interface MovementSearchResult {
  movements: MovementRecord[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
  totalValue: number;
  filters: MovementFilters;
}

/**
 * Estadísticas de movimientos
 */
export interface MovementStatistics {
  totalMovements: number;
  totalValue: number;
  movementsByType: Record<MovementType, number>;
  valueByType: Record<MovementType, number>;
  topProducts: ProductMovementStat[];
  topUsers: UserMovementStat[];
  dailyTrend: DailyMovementStat[];
  monthlyTrend: MonthlyMovementStat[];
  categoryBreakdown: CategoryMovementStat[];
}

/**
 * Estadística por producto
 */
export interface ProductMovementStat {
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  totalMovements: number;
  totalQuantity: number;
  totalValue: number;
  lastMovementDate: Date;
  currentStock: number;
}

/**
 * Estadística por usuario
 */
export interface UserMovementStat {
  userId: string;
  userEmail: string;
  userName: string;
  totalMovements: number;
  totalValue: number;
  movementsByType: Record<MovementType, number>;
  lastActivity: Date;
}

/**
 * Estadística diaria
 */
export interface DailyMovementStat {
  date: string; // YYYY-MM-DD
  totalMovements: number;
  totalValue: number;
  entriesCount: number;
  exitsCount: number;
  entriesValue: number;
  exitsValue: number;
}

/**
 * Estadística mensual
 */
export interface MonthlyMovementStat {
  month: string; // YYYY-MM
  totalMovements: number;
  totalValue: number;
  entriesCount: number;
  exitsCount: number;
  entriesValue: number;
  exitsValue: number;
  averageDailyMovements: number;
}

/**
 * Estadística por categoría
 */
export interface CategoryMovementStat {
  category: string;
  totalMovements: number;
  totalValue: number;
  percentage: number;
  products: string[];
  averageValue: number;
}

/**
 * Configuración de vista del historial
 */
export interface MovementViewConfig {
  showColumns: MovementTableColumn[];
  groupBy?: 'date' | 'product' | 'user' | 'type' | 'none';
  showStatistics: boolean;
  showCharts: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // en segundos
  exportFormat: 'excel' | 'pdf' | 'csv';
}

/**
 * Columnas disponibles para la tabla
 */
export enum MovementTableColumn {
  DATE = 'date',
  PRODUCT_CODE = 'productCode',
  PRODUCT_NAME = 'productName',
  TYPE = 'type',
  QUANTITY = 'quantity',
  UNIT_PRICE = 'unitPrice',
  TOTAL_VALUE = 'totalValue',
  RESULTING_STOCK = 'resultingStock',
  USER_NAME = 'userName',
  SUPPLIER_NAME = 'supplierName',
  CUSTOMER_NAME = 'customerName',
  COMMENTS = 'comments',
  BATCH_CODE = 'batchCode',
  EXPIRATION_DATE = 'expirationDate',
  CATEGORY = 'category'
}

/**
 * Resumen rápido de movimientos
 */
export interface MovementSummary {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totals: {
    movements: number;
    value: number;
    entries: number;
    exits: number;
    entriesValue: number;
    exitsValue: number;
  };
  trends: {
    movementsChange: number; // % cambio vs período anterior
    valueChange: number; // % cambio vs período anterior
    averageMovementsPerDay: number;
    averageValuePerDay: number;
  };
  highlights: {
    mostActiveProduct: ProductMovementStat | null;
    mostActiveUser: UserMovementStat | null;
    largestMovement: MovementRecord | null;
    mostActiveDay: DailyMovementStat | null;
  };
}

/**
 * Validador de filtros de movimientos
 */
export interface MovementFilterValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  appliedFilters: MovementFilters;
}

/**
 * Configuración de alertas para movimientos
 */
export interface MovementAlertConfig {
  enabled: boolean;
  largeMovementThreshold: number; // Valor umbral para movimientos grandes
  negativeStockAlert: boolean; // Alertar cuando el stock quede negativo
  expiredProductAlert: boolean; // Alertar cuando se muevan productos vencidos
  unusualActivityAlert: boolean; // Alertar por actividad inusual
  emailNotifications: boolean; // Enviar notificaciones por email
  alertUsers: string[]; // IDs de usuarios que reciben alertas
}

/**
 * Contexto de movimiento para auditoría
 */
export interface MovementContext {
  ip?: string;
  userAgent?: string;
  location?: string;
  sessionId?: string;
  deviceInfo?: string;
  reason?: string; // Motivo del movimiento (especialmente para ajustes)
  approvedBy?: string; // Usuario que aprobó el movimiento (si aplica)
  relatedDocuments?: string[]; // IDs de documentos relacionados
}

/**
 * Configuración de exportación de movimientos
 */
export interface MovementExportConfig {
  format: 'excel' | 'pdf' | 'csv';
  filters: MovementFilters;
  columns: MovementTableColumn[];
  includeStatistics: boolean;
  includeCharts: boolean;
  groupBy?: 'date' | 'product' | 'user' | 'type';
  fileName?: string;
  emailTo?: string[];
  password?: string; // Para proteger el archivo
}

/**
 * Resultado de exportación
 */
export interface MovementExportResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  recordCount: number;
  downloadUrl?: string;
  emailSent: boolean;
  error?: string;
  generatedAt: Date;
  expiresAt?: Date;
}

export default MovementRecord;