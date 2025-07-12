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
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  TransactionReport,
  ReportType,
  ReportStatus,
  TransactionFilters,
  TransactionData,
  ReportSummary,
  ReportStatistics,
  ReportGenerationRequest,
  ReportSearchFilters,
  ReportSearchResult,
  ReportFilterValidation,
  ReportGenerationStatus,
  FinancialSummary,
  ReportTrends,
  CustomerStat,
  SupplierStat,
  ProductStat,
  CategoryStat,
  UserStat,
  ReportKPIs
} from '../interfaces/Report';
import { Sale } from '../interfaces/Sale';
import { Purchase } from '../interfaces/Purchase';

/**
 * ✅ Función helper para conversión segura de fechas
 */
export const safeToDate = (dateValue: any): Date => {
  try {
    // Si es null o undefined
    if (!dateValue) {
      console.warn('⚠️ Valor de fecha null/undefined, usando fecha actual');
      return new Date();
    }
    
    // Si ya es un Date válido
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? new Date() : dateValue;
    }
    
    // Si es un Timestamp de Firestore
    if (typeof dateValue === 'object' && dateValue.toDate && typeof dateValue.toDate === 'function') {
      try {
        const converted = dateValue.toDate();
        return isNaN(converted.getTime()) ? new Date() : converted;
      } catch (timestampError) {
        console.warn('⚠️ Error convirtiendo Timestamp:', timestampError);
        return new Date();
      }
    }
    
    // Si es string o número
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      const converted = new Date(dateValue);
      return isNaN(converted.getTime()) ? new Date() : converted;
    }
    
    // Si es objeto con propiedades de fecha
    if (typeof dateValue === 'object') {
      if (dateValue.seconds && typeof dateValue.seconds === 'number') {
        // Timestamp manual de Firestore
        const converted = new Date(dateValue.seconds * 1000);
        return isNaN(converted.getTime()) ? new Date() : converted;
      }
    }
    
    console.warn('⚠️ Tipo de fecha no reconocido:', typeof dateValue, dateValue);
    return new Date();
    
  } catch (error) {
    console.error('❌ Error en safeToDate:', error);
    return new Date();
  }
};

/**
 * Generar código único para reporte
 */
export const generateReportCode = (type: ReportType): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6);
  
  const typePrefix = type.toUpperCase().replace('_', '-');
  return `REPORT-${typePrefix}-${year}${month}${day}-${timestamp}`;
};

/**
 * Validar filtros de reporte
 */
export const validateReportFilters = (filters: TransactionFilters): ReportFilterValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar fechas
  if (!filters.startDate || !filters.endDate) {
    errors.push('Las fechas de inicio y fin son obligatorias');
  } else {
    if (filters.startDate >= filters.endDate) {
      errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    const daysDifference = Math.abs(filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 3600 * 24);
    
    if (daysDifference > 365) {
      warnings.push('El período es muy amplio (más de 1 año), el reporte puede tardar mucho en generarse');
    }

    if (daysDifference < 1) {
      warnings.push('El período es muy corto (menos de 1 día)');
    }

    const now = new Date();
    if (filters.endDate > now) {
      warnings.push('La fecha de fin es futura');
    }
  }

  // Validar tipos de transacción
  if (!filters.includeTypes || filters.includeTypes.length === 0) {
    errors.push('Debe incluir al menos un tipo de transacción');
  }

  // Validar montos
  if (filters.minAmount !== undefined && filters.maxAmount !== undefined) {
    if (filters.minAmount > filters.maxAmount) {
      errors.push('El monto mínimo no puede ser mayor al monto máximo');
    }
  }

  if (filters.minAmount !== undefined && filters.minAmount < 0) {
    errors.push('El monto mínimo no puede ser negativo');
  }

  // Estimar cantidad de registros (aproximado)
  let estimatedRecords = 0;
  if (filters.startDate && filters.endDate) {
    const daysDiff = Math.ceil((filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 3600 * 24));
    estimatedRecords = daysDiff * 10; // Estimación aproximada de 10 transacciones por día
  }

  // Estimar tiempo de procesamiento (aproximado)
  let estimatedProcessingTime = Math.max(estimatedRecords / 100, 5); // Mínimo 5 segundos

  if (estimatedRecords > 10000) {
    warnings.push('El reporte contiene muchos registros y puede tardar varios minutos en generarse');
    estimatedProcessingTime = estimatedRecords / 50;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    appliedFilters: filters,
    estimatedRecords,
    estimatedProcessingTime
  };
};

/**
 * ✅ Obtener datos de transacciones basado en filtros (CORREGIDO)
 */
