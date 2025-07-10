/**
 * Interface principal para una venta
 */
export interface Sale {
  id: string;
  code: string; // Código único de venta (ej: SALE-20250709-143022-5678)
  items: SaleItem[];
  customerId: string;
  customerInfo: Customer;
  saleDate: Date;
  totalAmount: number; // Monto total de la venta
  totalQuantity: number; // Cantidad total de productos vendidos
  comments?: string; // Comentarios opcionales
  userId: string; // ID del usuario que realizó la venta
  userEmail: string; // Email/nombre del usuario
  status: SaleStatus;
  paymentMethod?: PaymentMethod; // Método de pago
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Estados posibles de una venta
 */
export enum SaleStatus {
  PENDING = 'pending', // Pendiente de procesamiento
  COMPLETED = 'completed', // Completada exitosamente
  CANCELLED = 'cancelled', // Cancelada
  PROCESSING = 'processing' // En proceso
}

/**
 * Métodos de pago
 */
export enum PaymentMethod {
  CASH = 'cash', // Efectivo
  CREDIT_CARD = 'credit_card', // Tarjeta de crédito
  DEBIT_CARD = 'debit_card', // Tarjeta de débito
  TRANSFER = 'transfer', // Transferencia bancaria
  CHECK = 'check' // Cheque
}

/**
 * Item individual dentro de una venta
 */
export interface SaleItem {
  productId: string; // ID del producto
  productCode: string; // Código del producto
  productName: string; // Nombre del producto
  quantity: number; // Cantidad vendida
  unitPrice: number; // Precio unitario de venta
  totalPrice: number; // Precio total del item (quantity * unitPrice)
  availableStock: number; // Stock disponible al momento de la venta
  category?: string; // Categoría del producto
}

/**
 * Interface para un cliente
 */
export interface Customer {
  id: string;
  rut: string; // RUT del cliente
  name: string; // Nombre completo
  contact: string; // Información de contacto
  email?: string; // Email opcional
  phone?: string; // Teléfono opcional
  address?: string; // Dirección opcional
  isActive: boolean; // Si el cliente está activo
  totalPurchases: number; // Total de compras realizadas
  totalAmount: number; // Monto total gastado
  lastPurchaseDate?: Date; // Fecha de última compra
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Filtros para búsqueda de ventas
 */
export interface SaleFilters {
  startDate?: Date;
  endDate?: Date;
  customerId?: string;
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string; // Búsqueda en código o comentarios
}

/**
 * Estadísticas de ventas
 */
export interface SaleStatistics {
  totalSales: number; // Total de ventas realizadas
  totalAmount: number; // Monto total vendido
  totalItems: number; // Total de items vendidos
  averageSaleAmount: number; // Promedio por venta
  topCustomers: CustomerStatistic[]; // Top clientes
  monthlyTrend: MonthlySaleStatistic[]; // Tendencia mensual
  categoryBreakdown: CategorySaleStatistic[]; // Desglose por categoría
  paymentMethodBreakdown: PaymentMethodStatistic[]; // Desglose por método de pago
}

/**
 * Estadística por cliente
 */
export interface CustomerStatistic {
  customerId: string;
  customerName: string;
  totalSales: number;
  totalAmount: number;
  percentage: number; // Porcentaje del total
}

/**
 * Estadística mensual de ventas
 */
export interface MonthlySaleStatistic {
  month: string; // YYYY-MM
  sales: number; // Número de ventas
  amount: number; // Monto total
  items: number; // Items vendidos
}

/**
 * Estadística por categoría de ventas
 */
export interface CategorySaleStatistic {
  category: string;
  sales: number;
  amount: number;
  items: number;
  percentage: number;
}

/**
 * Estadística por método de pago
 */
export interface PaymentMethodStatistic {
  method: PaymentMethod;
  sales: number;
  amount: number;
  percentage: number;
}

/**
 * Resultado de validación de stock
 */
export interface StockValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  criticalProducts: CriticalStockProduct[];
}

/**
 * Producto con stock crítico
 */
export interface CriticalStockProduct {
  productId: string;
  productCode: string;
  productName: string;
  currentStock: number;
  newStock: number;
  isCritical: boolean; // Stock <= 5
  isOut: boolean; // Stock = 0
  quantitySold: number;
}

/**
 * Configuración de alertas de stock
 */
export interface StockAlertConfig {
  criticalThreshold: number; // Umbral de stock crítico (por defecto 5)
  outOfStockThreshold: number; // Umbral de agotado (por defecto 0)
  enableAlerts: boolean; // Si las alertas están habilitadas
  alertMethods: AlertMethod[]; // Métodos de alerta
}

/**
 * Métodos de alerta
 */
export enum AlertMethod {
  EMAIL = 'email',
  NOTIFICATION = 'notification',
  LOG = 'log'
}

/**
 * Alerta de stock
 */
export interface StockAlert {
  id: string;
  type: StockAlertType;
  productId: string;
  productCode: string;
  productName: string;
  currentStock: number;
  threshold: number;
  message: string;
  userId: string;
  userEmail: string;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Tipos de alertas de stock
 */
export enum StockAlertType {
  CRITICAL = 'critical', // Stock crítico
  OUT_OF_STOCK = 'out_of_stock', // Sin stock
  LOW_STOCK = 'low_stock' // Stock bajo
}

/**
 * Datos del formulario de venta
 */
export interface SaleFormData {
  selectedProducts: SaleItemForm[];
  customer: CustomerFormData;
  saleDate: string;
  comments: string;
  paymentMethod: PaymentMethod;
}

/**
 * Datos de un item en el formulario de venta
 */
export interface SaleItemForm {
  id?: string; // ID temporal para el formulario
  productId: string; // ID del producto en BD
  productCode: string; // Código del producto
  productName: string; // Nombre del producto
  category: string; // Categoría del producto
  quantity: number; // Cantidad a vender
  unitPrice: number; // Precio unitario de venta
  totalPrice: number; // Calculado automáticamente
  availableStock: number; // Stock disponible
  maxQuantity: number; // Máxima cantidad permitida
  
