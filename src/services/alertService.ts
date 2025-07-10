/**
 * Interface principal para un cliente
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
 * Filtros para obtener clientes
 */
export interface CustomerFilters {
  isActive?: boolean;
  hasRecentPurchases?: boolean;
  minTotalAmount?: number;
  maxTotalAmount?: number;
  minPurchases?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  searchTerm?: string;
}

/**
 * Resumen de actividad del cliente
 */
export interface CustomerActivitySummary {
  customerId: string;
  customerName: string;
  totalPurchases: number;
  totalAmount: number;
  averagePurchaseAmount: number;
  lastPurchaseDate?: Date;
  firstPurchaseDate?: Date;
  isActive: boolean;
  recentActivity: {
    lastMonth: {
      purchases: number;
      amount: number;
    };
    lastThreeMonths: {
      purchases: number;
      amount: number;
    };
    lastYear: {
      purchases: number;
      amount: number;
    };
  };
}

/**
 * Datos para crear un cliente desde formulario de venta
 */
export interface NewCustomerData {
  rut: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  address?: string;
}

/**
 * Errores del cliente en formularios
 */
export interface CustomerErrors {
  rut: string[]; // Errores del RUT
  name: string[]; // Errores del nombre
  contact: string[]; // Errores del contacto
  email: string[]; // Errores del email
  phone: string[]; // Errores del teléfono
  address: string[]; // Errores de la dirección
}

/**
 * Resultado de validación de cliente
 */
export interface CustomerValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

/**
 * Configuración del módulo de clientes
 */
export interface CustomerConfiguration {
  requireEmail: boolean; // Requerir email
  requirePhone: boolean; // Requerir teléfono
  requireAddress: boolean; // Requerir dirección
  allowDuplicateNames: boolean; // Permitir nombres duplicados
  autoDeactivateInactive: boolean; // Desactivar automáticamente clientes inactivos
  inactivityThreshold: number; // Meses de inactividad para auto-desactivar
  defaultContactType: 'email' | 'phone' | 'address'; // Tipo de contacto por defecto
}

/**
 * Historial de cambios del cliente
 */
export interface CustomerHistory {
  id: string;
  customerId: string;
  action: 'create' | 'update' | 'activate' | 'deactivate' | 'delete';
  changes: { field: string; oldValue: any; newValue: any }[];
  userId: string;
  userEmail: string;
  timestamp: Date;
  reason?: string;
}

/**
 * Métricas de clientes
 */
export interface CustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  newCustomersThisMonth: number;
  topCustomersByAmount: CustomerStatistic[];
  topCustomersByPurchases: CustomerStatistic[];
  averageCustomerValue: number;
  customerRetentionRate: number; // Porcentaje de clientes que han comprado en los últimos 6 meses
  customersWithRecentActivity: number; // Clientes con compras en el último mes
}

/**
 * Preferencias del cliente
 */
export interface CustomerPreferences {
  customerId: string;
  preferredPaymentMethod?: string;
  preferredContactMethod: 'email' | 'phone' | 'sms';
  notificationSettings: {
    orderConfirmations: boolean;
    promotions: boolean;
    stockAlerts: boolean;
  };
  notes?: string; // Notas especiales sobre el cliente
  discountEligible: boolean; // Si es elegible para descuentos
  creditLimit?: number; // Límite de crédito si aplica
}

export default Customer;