export const getTransactionData = async (filters: TransactionFilters): Promise<TransactionData[]> => {
  try {
    console.log('📊 Obteniendo datos de transacciones...');
    console.log('🔍 Filtros recibidos:', filters);
    
    const transactions: TransactionData[] = [];

    // ✅ MÉTODO ALTERNATIVO: Obtener TODOS los documentos y filtrar en memoria
    // Esto evita problemas con queries complejos de Firestore
    
    // Obtener ventas si están incluidas
    if (filters.includeTypes.includes('sale')) {
      console.log('📈 Cargando TODAS las ventas...');
      
      try {
        // Query simple sin filtros de fecha para evitar errores
        const salesQuery = query(
          collection(db, 'sales'),
          orderBy('saleDate', 'desc')
        );

        const salesSnapshot = await getDocs(salesQuery);
        console.log(`📈 Encontradas ${salesSnapshot.docs.length} ventas totales`);
        
        salesSnapshot.docs.forEach(doc => {
          try {
            const saleData = doc.data() as Sale;
            saleData.id = doc.id;
            
            // ✅ CONVERSIÓN SEGURA DE FECHAS
            let safeSaleDate: Date;
            let safeCreatedAt: Date;
            
            try {
              safeSaleDate = safeToDate(saleData.saleDate);
              safeCreatedAt = safeToDate(saleData.createdAt);
            } catch (dateError) {
              console.warn('⚠️ Error convirtiendo fechas, usando fechas por defecto');
              safeSaleDate = new Date();
              safeCreatedAt = new Date();
            }
            
            // ✅ FILTRAR POR FECHA EN MEMORIA (más seguro)
            if (safeSaleDate >= filters.startDate && safeSaleDate <= filters.endDate) {
              
              const transactionData: TransactionData = {
                id: saleData.id,
                code: saleData.code || `SALE-${doc.id}`,
                type: 'sale',
                transactionDate: safeSaleDate,
                createdAt: safeCreatedAt,
                counterparty: {
                  id: saleData.customerId || '',
                  rut: saleData.customerInfo?.rut || '',
                  name: saleData.customerInfo?.name || 'Cliente sin nombre',
                  contact: saleData.customerInfo?.contact || '',
                  email: saleData.customerInfo?.email || '',
                  phone: saleData.customerInfo?.phone || '',
                  address: saleData.customerInfo?.address || '',
                  type: 'customer'
                },
                user: {
                  id: saleData.userId || '',
                  email: saleData.userEmail || '',
                  name: saleData.userEmail?.split('@')[0] || 'Usuario',
                  role: 'admin'
                },
                items: (saleData.items || []).map(item => ({
                  productId: item.productId || '',
                  productCode: item.productCode || '',
                  productName: item.productName || 'Producto sin nombre',
                  category: item.category || 'Sin categoría',
                  quantity: item.quantity || 0,
                  unitPrice: item.unitPrice || 0,
                  totalPrice: item.totalPrice || 0
                })),
                subtotal: saleData.totalAmount || 0,
                taxes: 0,
                discount: 0,
                totalAmount: saleData.totalAmount || 0,
                totalQuantity: saleData.totalQuantity || 0,
                paymentMethod: saleData.paymentMethod || '',
                comments: saleData.comments || '',
                status: saleData.status || 'completed'
              };

              transactions.push(transactionData);
            }
            
          } catch (itemError) {
            console.warn('⚠️ Error procesando venta individual:', itemError, doc.id);
          }
        });
        
      } catch (salesError) {
        console.error('❌ Error cargando ventas:', salesError);
      }
    }

    // Obtener compras si están incluidas
    if (filters.includeTypes.includes('purchase')) {
      console.log('📉 Cargando TODAS las compras...');
      
      try {
        // Query simple sin filtros de fecha para evitar errores
        const purchasesQuery = query(
          collection(db, 'purchases'),
          orderBy('purchaseDate', 'desc')
        );

        const purchasesSnapshot = await getDocs(purchasesQuery);
        console.log(`📉 Encontradas ${purchasesSnapshot.docs.length} compras totales`);
        
        purchasesSnapshot.docs.forEach(doc => {
          try {
            const purchaseData = doc.data() as Purchase;
            purchaseData.id = doc.id;
            
            // ✅ CONVERSIÓN SEGURA DE FECHAS
            let safePurchaseDate: Date;
            let safeCreatedAt: Date;
            
            try {
              safePurchaseDate = safeToDate(purchaseData.purchaseDate);
              safeCreatedAt = safeToDate(purchaseData.createdAt);
            } catch (dateError) {
              console.warn('⚠️ Error convirtiendo fechas, usando fechas por defecto');
              safePurchaseDate = new Date();
              safeCreatedAt = new Date();
            }
            
            // ✅ FILTRAR POR FECHA EN MEMORIA (más seguro)
            if (safePurchaseDate >= filters.startDate && safePurchaseDate <= filters.endDate) {
              
              const transactionData: TransactionData = {
                id: purchaseData.id,
                code: purchaseData.code || `PURCHASE-${doc.id}`,
                type: 'purchase',
                transactionDate: safePurchaseDate,
                createdAt: safeCreatedAt,
                counterparty: {
                  id: purchaseData.supplierId || '',
                  rut: purchaseData.supplierInfo?.rut || '',
                  name: purchaseData.supplierInfo?.name || 'Proveedor sin nombre',
                  contact: purchaseData.supplierInfo?.contact || '',
                  email: purchaseData.supplierInfo?.email || '',
                  phone: purchaseData.supplierInfo?.phone || '',
                  address: purchaseData.supplierInfo?.address || '',
                  type: 'supplier'
                },
                user: {
                  id: purchaseData.userId || '',
                  email: purchaseData.userEmail || '',
                  name: purchaseData.userEmail?.split('@')[0] || 'Usuario',
                  role: 'admin'
                },
                items: (purchaseData.items || []).map(item => ({
                  productId: item.productId || '',
                  productCode: item.productCode || '',
                  productName: item.productName || 'Producto sin nombre',
                  category: item.category || 'Sin categoría',
                  quantity: item.quantity || 0,
                  unitPrice: item.unitPrice || 0,
                  totalPrice: item.totalPrice || 0
                })),
                subtotal: purchaseData.totalAmount || 0,
                taxes: 0,
                discount: 0,
                totalAmount: purchaseData.totalAmount || 0,
                totalQuantity: purchaseData.totalQuantity || 0,
                comments: purchaseData.comments || '',
                status: purchaseData.status || 'completed'
              };

              transactions.push(transactionData);
            }
            
          } catch (itemError) {
            console.warn('⚠️ Error procesando compra individual:', itemError, doc.id);
          }
        });
        
      } catch (purchasesError) {
        console.error('❌ Error cargando compras:', purchasesError);
      }
    }

    console.log(`📊 Total de transacciones después de filtro de fecha: ${transactions.length}`);

    // Aplicar filtros adicionales
    let filteredTransactions = transactions;

    // Filtro por término de búsqueda
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filteredTransactions = filteredTransactions.filter(transaction =>
        transaction.code.toLowerCase().includes(searchTerm) ||
        transaction.counterparty.name.toLowerCase().includes(searchTerm) ||
        transaction.counterparty.rut.toLowerCase().includes(searchTerm) ||
        transaction.comments?.toLowerCase().includes(searchTerm) ||
        transaction.items.some(item => 
          item.productName.toLowerCase().includes(searchTerm) ||
          item.productCode.toLowerCase().includes(searchTerm)
        )
      );
    }

    // Filtros de monto
    if (filters.minAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter(t => t.totalAmount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter(t => t.totalAmount <= filters.maxAmount!);
    }

    // ✅ ORDENAMIENTO SIMPLE Y SEGURO
    try {
      filteredTransactions.sort((a, b) => {
        // Usar getTime() directamente ya que sabemos que son Date válidos
        return b.transactionDate.getTime() - a.transactionDate.getTime();
      });
    } catch (sortError) {
      console.warn('⚠️ Error en ordenamiento, manteniendo orden original');
    }

    console.log(`✅ ${filteredTransactions.length} transacciones finales procesadas`);
    return filteredTransactions;

  } catch (error) {
    console.error('❌ Error obteniendo datos de transacciones:', error);
    throw error;
  }
};

