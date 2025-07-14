import { 
  Purchase, 
  PurchaseItem, 
  PurchaseStatus, 
  ValidationResult 
} from '../interfaces/Purchase';
import { PurchaseFormData, PurchaseItemForm } from '../interfaces/FormTypes';

/**
 * Validar formulario completo de compra
 */
export const validatePurchaseForm = (data: PurchaseFormData): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar productos
  if (!data.selectedProducts || data.selectedProducts.length === 0) {
    errors.push('Debe agregar al menos un producto a la compra');
  } else {
    data.selectedProducts.forEach((product, index) => {
      const productErrors = validatePurchaseItem(product);
      if (!productErrors.isValid) {
        productErrors.errors.forEach(error => {
          errors.push(`Producto ${index + 1}: ${error}`);
        });
      }
      if (productErrors.warnings) {
        productErrors.warnings.forEach(warning => {
          warnings.push(`Producto ${index + 1}: ${warning}`);
        });
      }
    });

    // Verificar códigos duplicados
    const codes = data.selectedProducts.map(p => p.productCode.toLowerCase());
    const duplicateCodes = codes.filter((code, index) => codes.indexOf(code) !== index);
    if (duplicateCodes.length > 0) {
      // Crear array único sin usar Set
      const uniqueDuplicates = duplicateCodes.filter((code, index) => duplicateCodes.indexOf(code) === index);
      errors.push(`Códigos duplicados encontrados: ${uniqueDuplicates.join(', ')}`);
    }
  }

  // Validar proveedor
  if (!data.supplier || !data.supplier.rut.trim()) {
    errors.push('Debe seleccionar un proveedor');
  } else {
    const supplierValidation = validateSupplierData(data.supplier);
    if (!supplierValidation.isValid) {
      supplierValidation.errors.forEach(error => {
        errors.push(`Proveedor: ${error}`);
      });
    }
  }

  // Validar fecha de compra
  if (!data.purchaseDate) {
    errors.push('La fecha de compra es obligatoria');
  } else {
    const purchaseDate = new Date(data.purchaseDate);
    const now = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setDate(now.getDate() + 30);

    if (purchaseDate > maxFutureDate) {
      errors.push('La fecha de compra no puede ser más de 30 días en el futuro');
    }

    const minDate = new Date();
    minDate.setFullYear(now.getFullYear() - 2);
    if (purchaseDate < minDate) {
      warnings.push('La fecha de compra es muy antigua (más de 2 años)');
    }
  }

  // Validar fecha de vencimiento
  if (data.expirationDate) {
    const expirationDate = new Date(data.expirationDate);
    const purchaseDate = new Date(data.purchaseDate);
    
    if (expirationDate <= purchaseDate) {
      errors.push('La fecha de vencimiento debe ser posterior a la fecha de compra');
    }

    const now = new Date();
    if (expirationDate <= now) {
      warnings.push('La fecha de vencimiento ya ha pasado');
    }
  }

  // Validar totales
  const totalAmount = calculatePurchaseTotal(data.selectedProducts);
  if (totalAmount <= 0) {
    errors.push('El monto total de la compra debe ser mayor a 0');
  }

  if (totalAmount > 50000000) { 
    warnings.push('Monto muy alto, verifique antes de procesar');
  }

  // Validar cantidad de items
  if (data.selectedProducts.length > 100) {
    warnings.push('Cantidad muy alta de productos en una sola compra');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validar un item individual de compra
 */
export const validatePurchaseItem = (item: PurchaseItemForm): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar código del producto
  if (!item.productCode || item.productCode.trim() === '') {
    errors.push('El código del producto es obligatorio');
  } else {
    if (item.productCode.length < 2) {
      errors.push('El código debe tener al menos 2 caracteres');
    }
    if (item.productCode.length > 20) {
      errors.push('El código no puede exceder 20 caracteres');
    }
    if (!/^[A-Za-z0-9-_]+$/.test(item.productCode)) {
      errors.push('El código solo puede contener letras, números, guiones y guiones bajos');
    }
  }

  // Validar nombre del producto
  if (!item.productName || item.productName.trim() === '') {
    errors.push('El nombre del producto es obligatorio');
  } else {
    if (item.productName.length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    }
    if (item.productName.length > 100) {
      errors.push('El nombre no puede exceder 100 caracteres');
    }
  }

  // Validar categoría
  if (!item.category || item.category.trim() === '') {
    errors.push('La categoría es obligatoria');
  } else if (item.category.length > 50) {
    errors.push('La categoría no puede exceder 50 caracteres');
  }

  // Validar cantidad
  if (!validateQuantity(item.quantity)) {
    errors.push('La cantidad debe ser mayor a 0');
  } else {
    if (item.quantity > 10000) {
      warnings.push('Cantidad muy alta, verifique si es correcta');
    }
    if (!Number.isInteger(item.quantity)) {
      warnings.push('La cantidad no es un número entero');
    }
  }

  // Validar precio unitario
  if (!validatePrice(item.unitPrice)) {
    errors.push('El precio unitario debe ser mayor a 0');
  } else {
    if (item.unitPrice > 10000000) { // 10 millones CLP
      warnings.push('Precio unitario muy alto, verifique si es correcto');
    }
    if (item.unitPrice < 1) {
      warnings.push('Precio unitario muy bajo');
    }
  }

  // Validar precio de venta (si se proporciona)
  if (item.sellPrice !== undefined && item.sellPrice > 0) {
    if (!validatePrice(item.sellPrice)) {
      errors.push('El precio de venta debe ser mayor a 0');
    } else if (item.sellPrice <= item.unitPrice) {
      warnings.push('El precio de venta es menor o igual al precio de compra');
    }
  }

  // Validar descripción
  if (item.description && item.description.length > 500) {
    errors.push('La descripción no puede exceder 500 caracteres');
  }

  // Validar fecha de vencimiento
  if (item.expirationDate) {
    const expirationDate = new Date(item.expirationDate);
    const now = new Date();
    
    if (expirationDate <= now) {
      warnings.push('La fecha de vencimiento ya ha pasado');
    }

    const oneYear = new Date();
    oneYear.setFullYear(now.getFullYear() + 10);
    if (expirationDate > oneYear) {
      warnings.push('Fecha de vencimiento muy lejana (más de 10 años)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validar datos básicos del proveedor
 */
const validateSupplierData = (supplier: any): ValidationResult => {
  const errors: string[] = [];

  if (!supplier.rut || supplier.rut.trim() === '') {
    errors.push('El RUT es obligatorio');
  }

  if (!supplier.name || supplier.name.trim() === '') {
    errors.push('El nombre es obligatorio');
  }

  if (!supplier.contact || supplier.contact.trim() === '') {
    errors.push('El contacto es obligatorio');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Calcular total de la compra
 */
export const calculatePurchaseTotal = (items: PurchaseItemForm[]): number => {
  if (!items || items.length === 0) return 0;
  
  return items.reduce((total, item) => {
    const itemTotal = calculateItemTotal(item.quantity, item.unitPrice);
    return total + itemTotal;
  }, 0);
};

/**
 * Calcular total de un item individual
 */
export const calculateItemTotal = (quantity: number, unitPrice: number): number => {
  if (!validateQuantity(quantity) || !validatePrice(unitPrice)) {
    return 0;
  }
  return quantity * unitPrice;
};

/**
 * Validar cantidad
 */
export const validateQuantity = (quantity: number): boolean => {
  return typeof quantity === 'number' && 
         !isNaN(quantity) && 
         quantity > 0 && 
         isFinite(quantity);
};

/**
 * Validar precio
 */
export const validatePrice = (price: number): boolean => {
  return typeof price === 'number' && 
         !isNaN(price) && 
         price > 0 && 
         isFinite(price);
};

/**
 * Generar código único de compra
 */
export const generateUniqueCode = (prefix: string = 'COMP'): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  // Agregar timestamp para garantizar unicidad
  const timestamp = now.getTime().toString().slice(-4); 
  
  return `${prefix}-${year}${month}${day}-${hours}${minutes}${seconds}-${timestamp}`;
};

/**
 * Formatear fecha para mostrar
 */
export const formatPurchaseDate = (date: Date): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Fecha inválida';
  }

  return date.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formatear fecha solo (sin hora)
 */
export const formatDateOnly = (date: Date): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Fecha inválida';
  }

  return date.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Formatear moneda chilena
 */
export const formatCurrency = (amount: number): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$0';
  }

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Formatear número con separadores de miles
 */
export const formatNumber = (number: number): string => {
  if (typeof number !== 'number' || isNaN(number)) {
    return '0';
  }

  return new Intl.NumberFormat('es-CL').format(number);
};

/**
 * Calcular porcentaje de margen
 */
export const calculateMarginPercentage = (sellPrice: number, buyPrice: number): number => {
  if (!validatePrice(sellPrice) || !validatePrice(buyPrice) || buyPrice === 0) {
    return 0;
  }

  return ((sellPrice - buyPrice) / buyPrice) * 100;
};

/**
 * Calcular precio de venta sugerido con margen
 */
export const calculateSuggestedSellPrice = (buyPrice: number, marginPercentage: number = 30): number => {
  if (!validatePrice(buyPrice)) {
    return 0;
  }

  return buyPrice * (1 + marginPercentage / 100);
};

/**
 * Convertir formulario a datos de compra
 */
export const convertFormToPurchase = (
  formData: PurchaseFormData,
  userId: string,
  userEmail: string,
  code?: string
): Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'> => {
  const generatedCode = code || generateUniqueCode('COMP');

  return {
    code: generatedCode,
    items: formData.selectedProducts.map(product => ({
      productId: product.productId || '',
      productCode: product.productCode,
      productName: product.productName,
      quantity: product.quantity,
      unitPrice: product.unitPrice,
      totalPrice: calculateItemTotal(product.quantity, product.unitPrice),
      expirationDate: product.expirationDate ? new Date(product.expirationDate) : undefined,
      batchCode: product.batchCode || `${generatedCode}-${product.productCode}`,
      category: product.category,
      isNewProduct: product.isNewProduct
    })),
    supplierId: formData.supplier.id || '',
    supplierInfo: {
      id: formData.supplier.id || '',
      rut: formData.supplier.rut,
      name: formData.supplier.name,
      contact: formData.supplier.contact,
      email: formData.supplier.email,
      phone: formData.supplier.phone,
      address: formData.supplier.address,
      isActive: true,
      totalPurchases: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    purchaseDate: new Date(formData.purchaseDate),
    expirationDate: formData.expirationDate ? new Date(formData.expirationDate) : undefined,
    totalAmount: calculatePurchaseTotal(formData.selectedProducts),
    totalQuantity: formData.selectedProducts.reduce((sum, item) => sum + item.quantity, 0),
    comments: formData.comments,
    userId,
    userEmail,
    status: PurchaseStatus.PENDING
  };
};

/**
 * Verificar si una compra puede ser editada
 */
export const canEditPurchase = (purchase: Purchase): boolean => {
  return purchase.status === PurchaseStatus.PENDING;
};

/**
 * Verificar si una compra puede ser cancelada
 */
export const canCancelPurchase = (purchase: Purchase): boolean => {
  return purchase.status === PurchaseStatus.PENDING || 
         purchase.status === PurchaseStatus.PROCESSING;
};

/**
 * Verificar si una compra puede ser eliminada
 */
export const canDeletePurchase = (purchase: Purchase): boolean => {
  return purchase.status === PurchaseStatus.PENDING || 
         purchase.status === PurchaseStatus.CANCELLED;
};

/**
 * Obtener color de estado de compra
 */
export const getPurchaseStatusColor = (status: PurchaseStatus): string => {
  switch (status) {
    case PurchaseStatus.PENDING:
      return '#f59e0b'; // Amarillo
    case PurchaseStatus.PROCESSING:
      return '#3b82f6'; // Azul
    case PurchaseStatus.COMPLETED:
      return '#10b981'; // Verde
    case PurchaseStatus.CANCELLED:
      return '#ef4444'; // Rojo
    default:
      return '#6b7280'; // Gris
  }
};

/**
 * Obtener texto de estado de compra
 */
export const getPurchaseStatusText = (status: PurchaseStatus): string => {
  switch (status) {
    case PurchaseStatus.PENDING:
      return 'Pendiente';
    case PurchaseStatus.PROCESSING:
      return 'Procesando';
    case PurchaseStatus.COMPLETED:
      return 'Completada';
    case PurchaseStatus.CANCELLED:
      return 'Cancelada';
    default:
      return 'Desconocido';
  }
};

/**
 * Limpiar datos del formulario
 */
export const getEmptyPurchaseForm = (): PurchaseFormData => {
  return {
    selectedProducts: [],
    supplier: {
      isNewSupplier: false,
      rut: '',
      name: '',
      contact: '',
      email: '',
      phone: '',
      address: ''
    },
    purchaseDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    comments: '',
    batchCode: ''
  };
};

/**
 * Verificar si el formulario tiene cambios sin guardar
 */
export const hasUnsavedChanges = (
  currentForm: PurchaseFormData, 
  initialForm: PurchaseFormData
): boolean => {
  return JSON.stringify(currentForm) !== JSON.stringify(initialForm);
};

/**
 * Obtener resumen de compra para confirmación
 */
export const getPurchaseSummary = (formData: PurchaseFormData) => {
  const totalItems = formData.selectedProducts.length;
  const totalQuantity = formData.selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = calculatePurchaseTotal(formData.selectedProducts);
  const newProductsCount = formData.selectedProducts.filter(item => item.isNewProduct).length;
  const existingProductsCount = totalItems - newProductsCount;

  return {
    totalItems,
    totalQuantity,
    totalAmount,
    newProductsCount,
    existingProductsCount,
    formattedTotal: formatCurrency(totalAmount),
    averageItemValue: totalItems > 0 ? totalAmount / totalItems : 0
  };
};

/**
 * Validar que no haya productos duplicados
 */
export const validateNoDuplicateProducts = (products: PurchaseItemForm[]): ValidationResult => {
  const errors: string[] = [];
  const seenCodes: string[] = [];
  const seenNames: string[] = [];

  products.forEach((product, index) => {
    const code = product.productCode.toLowerCase().trim();
    const name = product.productName.toLowerCase().trim();

    if (seenCodes.includes(code)) {
      errors.push(`Producto ${index + 1}: Código duplicado "${product.productCode}"`);
    } else {
      seenCodes.push(code);
    }

    if (seenNames.includes(name)) {
      errors.push(`Producto ${index + 1}: Nombre duplicado "${product.productName}"`);
    } else {
      seenNames.push(name);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Ordenar productos por diferentes criterios
 */
export const sortProducts = (
  products: PurchaseItemForm[], 
  sortBy: 'name' | 'code' | 'category' | 'quantity' | 'unitPrice' | 'total',
  order: 'asc' | 'desc' = 'asc'
): PurchaseItemForm[] => {
  const sorted = [...products].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.productName.localeCompare(b.productName);
        break;
      case 'code':
        comparison = a.productCode.localeCompare(b.productCode);
        break;
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
      case 'quantity':
        comparison = a.quantity - b.quantity;
        break;
      case 'unitPrice':
        comparison = a.unitPrice - b.unitPrice;
        break;
      case 'total':
        const totalA = calculateItemTotal(a.quantity, a.unitPrice);
        const totalB = calculateItemTotal(b.quantity, b.unitPrice);
        comparison = totalA - totalB;
        break;
    }

    return order === 'desc' ? -comparison : comparison;
  });

  return sorted;
};