  // Validación y UI
  hasErrors?: boolean; // Si el item tiene errores de validación
  isEditing?: boolean; // Si está siendo editado
}

/**
 * Datos del cliente en el formulario
 */
export interface CustomerFormData {
  id?: string; // ID del cliente en BD (vacío si es nuevo)
  isNewCustomer: boolean; // Indica si es un cliente nuevo
  rut: string; // RUT del cliente
  name: string; // Nombre completo
  contact: string; // Información de contacto
  email?: string; // Email opcional
  phone?: string; // Teléfono opcional
  address?: string; // Dirección opcional
  
  // Validación y UI
  hasErrors?: boolean; // Si tiene errores de validación
  isLoading?: boolean; // Si está cargando datos
}

/**
 * Estado del formulario de venta
 */
export interface SaleFormState {
  // Datos del formulario
  formData: SaleFormData;
  
  // Estados de UI
  isSubmitting: boolean;
  isValid: boolean;
  hasUnsavedChanges: boolean;
  
  // Validación
  errors: SaleFormErrors;
  warnings: string[];
  
  // Cálculos
  totalAmount: number;
  totalQuantity: number;
  totalItems: number;
  
  // Stock crítico
  criticalProducts: CriticalStockProduct[];
  showCriticalAlert: boolean;
  