/**
 * Calcular resumen del reporte
 */
export const calculateReportSummary = (transactions: TransactionData[]): ReportSummary => {
  const totalTransactions = transactions.length;
  const totalItems = transactions.reduce((sum, t) => sum + t.items.length, 0);
  const totalQuantity = transactions.reduce((sum, t) => sum + t.totalQuantity, 0);
  const totalAmount = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
  
  // Calcular costos y ganancias (estimado)
  const totalCost = transactions.reduce((sum, t) => {
    if (t.type === 'purchase') return sum + t.totalAmount;
    return sum + (t.totalAmount * 0.7); // Estimación del 70% como costo para ventas
  }, 0);
  
  const totalProfit = transactions.reduce((sum, t) => {
    if (t.type === 'sale') return sum + (t.totalAmount * 0.3); // Estimación del 30% de ganancia
    return sum;
  }, 0);

  const averageTransactionAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
  const averageMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

  // Separar por tipo
  const sales = transactions.filter(t => t.type === 'sale');
  const purchases = transactions.filter(t => t.type === 'purchase');

  const salesSummary: FinancialSummary = {
    count: sales.length,
    totalAmount: sales.reduce((sum, s) => sum + s.totalAmount, 0),
    totalQuantity: sales.reduce((sum, s) => sum + s.totalQuantity, 0),
    averageAmount: sales.length > 0 ? sales.reduce((sum, s) => sum + s.totalAmount, 0) / sales.length : 0,
    topTransaction: sales.length > 0 ? sales.reduce((max, s) => s.totalAmount > max.totalAmount ? s : max) : null
  };

  const purchasesSummary: FinancialSummary = {
    count: purchases.length,
    totalAmount: purchases.reduce((sum, p) => sum + p.totalAmount, 0),
    totalQuantity: purchases.reduce((sum, p) => sum + p.totalQuantity, 0),
    averageAmount: purchases.length > 0 ? purchases.reduce((sum, p) => sum + p.totalAmount, 0) / purchases.length : 0,
    topTransaction: purchases.length > 0 ? purchases.reduce((max, p) => p.totalAmount > max.totalAmount ? p : max) : null
  };

  // Calcular tendencias
  const trends = calculateReportTrends(transactions);

  return {
    totalTransactions,
    totalItems,
    totalQuantity,
    totalAmount,
    totalCost,
    totalProfit,
    averageTransactionAmount,
    averageMargin,
    salesSummary,
    purchasesSummary,
    trends
  };
};

