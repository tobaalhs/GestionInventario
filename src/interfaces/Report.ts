/**
 * Interface principal para reportes de transacciones
 */
export interface TransactionReport {
  id: string;
  code: string; // Código único del reporte (ej: REPORT-SALE-20250709-001)
  type: ReportType;
  title: string;
  description?: string;
  
  // Período del reporte
  periodStart: Date;
  periodEnd: Date;
  
  // Datos de la transacción
  transactionData: TransactionData[];
  
  // Resumen financiero
  summary: ReportSummary;
  
  // Metadatos
  generatedBy: string; // ID del usuario
  generatedByName: string; // Nombre del usuario
  generatedAt: Date;
  status: ReportStatus;
  
  // Configuración de filtros aplicados
  filters: TransactionFilters;
  
  // Archivos generados
  files: ReportFile[];
  
  // Estadísticas adicionales
  statistics?: ReportStatistics;
  
  // Configuración de exportación utilizada
  exportConfig?: ReportExportConfig;
  
  updatedAt: Date;
}

/**
 * Tipos de reportes disponibles
 */
export enum ReportType {
  SALES = 'sales',
  PURCHASES = 'purchases',
  COMBINED = 'combined', // Reporte combinado de compras y ventas
  PROFIT_LOSS = 'profit_loss', // Reporte de ganancias y pérdidas
  INVENTORY_VALUE = 'inventory_value', // Reporte de valor del inventario
  CUSTOMER_ACTIVITY = 'customer_activity', // Actividad de clientes
  SUPPLIER_ACTIVITY = 'supplier_activity', // Actividad de proveedores
  PRODUCT_PERFORMANCE = 'product_performance', // Rendimiento de productos
  FINANCIAL_SUMMARY = 'financial_summary' // Resumen financiero general
}

/**
 * Estados del reporte
 */
export enum ReportStatus {
    PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  ARCHIVED = 'archived'
}

/**
 * Datos de transacción individual en el reporte
 */
export interface TransactionData {
  // Identificación
  id: string;
  code: string;
  type: 'sale' | 'purchase';
  
  // Fechas
  transactionDate: Date;
  createdAt: Date;
  
  // Partes involucradas
  counterparty: TransactionCounterparty; // Cliente o Proveedor
  user: TransactionUser; // Usuario que realizó la transacción
  
  // Productos
  items: TransactionItem[];
  
  // Totales
  subtotal: number;
  taxes: number;
  discount: number;
  totalAmount: number;
  totalQuantity: number;
  
  // Detalles adicionales
  paymentMethod?: string;
  paymentStatus?: string;
  comments?: string;
  
  // Referencias
  invoiceNumber?: string;
  orderNumber?: string;
  
  // Estado
  status: string;
}

/**
 * Contraparte de la transacción (cliente o proveedor)
 */
export interface TransactionCounterparty {
  id: string;
  rut: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  address?: string;
  type: 'customer' | 'supplier';
}

/**
 * Usuario que realizó la transacción
 */
export interface TransactionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Item individual en la transacción
 */
export interface TransactionItem {
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  cost?: number; // Costo del producto (para calcular ganancia)
  profit?: number; // Ganancia por item
  margin?: number; // Margen de ganancia (%)
}

/**
 * Resumen del reporte
 */
export interface ReportSummary {
  // Conteos
  totalTransactions: number;
  totalItems: number;
  totalQuantity: number;
  
  // Montos
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  averageTransactionAmount: number;
  averageMargin: number;
  
  // Desglose por tipo (si es reporte combinado)
  salesSummary?: FinancialSummary;
  purchasesSummary?: FinancialSummary;
  
  // Tendencias
  trends: ReportTrends;
}

/**
 * Resumen financiero por tipo
 */
export interface FinancialSummary {
  count: number;
  totalAmount: number;
  totalQuantity: number;
  averageAmount: number;
  topTransaction: TransactionData | null;
}

/**
 * Tendencias del reporte
 */
export interface ReportTrends {
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  growthRate: number; // % crecimiento vs período anterior
  seasonalityFactor: number; // Factor de estacionalidad
  topDay: DailyTrend | null;
  topWeek: WeeklyTrend | null;
}

/**
 * Tendencia diaria
 */