  // Configuración
  showConfirmation: boolean;
  generatedCode: string;
}

/**
 * Errores del formulario de venta
 */
export interface SaleFormErrors {
  general: string[]; // Errores generales
  products: SaleProductErrors[]; // Errores por producto
  customer: CustomerErrors; // Errores del cliente
  sale: SaleGeneralErrors; // Errores de la venta
}

/**
 * Errores de productos en venta
 */
export interface SaleProductErrors {
  productId?: string; // ID temporal del producto
  quantity: string[]; // Errores de cantidad
  unitPrice: string[]; // Errores de precio
  stock: string[]; // Errores de stock
}

/**
 * Errores del cliente
 */
export interface CustomerErrors {
  rut: string[]; // Errores del RUT
  name: string[]; // Errores del nombre
  contact: string[]; // Errores del contacto
  email: string[]; // Errores del email
  phone: string[]; // Errores del teléfono
}

/**
 * Errores generales de la venta
 */
export interface SaleGeneralErrors {
  saleDate: string[]; // Errores de fecha de venta
  paymentMethod: string[]; // Errores del método de pago
  comments: string[]; // Errores de comentarios
  totalAmount: string[]; // Errores del monto total
}

/**
 * Opciones de búsqueda de productos para venta
 */
export interface SaleProductSearchOptions {
  searchTerm: string; // Término de búsqueda
  searchType: 'name' | 'code'; // Tipo de búsqueda
  activeOnly: boolean; // Solo productos activos
  inStockOnly: boolean; // Solo productos con stock
  excludeIds: string[]; // IDs a excluir de resultados
  maxResults: number; // Máximo número de resultados
}

/**
 * Resultado de búsqueda de productos para venta
 */
export interface SaleProductSearchResult {
  id: string;
  code: string;
  name: string;
  category: string;
  sellPrice: number;
  stock: number;
  isActive: boolean;
  imageUrl?: string;
  lastSaleDate?: Date;
  salesCount?: number;
}

/**
 * Opciones de búsqueda de clientes
 */
export interface CustomerSearchOptions {
  searchTerm: string; // Término de búsqueda (RUT, nombre, etc.)
  activeOnly: boolean; // Solo clientes activos
  hasRecentPurchases: boolean; // Con compras recientes
  maxResults: number; // Máximo número de resultados
}

/**
 * Resultado de búsqueda de clientes
 */
export interface CustomerSearchResult {
  id: string;
  rut: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  totalPurchases: number;
  totalAmount: number;
  lastPurchaseDate?: Date;
}

/**
 * Datos para preview de venta
 */
export interface SalePreview {
  code: string; // Código generado
  totalItems: number; // Total de items
  totalQuantity: number; // Cantidad total
  totalAmount: number; // Monto total
  customer: CustomerFormData; // Datos del cliente
  paymentMethod: PaymentMethod; // Método de pago
  estimatedProfit: number; // Ganancia estimada
  criticalProducts: CriticalStockProduct[]; // Productos que quedarán críticos
  warnings: string[]; // Advertencias importantes
}

/**
 * Resultado de validación general
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Respuesta estándar de la API para ventas
 */
export interface SaleApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  requestId?: string;
}

/**
 * Configuración del sistema de ventas
 */
export interface SaleConfiguration {
  id: string;
  autoGenerateCode: boolean; // Auto-generar códigos de venta
  codePrefix: string; // Prefijo para códigos (ej: "SALE")
  defaultPaymentMethod: PaymentMethod; // Método de pago por defecto
  requireCustomer: boolean; // Requerir cliente para todas las ventas
  allowNegativeStock: boolean; // Permitir ventas que dejen stock negativo
  stockCriticalThreshold: number; // Umbral de stock crítico
  enableStockAlerts: boolean; // Habilitar alertas de stock
  maxItemsPerSale: number; // Máximo items por venta
  requireApproval: boolean; // Requerir aprobación para ventas grandes
  approvalThreshold: number; // Umbral para requerir aprobación
  lastUpdated: Date;
  updatedBy: string;
}

/**
 * Metadatos de venta
 */
export interface SaleMetadata {
  deviceInfo?: string; // Información del dispositivo
  ipAddress?: string; // Dirección IP
  userAgent?: string; // User agent del navegador
  location?: string; // Ubicación (opcional)
  sessionId?: string; // ID de sesión
}

/**
 * Historial de cambios en ventas
 */
export interface SaleHistory {
  id: string;
  saleId: string;
  action: 'create' | 'update' | 'cancel' | 'complete';
  changes: { field: string; oldValue: any; newValue: any }[];
  userId: string;
  userEmail: string;
  timestamp: Date;
  reason?: string;
}

export default Sale;