/**
 * Calcular tendencias del reporte
 */
export const calculateReportTrends = (transactions: TransactionData[]): ReportTrends => {
  if (transactions.length === 0) {
    return {
      dailyAverage: 0,
      weeklyAverage: 0,
      monthlyAverage: 0,
      growthRate: 0,
      seasonalityFactor: 1,
      topDay: null,
      topWeek: null
    };
  }

  // Agrupar por días
  const dailyData = new Map<string, { transactions: number; amount: number; quantity: number }>();
  
  transactions.forEach(transaction => {
    const dateKey = safeToDate(transaction.transactionDate).toISOString().split('T')[0];
    const existing = dailyData.get(dateKey) || { transactions: 0, amount: 0, quantity: 0 };
    existing.transactions += 1;
    existing.amount += transaction.totalAmount;
    existing.quantity += transaction.totalQuantity;
    dailyData.set(dateKey, existing);
  });

  const dailyEntries = Array.from(dailyData.entries()).map(([date, data]) => ({
    date,
    ...data
  }));

  // Calcular promedios
  const totalDays = dailyEntries.length;
  const dailyAverage = totalDays > 0 ? transactions.reduce((sum, t) => sum + t.totalAmount, 0) / totalDays : 0;
  const weeklyAverage = dailyAverage * 7;
  const monthlyAverage = dailyAverage * 30;

  // Encontrar el día con más actividad
  const topDay = dailyEntries.length > 0 ? 
    dailyEntries.reduce((max, day) => day.amount > max.amount ? day : max) : null;

  // Calcular tasa de crecimiento (simplificado)
  let growthRate = 0;
  if (dailyEntries.length >= 2) {
    const firstHalf = dailyEntries.slice(0, Math.floor(dailyEntries.length / 2));
    const secondHalf = dailyEntries.slice(Math.floor(dailyEntries.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.amount, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.amount, 0) / secondHalf.length;
    
    if (firstHalfAvg > 0) {
      growthRate = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    }
  }

  return {
    dailyAverage,
    weeklyAverage,
    monthlyAverage,
    growthRate,
    seasonalityFactor: 1, // Placeholder
    topDay,
    topWeek: null // Placeholder
  };
};

/**
 * Generar estadísticas detalladas del reporte
 */
export const generateReportStatistics = (transactions: TransactionData[]): ReportStatistics => {
  // Top clientes
  const customerStats = new Map<string, CustomerStat>();
  const supplierStats = new Map<string, SupplierStat>();
  const productStats = new Map<string, ProductStat>();
  const categoryStats = new Map<string, CategoryStat>();
  const userStats = new Map<string, UserStat>();

  transactions.forEach(transaction => {
    // Estadísticas de clientes (solo para ventas)
    if (transaction.type === 'sale') {
      const customerId = transaction.counterparty.id;
      const existing = customerStats.get(customerId) || {
        customerId,
        customerName: transaction.counterparty.name,
        customerRut: transaction.counterparty.rut,
        transactionCount: 0,
        totalAmount: 0,
        totalQuantity: 0,
        averageOrderValue: 0,
        lastTransactionDate: safeToDate(transaction.transactionDate),
        percentage: 0
      };
      
      existing.transactionCount += 1;
      existing.totalAmount += transaction.totalAmount;
      existing.totalQuantity += transaction.totalQuantity;
      const currentDate = safeToDate(transaction.transactionDate);
      existing.lastTransactionDate = currentDate > existing.lastTransactionDate ? 
        currentDate : existing.lastTransactionDate;
      existing.averageOrderValue = existing.totalAmount / existing.transactionCount;
      
      customerStats.set(customerId, existing);
    }

    // Estadísticas de proveedores (solo para compras)
    if (transaction.type === 'purchase') {
      const supplierId = transaction.counterparty.id;
      const existing = supplierStats.get(supplierId) || {
        supplierId,
        supplierName: transaction.counterparty.name,
        supplierRut: transaction.counterparty.rut,
        transactionCount: 0,
        totalAmount: 0,
        totalQuantity: 0,
        averageOrderValue: 0,
        lastTransactionDate: safeToDate(transaction.transactionDate),
        percentage: 0
      };
      
      existing.transactionCount += 1;
      existing.totalAmount += transaction.totalAmount;
      existing.totalQuantity += transaction.totalQuantity;
      const currentDate = safeToDate(transaction.transactionDate);
      existing.lastTransactionDate = currentDate > existing.lastTransactionDate ? 
        currentDate : existing.lastTransactionDate;
      existing.averageOrderValue = existing.totalAmount / existing.transactionCount;
      
      supplierStats.set(supplierId, existing);
    }

    // Estadísticas de usuarios
    const userId = transaction.user.id;
    const userExisting = userStats.get(userId) || {
      userId,
      userName: transaction.user.name,
      userEmail: transaction.user.email,
      transactionCount: 0,
      totalAmount: 0,
      averageTransactionAmount: 0,
      lastActivity: safeToDate(transaction.transactionDate),
      percentage: 0
    };
    
    userExisting.transactionCount += 1;
    userExisting.totalAmount += transaction.totalAmount;
    const currentDate = safeToDate(transaction.transactionDate);
    userExisting.lastActivity = currentDate > userExisting.lastActivity ? 
      currentDate : userExisting.lastActivity;
    userExisting.averageTransactionAmount = userExisting.totalAmount / userExisting.transactionCount;
    
    userStats.set(userId, userExisting);

    // Estadísticas de productos
    transaction.items.forEach(item => {
      const productId = item.productId;
      const existing = productStats.get(productId) || {
        productId,
        productCode: item.productCode,
        productName: item.productName,
        category: item.category,
        salesCount: 0,
        purchasesCount: 0,
        totalSalesAmount: 0,
        totalPurchasesAmount: 0,
        totalQuantitySold: 0,
        totalQuantityPurchased: 0,
        averageSellingPrice: 0,
        averageCost: 0,
        averageMargin: 0,
        currentStock: 0 // Se debería obtener desde inventario
      };

      if (transaction.type === 'sale') {
        existing.salesCount += 1;
        existing.totalSalesAmount += item.totalPrice;
        existing.totalQuantitySold += item.quantity;
        existing.averageSellingPrice = existing.totalSalesAmount / existing.totalQuantitySold;
      } else {
        existing.purchasesCount += 1;
        existing.totalPurchasesAmount += item.totalPrice;
        existing.totalQuantityPurchased += item.quantity;
        existing.averageCost = existing.totalPurchasesAmount / existing.totalQuantityPurchased;
      }

      productStats.set(productId, existing);

      // Estadísticas de categorías
      const category = item.category;
      const categoryExisting = categoryStats.get(category) || {
        category,
        transactionCount: 0,
        totalAmount: 0,
        totalQuantity: 0,
        productsCount: 0,
        averageAmount: 0,
        percentage: 0
      };
      
      categoryExisting.transactionCount += 1;
      categoryExisting.totalAmount += item.totalPrice;
      categoryExisting.totalQuantity += item.quantity;
      categoryExisting.averageAmount = categoryExisting.totalAmount / categoryExisting.transactionCount;
      
      categoryStats.set(category, categoryExisting);
    });
  });

  // Calcular porcentajes
  const totalTransactionAmount = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
  
  customerStats.forEach(stat => {
    stat.percentage = totalTransactionAmount > 0 ? (stat.totalAmount / totalTransactionAmount) * 100 : 0;
  });
  
  supplierStats.forEach(stat => {
    stat.percentage = totalTransactionAmount > 0 ? (stat.totalAmount / totalTransactionAmount) * 100 : 0;
  });
  
  userStats.forEach(stat => {
    stat.percentage = totalTransactionAmount > 0 ? (stat.totalAmount / totalTransactionAmount) * 100 : 0;
  });
  
  categoryStats.forEach(stat => {
    stat.percentage = totalTransactionAmount > 0 ? (stat.totalAmount / totalTransactionAmount) * 100 : 0;
  });

  // Convertir a arrays ordenados
  const topCustomers = Array.from(customerStats.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

  const topSuppliers = Array.from(supplierStats.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

  const topProducts = Array.from(productStats.values())
    .sort((a, b) => (b.totalSalesAmount + b.totalPurchasesAmount) - (a.totalSalesAmount + a.totalPurchasesAmount))
    .slice(0, 20);

  const topCategories = Array.from(categoryStats.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

  const topUsers = Array.from(userStats.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

  // KPIs básicos (placeholder)
  const kpis: ReportKPIs = {
    totalRevenue: transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.totalAmount, 0),
    averageOrderValue: totalTransactionAmount / Math.max(transactions.length, 1),
    transactionsPerDay: 0, // Se calcularía con más datos
    customerAcquisitionRate: 0,
    customerRetentionRate: 0,
    inventoryTurnover: 0,
    stockoutRate: 0,
    averageInventoryValue: 0,
    grossMargin: 0,
    netMargin: 0,
    returnOnInvestment: 0,
    averageProcessingTime: 0,
    userProductivity: 0
  };

  return {
    topCustomers,
    topSuppliers,
    topProducts,
    topCategories,
    topUsers,
    hourlyDistribution: [], // Placeholder
    weeklyDistribution: [], // Placeholder
    monthlyComparison: [], // Placeholder
    profitabilityAnalysis: {
      totalRevenue: kpis.totalRevenue,
      totalCost: 0,
      grossProfit: 0,
      grossMargin: 0,
      netProfit: 0,
      netMargin: 0,
      breakdownByProduct: [],
      breakdownByCategory: []
    },
    paymentMethodAnalysis: [], // Placeholder
    kpis
  };
};

/**
 * ✅ Crear un nuevo reporte (OPTIMIZADO - no guarda transactionData)
 */
export const createReport = async (
  request: ReportGenerationRequest,
  userId: string,
  userEmail: string
): Promise<string> => {
  try {
    console.log('📊 Iniciando generación de reporte...');

    // Validar filtros
    const validation = validateReportFilters(request.filters);
    if (!validation.isValid) {
      throw new Error(`Filtros inválidos: ${validation.errors.join(', ')}`);
    }

    // Generar código único
    const code = generateReportCode(request.type);

    // Obtener datos de transacciones
    const transactionData = await getTransactionData(request.filters);

    // Calcular resumen
    const summary = calculateReportSummary(transactionData);

    // Generar estadísticas
    const statistics = generateReportStatistics(transactionData);

    // ✅ GUARDAR DATOS LIMITADOS CON ESTRUCTURA COMPLETA
    const limitedTransactionData: TransactionData[] = transactionData.slice(0, 50).map(transaction => ({
      id: transaction.id,
      code: transaction.code,
      type: transaction.type,
      transactionDate: transaction.transactionDate,
      createdAt: transaction.createdAt, // ✅ Requerido
      counterparty: {
        id: transaction.counterparty.id,
        rut: transaction.counterparty.rut,
        name: transaction.counterparty.name,
        contact: transaction.counterparty.contact || '',
        email: transaction.counterparty.email || '',
        phone: transaction.counterparty.phone || '',
        address: transaction.counterparty.address || '',
        type: transaction.counterparty.type
      },
      user: {
        id: transaction.user.id,
        email: transaction.user.email,
        name: transaction.user.name,
        role: transaction.user.role
      },
      items: transaction.items.map(item => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        category: item.category,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })),
      subtotal: transaction.subtotal, // ✅ Requerido
      taxes: transaction.taxes, // ✅ Requerido
      discount: transaction.discount, // ✅ Requerido
      totalAmount: transaction.totalAmount,
      totalQuantity: transaction.totalQuantity,
      paymentMethod: transaction.paymentMethod,
      comments: transaction.comments,
      status: transaction.status
    }));

    const reportData: Omit<TransactionReport, 'id'> = {
      code,
      type: request.type,
      title: request.title,
      description: request.description,
      periodStart: request.filters.startDate,
      periodEnd: request.filters.endDate,
      transactionData: limitedTransactionData, // ✅ Ahora tiene estructura completa
      summary,
      generatedBy: userId,
      generatedByName: userEmail.split('@')[0],
      generatedAt: new Date(),
      status: ReportStatus.COMPLETED,
      filters: request.filters,
      files: [],
      statistics,
      exportConfig: request.exportConfig,
      updatedAt: new Date()
    };

    // Guardar en Firestore
    const docRef = await addDoc(collection(db, 'reports'), {
      ...reportData,
      periodStart: Timestamp.fromDate(reportData.periodStart),
      periodEnd: Timestamp.fromDate(reportData.periodEnd),
      generatedAt: Timestamp.fromDate(reportData.generatedAt),
      updatedAt: Timestamp.fromDate(reportData.updatedAt),
      // ✅ Convertir fechas en los datos limitados
      transactionData: limitedTransactionData.map(transaction => ({
        ...transaction,
        transactionDate: Timestamp.fromDate(transaction.transactionDate),
        createdAt: Timestamp.fromDate(transaction.createdAt)
      }))
    });

    console.log('✅ Reporte creado exitosamente:', docRef.id);
    return docRef.id;

  } catch (error) {
    console.error('❌ Error creando reporte:', error);
    throw error;
  }
};


/**
 * Obtener reporte por ID
 */
export const getReportById = async (id: string): Promise<TransactionReport | null> => {
  try {
    const docRef = doc(db, 'reports', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Crear objeto completo con todas las propiedades requeridas
      const report: TransactionReport = {
        id: docSnap.id,
        code: data.code || '',
        type: data.type || ReportType.SALES,
        title: data.title || '',
        description: data.description,
        periodStart: safeToDate(data.periodStart),
        periodEnd: safeToDate(data.periodEnd),
        transactionData: [], // Los datos se cargarán dinámicamente cuando sea necesario
        summary: data.summary || {
          totalTransactions: 0,
          totalItems: 0,
          totalQuantity: 0,
          totalAmount: 0,
          totalCost: 0,
          totalProfit: 0,
          averageTransactionAmount: 0,
          averageMargin: 0,
          trends: {
            dailyAverage: 0,
            weeklyAverage: 0,
            monthlyAverage: 0,
            growthRate: 0,
            seasonalityFactor: 1,
            topDay: null,
            topWeek: null
          }
        },
        generatedBy: data.generatedBy || '',
        generatedByName: data.generatedByName || '',
        generatedAt: safeToDate(data.generatedAt),
        status: data.status || ReportStatus.COMPLETED,
        filters: data.filters || {
          includeTypes: [],
          startDate: new Date(),
          endDate: new Date()
        },
        files: data.files || [],
        statistics: data.statistics,
        exportConfig: data.exportConfig,
        updatedAt: safeToDate(data.updatedAt)
      };
      
      return report;
    }
    
    return null;
  } catch (error) {
    console.error('Error obteniendo reporte:', error);
    throw error;
  }
};

/**
 * Buscar reportes con filtros
 */
export const searchReports = async (filters: ReportSearchFilters): Promise<ReportSearchResult> => {
  try {
    let q = collection(db, 'reports');
    let queryConstraints: any[] = [];

    // Aplicar filtros
    if (filters.types && filters.types.length > 0) {
      queryConstraints.push(where('type', 'in', filters.types));
    }

    if (filters.statuses && filters.statuses.length > 0) {
      queryConstraints.push(where('status', 'in', filters.statuses));
    }

    if (filters.generatedBy && filters.generatedBy.length > 0) {
      queryConstraints.push(where('generatedBy', 'in', filters.generatedBy));
    }

    if (filters.startDate) {
      queryConstraints.push(where('generatedAt', '>=', Timestamp.fromDate(filters.startDate)));
    }

    if (filters.endDate) {
      queryConstraints.push(where('generatedAt', '<=', Timestamp.fromDate(filters.endDate)));
    }

    // Ordenamiento
    const sortField = filters.sortBy || 'generatedAt';
    const sortDirection = filters.sortOrder || 'desc';
    queryConstraints.push(orderBy(sortField, sortDirection));

    // Paginación
    const pageSize = filters.pageSize || 20;
    queryConstraints.push(limit(pageSize));

    const finalQuery = query(q, ...queryConstraints);
    const querySnapshot = await getDocs(finalQuery);
    
    const reports: TransactionReport[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        code: data.code || '',
        type: data.type || ReportType.SALES,
        title: data.title || '',
        description: data.description,
        periodStart: safeToDate(data.periodStart),
        periodEnd: safeToDate(data.periodEnd),
        transactionData: [], // Simplificar para la lista
        summary: data.summary || {
          totalTransactions: 0,
          totalItems: 0,
          totalQuantity: 0,
          totalAmount: 0,
          totalCost: 0,
          totalProfit: 0,
          averageTransactionAmount: 0,
          averageMargin: 0,
          trends: {
            dailyAverage: 0,
            weeklyAverage: 0,
            monthlyAverage: 0,
            growthRate: 0,
            seasonalityFactor: 1,
            topDay: null,
            topWeek: null
          }
        },
        generatedBy: data.generatedBy || '',
        generatedByName: data.generatedByName || '',
        generatedAt: safeToDate(data.generatedAt),
        status: data.status || ReportStatus.COMPLETED,
        filters: data.filters || { includeTypes: [], startDate: new Date(), endDate: new Date() },
        files: data.files || [],
        statistics: data.statistics,
        exportConfig: data.exportConfig,
        updatedAt: safeToDate(data.updatedAt)
      } as TransactionReport;
    });

    // Filtro adicional por término de búsqueda
    let filteredReports = reports;
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filteredReports = reports.filter(report => 
        report.title.toLowerCase().includes(searchTerm) ||
        report.description?.toLowerCase().includes(searchTerm) ||
        report.code.toLowerCase().includes(searchTerm)
      );
    }

    // Calcular paginación
    const totalCount = filteredReports.length;
    const currentPage = filters.page || 1;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNext = currentPage < totalPages;
    const hasPrevious = currentPage > 1;

    return {
      reports: filteredReports,
      totalCount,
      totalPages,
      currentPage,
      pageSize,
      hasNext,
      hasPrevious
    };

  } catch (error) {
    console.error('Error buscando reportes:', error);
    throw error;
  }
};

