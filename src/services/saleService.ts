import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  Timestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  Sale, 
  SaleItem, 
  SaleStatus, 
  SaleFilters,
  SaleStatistics,
  ValidationResult,
  StockValidationResult,
  CriticalStockProduct,
  PaymentMethod,
  CustomerStatistic,
  MonthlySaleStatistic,
  CategorySaleStatistic,
  PaymentMethodStatistic
} from '../interfaces/Sale';

// Importaciones de servicios
import { createCustomer, getCustomerByRut, updateCustomerPurchaseStats } from './customerService';
import { createStockMovement } from './stockMovementService';
import { updateFinancesAfterSale } from './financeService';

// Enum para tipos de movimiento de stock
enum StockMovementType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return'
}

/**
 * Generar código único para la venta
 */
export const generateSaleCode = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `SALE-${year}${month}${day}-${hour}${minute}${second}-${random}`;
};

/**
 * Validar datos de venta antes de procesarla
 */
export const validateSaleData = (saleData: Partial<Sale>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validaciones obligatorias
  if (!saleData.code || saleData.code.trim() === '') {
    errors.push('El código de venta es obligatorio');
  }

  if (!saleData.items || saleData.items.length === 0) {
    errors.push('Debe incluir al menos un producto en la venta');
  }

  if (!saleData.customerId || saleData.customerId.trim() === '') {
    errors.push('Debe seleccionar un cliente');
  }

  if (!saleData.saleDate) {
    errors.push('La fecha de venta es obligatoria');
  }

  if (!saleData.userId || saleData.userId.trim() === '') {
    errors.push('El usuario responsable es obligatorio');
  }

  // Validaciones de items
  if (saleData.items) {
    saleData.items.forEach((item, index) => {
      if (!item.productCode || item.productCode.trim() === '') {
        errors.push(`Producto ${index + 1}: El código es obligatorio`);
      }

      if (!item.productName || item.productName.trim() === '') {
        errors.push(`Producto ${index + 1}: El nombre es obligatorio`);
      }

      if (item.quantity <= 0) {
        errors.push(`Producto ${index + 1}: La cantidad debe ser mayor a 0`);
      }

      if (item.unitPrice <= 0) {
        errors.push(`Producto ${index + 1}: El precio debe ser mayor a 0`);
      }

      // Validación de stock
      if (item.quantity > item.availableStock) {
        errors.push(`Producto ${index + 1}: Stock insuficiente (disponible: ${item.availableStock}, solicitado: ${item.quantity})`);
      }

      // Advertencias
      if (item.quantity > 100) {
        warnings.push(`Producto ${index + 1}: Cantidad muy alta (${item.quantity})`);
      }

      if (item.unitPrice > 1000000) {
        warnings.push(`Producto ${index + 1}: Precio muy alto (${item.unitPrice})`);
      }
    });
  }

  // Validaciones de montos
  if (saleData.totalAmount && saleData.totalAmount <= 0) {
    errors.push('El monto total debe ser mayor a 0');
  }

  if (saleData.totalAmount && saleData.totalAmount > 10000000) {
    warnings.push('Monto total muy alto, revise antes de procesar');
  }

  // Validaciones de fecha
  if (saleData.saleDate) {
    const saleDateValue = new Date(saleData.saleDate);
    const now = new Date();
    const oneDayAgo = new Date();
    oneDayAgo.setDate(now.getDate() - 1);

    if (saleDateValue > now) {
      errors.push('La fecha de venta no puede ser en el futuro');
    }

    if (saleDateValue < oneDayAgo) {
      warnings.push('La fecha de venta es de hace más de un día');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Verificar disponibilidad de stock para los productos
 */
export const checkStockAvailability = async (items: SaleItem[]): Promise<StockValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const criticalProducts: CriticalStockProduct[] = [];

  try {
    for (const item of items) {
      // Obtener datos actuales del producto
      const productDoc = await getDoc(doc(db, 'items', item.productId));
      
      if (!productDoc.exists()) {
        errors.push(`Producto ${item.productName}: No existe en la base de datos`);
        continue;
      }

      const productData = productDoc.data();
      const currentStock = productData.stock || 0;

      // Verificar si el producto está activo
      if (!productData.isActive) {
        errors.push(`Producto ${item.productName}: No está activo`);
        continue;
      }

      // Verificar stock disponible
      if (currentStock < item.quantity) {
        errors.push(`Producto ${item.productName}: Stock insuficiente (disponible: ${currentStock}, solicitado: ${item.quantity})`);
        continue;
      }

      // Calcular stock después de la venta
      const newStock = currentStock - item.quantity;

      // Verificar si quedará en stock crítico
      if (newStock <= 5) {
        criticalProducts.push({
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          currentStock,
          newStock,
          isCritical: newStock <= 5 && newStock > 0,
          isOut: newStock === 0,
          quantitySold: item.quantity
        });

        if (newStock === 0) {
          warnings.push(`Producto ${item.productName}: Se agotará completamente`);
        } else if (newStock <= 5) {
          warnings.push(`Producto ${item.productName}: Quedará en stock crítico (${newStock} unidades)`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      criticalProducts
    };
  } catch (error) {
    console.error('Error verificando stock:', error);
    return {
      isValid: false,
      errors: ['Error al verificar disponibilidad de stock'],
      warnings: [],
      criticalProducts: []
    };
  }
};

/**
 * Crear una nueva venta
 */
export const createSale = async (saleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    // Validar datos
    const validation = validateSaleData(saleData);
    if (!validation.isValid) {
      throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
    }

    // Verificar que el código sea único
    const existingSale = await getSaleByCode(saleData.code);
    if (existingSale) {
      throw new Error('Ya existe una venta con este código');
    }

    console.log('🏗️ Preparando datos para guardar en Firestore...');

    // Función helper para limpiar valores undefined
    const cleanObject = (obj: any): any => {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            const cleanedNested = cleanObject(value);
            if (Object.keys(cleanedNested).length > 0) {
              cleaned[key] = cleanedNested;
            }
          } else {
            cleaned[key] = value;
          }
        }
      });
      return cleaned;
    };

    // Preparar datos para guardar
    const newSale: any = {
      code: saleData.code,
      items: saleData.items.map(item => cleanObject({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        availableStock: item.availableStock,
        category: item.category || 'Sin categoría'
      })),
      customerId: saleData.customerId || '',
      customerInfo: cleanObject({
        id: saleData.customerInfo.id || '',
        rut: saleData.customerInfo.rut,
        name: saleData.customerInfo.name,
        contact: saleData.customerInfo.contact,
        email: saleData.customerInfo.email || '',
        phone: saleData.customerInfo.phone || '',
        address: saleData.customerInfo.address || '',
        isActive: saleData.customerInfo.isActive !== false,
        totalPurchases: saleData.customerInfo.totalPurchases || 0,
        totalAmount: saleData.customerInfo.totalAmount || 0,
        createdAt: saleData.customerInfo.createdAt ? Timestamp.fromDate(new Date(saleData.customerInfo.createdAt)) : Timestamp.now(),
        updatedAt: Timestamp.now()
      }),
      saleDate: Timestamp.fromDate(new Date(saleData.saleDate)),
      totalAmount: saleData.totalAmount,
      totalQuantity: saleData.totalQuantity,
      comments: saleData.comments || '',
      userId: saleData.userId,
      userEmail: saleData.userEmail,
      status: saleData.status || SaleStatus.PENDING,
      paymentMethod: saleData.paymentMethod || PaymentMethod.CASH,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    console.log('✅ Datos limpiados preparados para Firestore');

    // Guardar en Firestore
    const docRef = await addDoc(collection(db, 'sales'), newSale);
    
    console.log('✅ Venta creada exitosamente con ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('💥 Error creando venta:', error);
    throw error;
  }
};

/**
 * Obtener venta por código
 */
export const getSaleByCode = async (code: string): Promise<Sale | null> => {
  try {
    const q = query(
      collection(db, 'sales'),
      where('code', '==', code),
      firestoreLimit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        saleDate: data.saleDate.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Sale;
    }
    
    return null;
  } catch (error) {
    console.error('Error obteniendo venta por código:', error);
    throw error;
  }
};

/**
 * Actualizar stock después de la venta
 */
export const updateInventoryAfterSale = async (items: SaleItem[]): Promise<void> => {
  try {
    const batch = writeBatch(db);

    for (const item of items) {
      const productRef = doc(db, 'items', item.productId);
      const productDoc = await getDoc(productRef);

      if (!productDoc.exists()) {
        throw new Error(`Producto ${item.productName} no encontrado`);
      }

      const currentStock = productDoc.data().stock || 0;
      const newStock = currentStock - item.quantity;

      if (newStock < 0) {
        throw new Error(`Stock insuficiente para ${item.productName}`);
      }

      batch.update(productRef, {
        stock: newStock,
        updatedAt: Timestamp.now()
      });

      // Crear movimiento de stock
      await createStockMovement({
        type: StockMovementType.SALE,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        previousStock: currentStock,
        newStock: newStock,
        unitPrice: item.unitPrice,
        totalValue: item.totalPrice,
        userId: '',
        userEmail: '',
        comments: `Venta de ${item.quantity} unidades`
      });
    }

    await batch.commit();
    console.log('Stock actualizado después de la venta');
  } catch (error) {
    console.error('Error actualizando stock:', error);
    throw error;
  }
};

/**
 * Procesar transacción completa de venta
 */
export const processSaleTransaction = async (saleData: Sale): Promise<void> => {
  try {
    console.log('Iniciando procesamiento de venta:', saleData.code);

    // Verificar stock antes de procesar
    const stockValidation = await checkStockAvailability(saleData.items);
    if (!stockValidation.isValid) {
      throw new Error(`Stock insuficiente: ${stockValidation.errors.join(', ')}`);
    }

    // Usar transacción de Firestore para garantizar consistencia
    await runTransaction(db, async (transaction) => {
      let finalCustomerId = saleData.customerId;
      
      // Manejar cliente
      if (!finalCustomerId || finalCustomerId.trim() === '') {
        console.log('Creando nuevo cliente.');
        finalCustomerId = await createCustomer(saleData.customerInfo);
        console.log('Nuevo cliente creado con ID:', finalCustomerId);
      }

      // Actualizar el saleData con el ID final del cliente
      saleData.customerId = finalCustomerId;

      // Realizar todas las lecturas primero
      const productRefs = saleData.items.map(item => doc(db, 'items', item.productId));
      const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

      // Procesar cada producto
      for (let i = 0; i < saleData.items.length; i++) {
        const item = saleData.items[i];
        const productDoc = productDocs[i];

        if (!productDoc.exists()) {
          throw new Error(`El producto ${item.productName} no existe`);
        }

        const productData = productDoc.data();
        const currentStock = productData.stock || 0;

        if (currentStock < item.quantity) {
          throw new Error(`Stock insuficiente para ${item.productName}`);
        }

        // Actualizar stock del producto
        const newStock = currentStock - item.quantity;
        transaction.update(productDoc.ref, {
          stock: newStock,
          updatedAt: Timestamp.now()
        });

        // Crear movimiento de stock
        const movementData: any = {
          type: StockMovementType.SALE,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          quantity: item.quantity,
          previousStock: currentStock,
          newStock: newStock,
          unitPrice: item.unitPrice,
          totalValue: item.totalPrice,
          customerId: finalCustomerId,
          userId: saleData.userId,
          userEmail: saleData.userEmail,
          comments: `Venta ${saleData.code}`,
          createdAt: Timestamp.now()
        };

        const movementRef = doc(collection(db, 'stockMovements'));
        transaction.set(movementRef, movementData);
      }

      // Crear la venta
      console.log('Registrando venta en base de datos.');
      await createSale({
        ...saleData,
        customerId: finalCustomerId,
        status: SaleStatus.COMPLETED
      });

      console.log('✅ Venta procesada exitosamente:', saleData.code);
    });

    // Actualizar estadísticas del cliente
    if (saleData.customerId) {
      await updateCustomerPurchaseStats(saleData.customerId);
    }

    // Actualizar finanzas
    await updateFinancesAfterSale(saleData.totalAmount, saleData.userEmail);

  } catch (error) {
    console.error('Error procesando transacción de venta:', error);
    throw new Error(`Error procesando venta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};


/**
 * Obtener todas las ventas con filtros
 */
export const getSales = async (filters?: SaleFilters): Promise<Sale[]> => {
  try {
    let q = collection(db, 'sales');
    let queryConstraints: any[] = [];

    // Aplicar filtros
    if (filters) {
      if (filters.customerId) {
        queryConstraints.push(where('customerId', '==', filters.customerId));
      }

      if (filters.status) {
        queryConstraints.push(where('status', '==', filters.status));
      }

      if (filters.startDate) {
        queryConstraints.push(where('saleDate', '>=', Timestamp.fromDate(filters.startDate)));
      }

      if (filters.endDate) {
        queryConstraints.push(where('saleDate', '<=', Timestamp.fromDate(filters.endDate)));
      }
    }

    queryConstraints.push(orderBy('createdAt', 'desc'));

    const finalQuery = query(q, ...queryConstraints);
    const querySnapshot = await getDocs(finalQuery);
    
    const sales: Sale[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        saleDate: data.saleDate.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Sale;
    });

    // Filtro adicional por término de búsqueda
    if (filters?.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      return sales.filter(sale => 
        sale.code.toLowerCase().includes(searchTerm) ||
        sale.comments?.toLowerCase().includes(searchTerm) ||
        sale.customerInfo.name.toLowerCase().includes(searchTerm)
      );
    }

    return sales;
  } catch (error) {
    console.error('Error obteniendo ventas:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de ventas
 */
export const getSaleStatistics = async (startDate?: Date, endDate?: Date): Promise<SaleStatistics> => {
  try {
    const filters: SaleFilters = {};
    
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const sales = await getSales(filters);

    // Calcular estadísticas básicas
    const totalSales = sales.length;
    const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalItems = sales.reduce((sum, sale) => sum + sale.totalQuantity, 0);
    const averageSaleAmount = totalSales > 0 ? totalAmount / totalSales : 0;

    // Top clientes
    const customerStats = new Map<string, CustomerStatistic>();
    sales.forEach(sale => {
      const existing = customerStats.get(sale.customerId) || {
        customerId: sale.customerId,
        customerName: sale.customerInfo.name,
        totalSales: 0,
        totalAmount: 0,
        percentage: 0
      };
      
      existing.totalSales += 1;
      existing.totalAmount += sale.totalAmount;
      customerStats.set(sale.customerId, existing);
    });

    const topCustomers = Array.from(customerStats.values())
      .map(stat => ({
        ...stat,
        percentage: totalAmount > 0 ? (stat.totalAmount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    // Tendencia mensual
    const monthlyStats = new Map<string, MonthlySaleStatistic>();
    sales.forEach(sale => {
      const monthKey = `${sale.saleDate.getFullYear()}-${String(sale.saleDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyStats.get(monthKey) || {
        month: monthKey,
        sales: 0,
        amount: 0,
        items: 0
      };
      
      existing.sales += 1;
      existing.amount += sale.totalAmount;
      existing.items += sale.totalQuantity;
      monthlyStats.set(monthKey, existing);
    });

    const monthlyTrend = Array.from(monthlyStats.values()).sort((a, b) => a.month.localeCompare(b.month));

    // Desglose por categoría
    const categoryStats = new Map<string, CategorySaleStatistic>();
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const category = item.category || 'Sin categoría';
        const existing = categoryStats.get(category) || {
          category,
          sales: 0,
          amount: 0,
          items: 0,
          percentage: 0
        };
        
        existing.sales += 1;
        existing.amount += item.totalPrice;
        existing.items += item.quantity;
        categoryStats.set(category, existing);
      });
    });

    const categoryBreakdown = Array.from(categoryStats.values())
      .map(stat => ({
        ...stat,
        percentage: totalAmount > 0 ? (stat.amount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Desglose por método de pago
    const paymentStats = new Map<PaymentMethod, PaymentMethodStatistic>();
    sales.forEach(sale => {
      const method = sale.paymentMethod || PaymentMethod.CASH;
      const existing = paymentStats.get(method) || {
        method,
        sales: 0,
        amount: 0,
        percentage: 0
      };
      
      existing.sales += 1;
      existing.amount += sale.totalAmount;
      paymentStats.set(method, existing);
    });

    const paymentMethodBreakdown = Array.from(paymentStats.values())
      .map(stat => ({
        ...stat,
        percentage: totalAmount > 0 ? (stat.amount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalSales,
      totalAmount,
      totalItems,
      averageSaleAmount,
      topCustomers,
      monthlyTrend,
      categoryBreakdown,
      paymentMethodBreakdown
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de ventas:', error);
    throw error;
  }
};

/**
 * Verificar stock crítico después de una venta
 */
export const checkCriticalStockAfterSale = async (items: SaleItem[]): Promise<CriticalStockProduct[]> => {
  const criticalProducts: CriticalStockProduct[] = [];
  
  try {
    for (const item of items) {
      const newStock = item.availableStock - item.quantity;
      if (newStock <= 5) {
        criticalProducts.push({
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          currentStock: item.availableStock,
          newStock,
          isCritical: newStock <= 5 && newStock > 0,
          isOut: newStock === 0,
          quantitySold: item.quantity
        });
      }
    }
    
    return criticalProducts;
  } catch (error) {
    console.error('Error verificando stock crítico:', error);
    return [];
  }
};