export interface DailyTrend {
  date: string; // YYYY-MM-DD
  transactions: number;
  amount: number;
  quantity: number;
}

/**
 * Tendencia semanal
 */
export interface WeeklyTrend {
  week: string; // YYYY-WW
  transactions: number;
  amount: number;
  quantity: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Filtros para generar reportes
 */
export interface TransactionFilters {
  // Período
  startDate: Date;
  endDate: Date;
  
  // Tipos de transacción
  includeTypes: ('sale' | 'purchase')[];
  
  // Filtros de entidades
  customerIds?: string[];
  supplierIds?: string[];
  userIds?: string[];
  productIds?: string[];
  categories?: string[];
  
  // Filtros financieros
  minAmount?: number;
  maxAmount?: number;
  paymentMethods?: string[];
  
  // Filtros de estado
  statuses?: string[];
  
  // Búsqueda
  searchTerm?: string;
  
  // Agrupación
  groupBy?: ReportGrouping;
  
  // Configuración
  includeDeletedTransactions?: boolean;
  includePendingTransactions?: boolean;
}

/**
 * Opciones de agrupación para reportes
 */
export enum ReportGrouping {
  NONE = 'none',
  DATE = 'date',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
  PRODUCT = 'product',
  CATEGORY = 'category',
  USER = 'user',
  PAYMENT_METHOD = 'payment_method'
}

/**
 * Estadísticas adicionales del reporte
 */
export interface ReportStatistics {
  // Top performers
  topCustomers: CustomerStat[];
  topSuppliers: SupplierStat[];
  topProducts: ProductStat[];
  topCategories: CategoryStat[];
  topUsers: UserStat[];
  
  // Análisis temporal
  hourlyDistribution: HourlyDistribution[];
  weeklyDistribution: WeeklyDistribution[];
  monthlyComparison: MonthlyComparison[];
  
  // Análisis financiero
  profitabilityAnalysis: ProfitabilityAnalysis;
  paymentMethodAnalysis: PaymentMethodStat[];
  
  // Métricas de rendimiento
  kpis: ReportKPIs;
}

/**
 * Estadística de cliente
 */
export interface CustomerStat {
  customerId: string;
  customerName: string;
  customerRut: string;
  transactionCount: number;
  totalAmount: number;
  totalQuantity: number;
  averageOrderValue: number;
  lastTransactionDate: Date;
  percentage: number; // % del total
}

/**
 * Estadística de proveedor
 */
export interface SupplierStat {
  supplierId: string;
  supplierName: string;
  supplierRut: string;
  transactionCount: number;
  totalAmount: number;
  totalQuantity: number;
  averageOrderValue: number;
  lastTransactionDate: Date;
  percentage: number;
}

/**
 * Estadística de producto
 */
export interface ProductStat {
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  salesCount: number;
  purchasesCount: number;
  totalSalesAmount: number;
  totalPurchasesAmount: number;
  totalQuantitySold: number;
  totalQuantityPurchased: number;
  averageSellingPrice: number;
  averageCost: number;
  averageMargin: number;
  currentStock: number;
}

/**
 * Estadística de categoría
 */
export interface CategoryStat {
  category: string;
  transactionCount: number;
  totalAmount: number;
  totalQuantity: number;
  productsCount: number;
  averageAmount: number;
  percentage: number;
}

/**
 * Estadística de usuario
 */
export interface UserStat {
  userId: string;
  userName: string;
  userEmail: string;
  transactionCount: number;
  totalAmount: number;
  averageTransactionAmount: number;
  lastActivity: Date;
  percentage: number;
}

/**
 * Distribución por hora
 */
export interface HourlyDistribution {
  hour: number; // 0-23
  transactionCount: number;
  totalAmount: number;
  percentage: number;
}

/**
 * Distribución semanal
 */
export interface WeeklyDistribution {
  dayOfWeek: number; // 0=Domingo, 1=Lunes, etc.
  dayName: string;
  transactionCount: number;
  totalAmount: number;
  percentage: number;
}

/**
 * Comparación mensual
 */
export interface MonthlyComparison {
  month: string; // YYYY-MM
  monthName: string;
  currentYear: MonthlyData;
  previousYear?: MonthlyData;
  growthRate: number;
}

/**
 * Datos mensuales
 */
export interface MonthlyData {
  transactionCount: number;
  totalAmount: number;
  totalQuantity: number;
  averageDailyAmount: number;
}

/**
 * Análisis de rentabilidad
 */
export interface ProfitabilityAnalysis {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossMargin: number; // %
  netProfit: number;
  netMargin: number; // %
  breakdownByProduct: ProductProfitability[];
  breakdownByCategory: CategoryProfitability[];
}

/**
 * Rentabilidad por producto
 */
export interface ProductProfitability {
  productId: string;
  productName: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  units: number;
}

/**
 * Rentabilidad por categoría
 */
export interface CategoryProfitability {
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  products: number;
}

/**
 * Estadística de método de pago
 */
export interface PaymentMethodStat {
  method: string;
  transactionCount: number;
  totalAmount: number;
  percentage: number;
  averageAmount: number;
}

/**
 * KPIs del reporte
 */
export interface ReportKPIs {
  // Ventas
  totalRevenue: number;
  averageOrderValue: number;
  transactionsPerDay: number;
  customerAcquisitionRate: number;
  customerRetentionRate: number;
  