/**
 * Actualizar estado del reporte
 */
export const updateReportStatus = async (
  reportId: string, 
  status: ReportStatus, 
  error?: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'reports', reportId);
    const updateData: any = {
      status,
      updatedAt: Timestamp.now()
    };

    if (error) {
      updateData.error = error;
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error actualizando estado del reporte:', error);
    throw error;
  }
};

/**
 * Eliminar reporte
 */
export const deleteReport = async (reportId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'reports', reportId);
    await deleteDoc(docRef);
    console.log('Reporte eliminado exitosamente');
  } catch (error) {
    console.error('Error eliminando reporte:', error);
    throw error;
  }
};

/**
 * ✅ Obtener reportes recientes (OPTIMIZADO)
 */
export const getRecentReports = async (limitCount: number = 10): Promise<TransactionReport[]> => {
  try {
    const q = query(
      collection(db, 'reports'),
      orderBy('generatedAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // ✅ Convertir datos de transacciones si existen (estructura completa)
      let processedTransactionData: TransactionData[] = [];
      
      if (data.transactionData && Array.isArray(data.transactionData)) {
        processedTransactionData = data.transactionData.map((transaction: any) => ({
          id: transaction.id || '',
          code: transaction.code || '',
          type: transaction.type || 'sale',
          transactionDate: safeToDate(transaction.transactionDate),
          createdAt: safeToDate(transaction.createdAt || transaction.transactionDate),
          counterparty: {
            id: transaction.counterparty?.id || '',
            rut: transaction.counterparty?.rut || '',
            name: transaction.counterparty?.name || 'Sin nombre',
            contact: transaction.counterparty?.contact || '',
            email: transaction.counterparty?.email || '',
            phone: transaction.counterparty?.phone || '',
            address: transaction.counterparty?.address || '',
            type: transaction.counterparty?.type || (transaction.type === 'sale' ? 'customer' : 'supplier')
          },
          user: {
            id: transaction.user?.id || '',
            email: transaction.user?.email || '',
            name: transaction.user?.name || 'Usuario',
            role: transaction.user?.role || 'admin'
          },
          items: (transaction.items || []).map((item: any) => ({
            productId: item.productId || '',
            productCode: item.productCode || '',
            productName: item.productName || '',
            category: item.category || 'Sin categoría',
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0
          })),
          subtotal: transaction.subtotal || 0,
          taxes: transaction.taxes || 0,
          discount: transaction.discount || 0,
          totalAmount: transaction.totalAmount || 0,
          totalQuantity: transaction.totalQuantity || 0,
          paymentMethod: transaction.paymentMethod || '',
          comments: transaction.comments || '',
          status: transaction.status || 'completed'
        }));
      }
      
      return {
        id: doc.id,
        code: data.code || '',
        type: data.type || ReportType.SALES,
        title: data.title || '',
        description: data.description,
        periodStart: safeToDate(data.periodStart),
        periodEnd: safeToDate(data.periodEnd),
        transactionData: processedTransactionData, // ✅ Datos guardados completos
        summary: data.summary || {
          totalTransactions: 0,
          totalItems: 0,
          totalQuantity: 0,
          totalAmount: 0,
          totalCost: 0,
          totalProfit: 0,
          averageTransactionAmount: 0,
          averageMargin: 0,
          trends: {
            dailyAverage: 0,
            weeklyAverage: 0,
            monthlyAverage: 0,
            growthRate: 0,
            seasonalityFactor: 1,
            topDay: null,
            topWeek: null
          }
        },
        generatedBy: data.generatedBy || '',
        generatedByName: data.generatedByName || '',
        generatedAt: safeToDate(data.generatedAt),
        status: data.status || ReportStatus.COMPLETED,
        filters: data.filters || { 
          includeTypes: [], 
          startDate: new Date(), 
          endDate: new Date() 
        },
        files: data.files || [],
        statistics: data.statistics,
        exportConfig: data.exportConfig,
        updatedAt: safeToDate(data.updatedAt)
      } as TransactionReport;
    });
  } catch (error) {
    console.error('Error obteniendo reportes recientes:', error);
    throw error;
  }
};