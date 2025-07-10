import { 
  Sale, 
  SaleItem, 
  SaleFormData, 
  PaymentMethod, 
  SaleStatus,
  Customer,
  CustomerFormData,
  ValidationResult
} from '../interfaces/Sale';
import { validateRut, formatRut } from '../components/auth/Login';

/**
 * Generar código único para venta
 */
export const generateUniqueCode = (prefix: string = 'SALE'): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `${prefix}-${year}${month}${day}-${hour}${minute}${second}-${random}`;
};

/**
 * Calcular total de una venta
 */
export const calculateSaleTotal = (items: SaleItem[]): {
  totalAmount: number;
  totalQuantity: number;
  totalItems: number;
} => {
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalItems = items.length;
  
  return {
    totalAmount,
    totalQuantity,
    totalItems
  };
};

/**
 * Validar formulario de venta
 */
export const validateSaleForm = (formData: SaleFormData): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar productos
  if (formData.selectedProducts.length === 0) {
    errors.push('Debe agregar al menos un producto a la venta');
  }

  formData.selectedProducts.forEach((product, index) => {
    if (product.quantity <= 0) {
      errors.push(`Producto ${index + 1}: La cantidad debe ser mayor a 0`);
    }

    if (product.unitPrice <= 0) {
      errors.push(`Producto ${index + 1}: El precio debe ser mayor a 0`);
    }

    if (product.quantity > product.availableStock) {
      errors.push(`Producto ${index + 1}: Stock insuficiente (disponible: ${product.availableStock})`);
    }

    // Advertencias
    if (product.quantity > 50) {
      warnings.push(`Producto ${index + 1}: Cantidad alta (${product.quantity} unidades)`);
    }
  });

  // Validar cliente
  if (!formData.customer.rut.trim()) {
    errors.push('Debe seleccionar o ingresar un cliente');
  } else if (!validateRut(formData.customer.rut)) {
    errors.push('El RUT del cliente no es válido');
  }

  if (!formData.customer.name.trim()) {
    errors.push('El nombre del cliente es obligatorio');
  }

  if (!formData.customer.contact.trim()) {
    errors.push('La información de contacto del cliente es obligatoria');
  }

  // Validar fecha
  if (!formData.saleDate) {
    errors.push('La fecha de venta es obligatoria');
  } else {
    const saleDate = new Date(formData.saleDate);
    const now = new Date();
    
    if (saleDate > now) {
      errors.push('La fecha de venta no puede ser futura');
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    if (saleDate < oneMonthAgo) {
      warnings.push('La fecha de venta es de hace más de un mes');
    }
  }

  // Validar monto total
  const { totalAmount } = calculateSaleTotal(formData.selectedProducts);
  if (totalAmount <= 0) {
    errors.push('El monto total de la venta debe ser mayor a 0');
  }

  if (totalAmount > 5000000) { // 5 millones
    warnings.push('Venta de monto muy alto, revisar antes de procesar');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Formatear precio en pesos chilenos
 */
export const formatCLP = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Formatear fecha para mostrar
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Formatear fecha y hora
 */
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Convertir formulario a objeto Sale
 */
export const formDataToSale = (
  formData: SaleFormData, 
  code: string, 
  userId: string, 
  userEmail: string
): Sale => {
  const { totalAmount, totalQuantity } = calculateSaleTotal(formData.selectedProducts);
  
  // Preparar información del cliente
  const customerInfo: Customer = {
    id: formData.customer.id || '',
    rut: formatRut(formData.customer.rut),
    name: formData.customer.name.trim(),
    contact: formData.customer.contact.trim(),
    email: formData.customer.email?.trim() || undefined,
    phone: formData.customer.phone?.trim() || undefined,
    address: formData.customer.address?.trim() || undefined,
    isActive: true,
    totalPurchases: 0,
    totalAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return {
    id: '',
    code,
    items: formData.selectedProducts.map(product => ({
      productId: product.productId,
      productCode: product.productCode,
      productName: product.productName,
      quantity: product.quantity,
      unitPrice: product.unitPrice,
      totalPrice: product.totalPrice,
      availableStock: product.availableStock,
      category: product.category
    })),
    customerId: formData.customer.id || '',
    customerInfo,
    saleDate: new Date(formData.saleDate),
    totalAmount,
    totalQuantity,
    comments: formData.comments?.trim() || '',
    userId,
    userEmail,
    status: SaleStatus.PENDING,
    paymentMethod: formData.paymentMethod,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

/**
 * Obtener texto del método de pago
 */
export const getPaymentMethodText = (method: PaymentMethod | undefined): string => {
  if (!method) return 'Efectivo'; // Default si es undefined
  
  switch (method) {
    case PaymentMethod.CASH:
      return 'Efectivo';
    case PaymentMethod.CREDIT_CARD:
      return 'Tarjeta de Crédito';
    case PaymentMethod.DEBIT_CARD:
      return 'Tarjeta de Débito';
    case PaymentMethod.TRANSFER:
      return 'Transferencia';
    case PaymentMethod.CHECK:
      return 'Cheque';
    default:
      return 'Efectivo';
  }
};

/**
 * Obtener texto del estado de venta
 */
export const getSaleStatusText = (status: SaleStatus): string => {
  switch (status) {
    case SaleStatus.PENDING:
      return 'Pendiente';
    case SaleStatus.COMPLETED:
      return 'Completada';
    case SaleStatus.CANCELLED:
      return 'Cancelada';
    case SaleStatus.PROCESSING:
      return 'En Proceso';
    default:
      return 'Desconocido';
  }
};

/**
 * Obtener color del estado de venta
 */
export const getSaleStatusColor = (status: SaleStatus): string => {
  switch (status) {
    case SaleStatus.PENDING:
      return '#f59e0b'; // Amarillo
    case SaleStatus.COMPLETED:
      return '#10b981'; // Verde
    case SaleStatus.CANCELLED:
      return '#ef4444'; // Rojo
    case SaleStatus.PROCESSING:
      return '#3b82f6'; // Azul
    default:
      return '#6b7280'; // Gris
  }
};

/**
 * Validar stock disponible para venta
 */
export const validateStockForSale = (items: SaleItem[]): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  items.forEach(item => {
    if (item.quantity > item.availableStock) {
      errors.push(`${item.productName}: Stock insuficiente (disponible: ${item.availableStock}, solicitado: ${item.quantity})`);
    }

    const remainingStock = item.availableStock - item.quantity;
    if (remainingStock <= 5 && remainingStock > 0) {
      warnings.push(`${item.productName}: Quedará en stock crítico (${remainingStock} unidades)`);
    } else if (remainingStock === 0) {
      warnings.push(`${item.productName}: Se agotará completamente`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Calcular ganancia estimada de la venta
 */
export const calculateEstimatedProfit = (items: SaleItem[], costPrices: { [productId: string]: number }): number => {
  return items.reduce((profit, item) => {
    const costPrice = costPrices[item.productId] || 0;
    const itemProfit = (item.unitPrice - costPrice) * item.quantity;
    return profit + itemProfit;
  }, 0);
};

/**
 * Generar resumen de venta para confirmación
 */
export const generateSaleSummary = (formData: SaleFormData, code: string): {
  code: string;
  totalItems: number;
  totalQuantity: number;
  totalAmount: number;
  customer: string;
  paymentMethod: string;
  itemsBreakdown: string[];
} => {
  const { totalAmount, totalQuantity, totalItems } = calculateSaleTotal(formData.selectedProducts);
  
  return {
    code,
    totalItems,
    totalQuantity,
    totalAmount,
    customer: `${formData.customer.name} (${formData.customer.rut})`,
    paymentMethod: getPaymentMethodText(formData.paymentMethod),
    itemsBreakdown: formData.selectedProducts.map(item => 
      `${item.productName} x${item.quantity} = ${formatCLP(item.totalPrice)}`
    )
  };
};

/**
 * Filtrar productos disponibles para venta
 */
export const filterAvailableProducts = (products: any[]): any[] => {
  return products.filter(product => 
    product.isActive && 
    product.stock > 0 && 
    product.sellPrice > 0
  );
};

/**
 * Buscar productos para venta
 */
export const searchProductsForSale = (products: any[], searchTerm: string, searchType: 'name' | 'code'): any[] => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  const term = searchTerm.toLowerCase().trim();
  
  return products.filter(product => {
    if (searchType === 'name') {
      return product.name.toLowerCase().includes(term);
    } else {
      return product.code.toLowerCase().includes(term);
    }
  }).slice(0, 10); // Limitar a 10 resultados
};

/**
 * Validar cliente para venta
 */
export const validateCustomerForSale = (customer: CustomerFormData): ValidationResult => {
  const errors: string[] = [];
  
  if (!customer.rut.trim()) {
    errors.push('El RUT del cliente es obligatorio');
  } else if (!validateRut(customer.rut)) {
    errors.push('El RUT del cliente no es válido');
  }
  
  if (!customer.name.trim()) {
    errors.push('El nombre del cliente es obligatorio');
  }
  
  if (!customer.contact.trim()) {
    errors.push('La información de contacto es obligatoria');
  }
  
  // Validar email si se proporciona
  if (customer.email && customer.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      errors.push('El formato del email no es válido');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generar ticket de venta (formato texto)
 */
export const generateSaleTicket = (sale: Sale): string => {
  const lines: string[] = [];
  
  lines.push('='.repeat(40));
  lines.push('           TICKET DE VENTA');
  lines.push('='.repeat(40));
  lines.push('');
  lines.push(`Código: ${sale.code}`);
  lines.push(`Fecha: ${formatDateTime(sale.saleDate)}`);
  lines.push(`Cliente: ${sale.customerInfo.name}`);
  lines.push(`RUT: ${sale.customerInfo.rut}`);
  lines.push(`Método de Pago: ${getPaymentMethodText(sale.paymentMethod)}`);
  lines.push('');
  lines.push('-'.repeat(40));
  lines.push('PRODUCTOS');
  lines.push('-'.repeat(40));
  
  sale.items.forEach(item => {
    lines.push(`${item.productName}`);
    lines.push(`  ${item.quantity} x ${formatCLP(item.unitPrice)} = ${formatCLP(item.totalPrice)}`);
  });
  
  lines.push('');
  lines.push('-'.repeat(40));
  lines.push(`TOTAL: ${formatCLP(sale.totalAmount)}`);
  lines.push('='.repeat(40));
  lines.push('');
  lines.push('Gracias por su compra');
  lines.push('');
  
  return lines.join('\n');
};

/**
 * Obtener estadísticas rápidas de venta
 */
export const getQuickSaleStats = (sale: Sale): {
  itemsCount: number;
  averageItemPrice: number;
  mostExpensiveItem: SaleItem | null;
  cheapestItem: SaleItem | null;
} => {
  const itemsCount = sale.items.length;
  const averageItemPrice = itemsCount > 0 ? sale.totalAmount / sale.totalQuantity : 0;
  
  let mostExpensiveItem: SaleItem | null = null;
  let cheapestItem: SaleItem | null = null;
  
  if (itemsCount > 0) {
    mostExpensiveItem = sale.items.reduce((max, item) => 
      item.unitPrice > max.unitPrice ? item : max
    );
    
    cheapestItem = sale.items.reduce((min, item) => 
      item.unitPrice < min.unitPrice ? item : min
    );
  }
  
  return {
    itemsCount,
    averageItemPrice,
    mostExpensiveItem,
    cheapestItem
  };
};

/**
 * Validar cantidad a vender
 */
export const validateSaleQuantity = (quantity: number, availableStock: number): ValidationResult => {
  const errors: string[] = [];
  
  if (quantity <= 0) {
    errors.push('La cantidad debe ser mayor a 0');
  }
  
  if (quantity > availableStock) {
    errors.push(`Stock insuficiente. Disponible: ${availableStock}`);
  }
  
  if (quantity > 1000) {
    errors.push('Cantidad muy alta, revisar antes de proceder');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Formatear período para filtros
 */
export const formatPeriod = (startDate: Date, endDate: Date): string => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  
  if (start === end) {
    return start;
  }
  
  return `${start} - ${end}`;
};