  // Inventario
  inventoryTurnover: number;
  stockoutRate: number;
  averageInventoryValue: number;
  
  // Rentabilidad
  grossMargin: number;
  netMargin: number;
  returnOnInvestment: number;
  
  // Eficiencia
  averageProcessingTime: number;
  userProductivity: number;
}

/**
 * Archivo generado del reporte
 */
export interface ReportFile {
  id: string;
  fileName: string;
  format: 'pdf' | 'excel' | 'csv';
  size: number; // bytes
  downloadUrl: string;
  generatedAt: Date;
  expiresAt: Date;
  isProtected: boolean; // Si tiene contraseña
  checksumMD5: string;
}

/**
 * Configuración de exportación del reporte
 */
export interface ReportExportConfig {
  formats: ('pdf' | 'excel' | 'csv')[];
  includeCharts: boolean;
  includeStatistics: boolean;
  includeRawData: boolean;
  groupData: boolean;
  applyFilters: boolean;
  passwordProtect: boolean;
  password?: string;
  emailTo?: string[];
  customTemplate?: string;
  watermark?: string;
  compressFiles: boolean;
}

/**
 * Configuración de plantilla para reportes
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  isDefault: boolean;
  
  // Configuración visual
  logo?: string;
  headerColor: string;
  fontFamily: string;
  fontSize: number;
  
  // Secciones incluidas
  includeSummary: boolean;
  includeCharts: boolean;
  includeStatistics: boolean;
  includeRawData: boolean;
  includeFooter: boolean;
  
  // Configuración de datos
  defaultFilters: TransactionFilters;
  defaultGrouping: ReportGrouping;
  maxRecords: number;
  
  // Metadatos
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

/**
 * Solicitud de generación de reporte
 */
export interface ReportGenerationRequest {
  type: ReportType;
  title: string;
  description?: string;
  filters: TransactionFilters;
  exportConfig: ReportExportConfig;
  templateId?: string;
  scheduledFor?: Date; // Para reportes programados
  recurrence?: ReportRecurrence; // Para reportes recurrentes
}

/**
 * Configuración de recurrencia para reportes automáticos
 */
export interface ReportRecurrence {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval: number; // cada X frecuencias
  daysOfWeek?: number[]; // Para semanal
  dayOfMonth?: number; // Para mensual
  endDate?: Date;
  emailRecipients: string[];
  autoArchive: boolean;
  archiveAfterDays: number;
}

/**
 * Estado de generación del reporte
 */
export interface ReportGenerationStatus {
  reportId: string;
  status: ReportStatus;
  progress: number; // 0-100
  currentStep: string;
  estimatedTimeRemaining: number; // segundos
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Configuración de búsqueda de reportes
 */
export interface ReportSearchFilters {
  types?: ReportType[];
  statuses?: ReportStatus[];
  generatedBy?: string[];
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  sortBy?: 'generatedAt' | 'title' | 'type' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Resultado de búsqueda de reportes
 */
export interface ReportSearchResult {
  reports: TransactionReport[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Validación de filtros de reporte
 */
export interface ReportFilterValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  appliedFilters: TransactionFilters;
  estimatedRecords: number;
  estimatedProcessingTime: number; // segundos
}

export default TransactionReport;