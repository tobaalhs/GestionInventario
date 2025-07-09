/**
 * Interface principal para una compra de stock
 */
export interface Purchase {
  id: string;
  code: string; // Código único de compra (ej: COMP-2025-001)
  items: PurchaseItem[];
  supplierId: string;
  supplierInfo: Supplier;
  purchaseDate: Date;
  expirationDate?: Date; // Fecha de vencimiento del lote (opcional)
  totalAmount: number; // Monto total de la compra
  totalQuantity: number; // Cantidad total de productos
  comments?: string; // Comentarios opcionales
  userId: string; // ID del usuario que realizó la compra
  userEmail: string; // Email/nombre del usuario
  status: PurchaseStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Estados posibles de una compra
 */
export enum PurchaseStatus {
  PENDING = 'pending', // Pendiente de procesamiento
  COMPLETED = 'completed', // Completada exitosamente
  CANCELLED = 'cancelled', // Cancelada
  PROCESSING = 'processing' // En proceso
}

/**
 * Item individual dentro de una compra
 */
export interface PurchaseItem {
  productId: string; // ID del producto (vacío si es nuevo)
  productCode: string; // Código del producto
  productName: string; // Nombre del producto
  quantity: number; // Cantidad comprada
  unitPrice: number; // Precio unitario de compra
  totalPrice: number; // Precio total del item (quantity * unitPrice)
  expirationDate?: Date; // Fecha de vencimiento específica del item
  batchCode?: string; // Código del lote
  category?: string; // Categoría del producto
  isNewProduct: boolean; // Si es un producto nuevo o existente
}

/**
 * Interface para un proveedor
 */
export interface Supplier {
  id: string;
  rut: string; // RUT del proveedor
  name: string; // Nombre o razón social
  contact: string; // Persona de contacto
  email?: string; // Email opcional
  phone?: string; // Teléfono opcional
  address?: string; // Dirección opcional
  isActive: boolean; // Si el proveedor está activo
  totalPurchases?: number; // Total de compras realizadas
  lastPurchaseDate?: Date; // Fecha de última compra
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Movimiento de stock generado por una compra
 */
export interface StockMovement {
  id: string;
  type: StockMovementType;
  productId: string; // ID del producto afectado
  productCode: string; // Código del producto
  productName: string; // Nombre del producto
  quantity: number; // Cantidad del movimiento
  previousStock: number; // Stock anterior
  newStock: number; // Nuevo stock después del movimiento
  unitPrice?: number; // Precio unitario (para compras)
  totalValue?: number; // Valor total del movimiento
  purchaseId?: string; // ID de la compra relacionada
  supplierId?: string; // ID del proveedor
  userId: string; // Usuario que generó el movimiento
  userEmail: string; // Email/nombre del usuario
  comments?: string; // Comentarios del movimiento
  batchCode?: string; // Código del lote
  expirationDate?: Date; // Fecha de vencimiento
  createdAt: Date;
}

/**
 * Tipos de movimientos de stock - CORREGIDO
 */
export enum StockMovementType {
  PURCHASE = 'purchase', // Compra (entrada)
  SALE = 'sale', // Venta (salida)
  ADJUSTMENT = 'adjustment', // Ajuste manual
  RETURN = 'return', // Devolución
  EXPIRED = 'expired', // Producto vencido
  DAMAGED = 'damaged', // Producto dañado
  TRANSFER = 'transfer' // Transferencia entre ubicaciones
}

/**
 * Resumen financiero del inventario
 */
export interface FinancesSummary {
  id: string;
  totalInventoryValue: number; // Valor total del inventario
  totalStock: number; // Stock total en unidades
  currentCash: number; // Efectivo actual disponible
  monthlyPurchases: number; // Compras del mes actual
  monthlySales: number; // Ventas del mes actual
  yearlyPurchases: number; // Compras del año actual
  yearlySales: number; // Ventas del año actual
  averageMonthlyPurchases: number; // Promedio mensual de compras
  averageMonthlySales: number; // Promedio mensual de ventas
  inventoryTurnover: number; // Rotación de inventario
  lastUpdated: Date; // Última actualización
  updatedBy: string; // Usuario que actualizó
}

/**
 * Estadísticas de compras
 */
export interface PurchaseStatistics {
  totalPurchases: number; // Total de compras realizadas
  totalAmount: number; // Monto total gastado
  totalItems: number; // Total de items comprados
  averagePurchaseAmount: number; // Promedio por compra
  topSuppliers: SupplierStatistic[]; // Top proveedores
  monthlyTrend: MonthlyStatistic[]; // Tendencia mensual
  categoryBreakdown: CategoryStatistic[]; // Desglose por categoría
}

/**
 * Estadística por proveedor
 */
export interface SupplierStatistic {
  supplierId: string;
  supplierName: string;
  totalPurchases: number;
  totalAmount: number;
  percentage: number; // Porcentaje del total
}

/**
 * Estadística mensual
 */
export interface MonthlyStatistic {
  month: string; // YYYY-MM
  purchases: number; // Número de compras
  amount: number; // Monto total
  items: number; // Items comprados
}

/**
 * Estadística por categoría
 */
export interface CategoryStatistic {
  category: string;
  purchases: number;
  amount: number;
  items: number;
  percentage: number;
}

/**
 * Filtros para búsqueda de compras
 */
export interface PurchaseFilters {
  startDate?: Date;
  endDate?: Date;
  supplierId?: string;
  status?: PurchaseStatus;
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string; // Búsqueda en código o comentarios
}

/**
 * Filtros para movimientos de stock
 */
export interface StockMovementFilters {
  startDate?: Date;
  endDate?: Date;
  productId?: string;
  type?: StockMovementType;
  userId?: string;
  searchTerm?: string;
}

/**
 * Resultado de validación
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[]; // Advertencias no críticas
}

/**
 * Configuración del sistema de compras
 */
export interface PurchaseConfiguration {
  id: string;
  autoGenerateCode: boolean; // Auto-generar códigos de compra
  codePrefix: string; // Prefijo para códigos (ej: "COMP")
  requireExpirationDate: boolean; // Requerir fecha de vencimiento
  allowNegativeStock: boolean; // Permitir stock negativo
  defaultTaxRate: number; // Tasa de impuesto por defecto
  currencyCode: string; // Código de moneda (CLP)
  maxItemsPerPurchase: number; // Máximo items por compra
  requireApproval: boolean; // Requerir aprobación para compras grandes
  approvalThreshold: number; // Umbral para requerir aprobación
  lastUpdated: Date;
  updatedBy: string;
}

/**
 * Notificación del sistema
 */
export interface PurchaseNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  purchaseId?: string;
  userId: string;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Tipos de notificaciones
 */
export enum NotificationType {
  PURCHASE_COMPLETED = 'purchase_completed',
  PURCHASE_CANCELLED = 'purchase_cancelled',
  LOW_STOCK_ALERT = 'low_stock_alert',
  EXPIRATION_WARNING = 'expiration_warning',
  SYSTEM_ERROR = 'system_error'
}

/**
 * Auditoria de acciones
 */
export interface PurchaseAudit {
  id: string;
  action: AuditAction;
  entityType: 'purchase' | 'supplier' | 'product' | 'stock_movement';
  entityId: string;
  oldValues?: Record<string, any>; // Valores anteriores
  newValues?: Record<string, any>; // Valores nuevos
  userId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * Acciones de auditoría
 */
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  EXPORT = 'export',
  IMPORT = 'import'
}

/**
 * Configuración de backup automático
 */
export interface BackupConfiguration {
  id: string;
  enabled: boolean;
  frequency: BackupFrequency;
  retentionDays: number; // Días de retención
  includeAttachments: boolean;
  lastBackup?: Date;
  nextBackup?: Date;
  backupLocation: string;
}

/**
 * Frecuencia de backup
 */
export enum BackupFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

/**
 * Respuesta estándar de la API
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId?: string;
}

/**
 * Respuesta paginada
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Parámetros de paginación
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}