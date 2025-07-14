import { ReportType, ReportStatus } from '../interfaces/Report';
import { PurchaseStatus } from '../interfaces/Purchase';
import { SaleStatus, PaymentMethod } from '../interfaces/Sale';

export const translateReportType = (type: ReportType): string => {
  const translations: Record<ReportType, string> = {
    [ReportType.SALES]: 'Ventas',
    [ReportType.PURCHASES]: 'Compras',
    [ReportType.COMBINED]: 'Combinado',
    [ReportType.PROFIT_LOSS]: 'Ganancias y Pérdidas',
    [ReportType.INVENTORY_VALUE]: 'Valor del Inventario',
    [ReportType.CUSTOMER_ACTIVITY]: 'Actividad de Clientes',
    [ReportType.SUPPLIER_ACTIVITY]: 'Actividad de Proveedores',
    [ReportType.PRODUCT_PERFORMANCE]: 'Rendimiento de Productos',
    [ReportType.FINANCIAL_SUMMARY]: 'Resumen Financiero'
  };
  return translations[type] || type;
};

export const translateReportStatus = (status: ReportStatus): string => {
  const translations: Record<ReportStatus, string> = {
    [ReportStatus.PENDING]: 'Pendiente',
    [ReportStatus.GENERATING]: 'Generando',
    [ReportStatus.COMPLETED]: 'Completado',
    [ReportStatus.FAILED]: 'Error',
    [ReportStatus.EXPIRED]: 'Expirado',
    [ReportStatus.ARCHIVED]: 'Archivado'
  };
  return translations[status] || status;
};

export const translatePurchaseStatus = (status: PurchaseStatus): string => {
  const translations: Record<PurchaseStatus, string> = {
    [PurchaseStatus.PENDING]: 'Pendiente',
    [PurchaseStatus.PROCESSING]: 'Procesando',
    [PurchaseStatus.COMPLETED]: 'Completado',
    [PurchaseStatus.CANCELLED]: 'Cancelado'
  };
  return translations[status] || status;
};

export const translateSaleStatus = (status: SaleStatus): string => {
  const translations: Record<SaleStatus, string> = {
    [SaleStatus.PENDING]: 'Pendiente',
    [SaleStatus.PROCESSING]: 'Procesando',
    [SaleStatus.COMPLETED]: 'Completado',
    [SaleStatus.CANCELLED]: 'Cancelado'
  };
  return translations[status] || status;
};

export const translatePaymentMethod = (method: PaymentMethod): string => {
  const translations: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Efectivo',
    [PaymentMethod.CREDIT_CARD]: 'Tarjeta de Crédito',
    [PaymentMethod.DEBIT_CARD]: 'Tarjeta de Débito',
    [PaymentMethod.TRANSFER]: 'Transferencia',
    [PaymentMethod.CHECK]: 'Cheque'
  };
  return translations[method] || method;
};

export const translateTransactionType = (type: 'sale' | 'purchase'): string => {
  return type === 'sale' ? 'Venta' : 'Compra';
};

export const translateGenericStatus = (status: string): string => {
  const commonTranslations: Record<string, string> = {
    'pending': 'Pendiente',
    'processing': 'Procesando',
    'completed': 'Completado',
    'cancelled': 'Cancelado',
    'failed': 'Error',
    'expired': 'Expirado',
    'archived': 'Archivado',
    'active': 'Activo',
    'inactive': 'Inactivo',
    'draft': 'Borrador',
    'published': 'Publicado',
    'approved': 'Aprobado',
    'rejected': 'Rechazado',
    'new': 'Nuevo',
    'in_progress': 'En Progreso',
    'on_hold': 'En Espera',
    'review': 'En Revisión'
  };
  
  return commonTranslations[status.toLowerCase()] || status;
};

export const getStatusColorClass = (status: string): string => {
  const statusColors: Record<string, string> = {
    'completed': 'success',
    'completado': 'success',
    'active': 'success',
    'activo': 'success',
    'approved': 'success',
    'aprobado': 'success',
    'published': 'success',
    'publicado': 'success',
    
    'pending': 'warning',
    'pendiente': 'warning',
    'processing': 'warning',
    'procesando': 'warning',
    'generating': 'warning',
    'generando': 'warning',
    'in_progress': 'warning',
    'en_progreso': 'warning',
    'review': 'warning',
    'revision': 'warning',
    
    'failed': 'danger',
    'error': 'danger',
    'cancelled': 'danger',
    'cancelado': 'danger',
    'rejected': 'danger',
    'rechazado': 'danger',
    'expired': 'danger',
    'expirado': 'danger',
    'inactive': 'danger',
    'inactivo': 'danger',
    
    'draft': 'secondary',
    'borrador': 'secondary',
    'archived': 'secondary',
    'archivado': 'secondary',
    'on_hold': 'secondary',
    'en_espera': 'secondary'
  };
  
  return statusColors[status.toLowerCase()] || 'secondary';
};

export const formatDateSpanish = (date: Date): string => {
  return date.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateTimeSpanish = (date: Date): string => {
  return date.toLocaleString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatCurrencySpanish = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatNumberSpanish = (number: number): string => {
  return new Intl.NumberFormat('es-CL').format(number);
};