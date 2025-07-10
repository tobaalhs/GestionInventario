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
 * Obtener datos de transacciones basado en filtros
 */
export const getTransactionData = async (filters: TransactionFilters): Promise<TransactionData[]> => {
  try {
    console.log('📊 Obteniendo datos de transacciones...');
    const transactions: TransactionData[] = [];

    // Obtener ventas si están incluidas
    if (filters.includeTypes.includes('sale')) {
      console.log('📈 Cargando datos de ventas...');
      const salesQuery = query(
        collection(db, 'sales'),
        where('saleDate', '>=', Timestamp.fromDate(filters.startDate)),
        where('saleDate', '<=', Timestamp.fromDate(filters.endDate)),
        orderBy('saleDate', 'desc')
      );

      const salesSnapshot = await getDocs(salesQuery);
      
      salesSnapshot.docs.forEach(doc => {
        const saleData = doc.data() as Sale;
        saleData.id = doc.id;
        saleData.saleDate = saleData.saleDate || new Date();
        saleData.createdAt = saleData.createdAt || new Date();
        
        // Convertir venta a TransactionData
        const transactionData: TransactionData = {
          id: saleData.id,
          code: saleData.code,
          type: 'sale',
          transactionDate: saleData.saleDate,
          createdAt: saleData.createdAt,
          counterparty: {
            id: saleData.customerId,
            rut: saleData.customerInfo.rut,
            name: saleData.customerInfo.name,
            contact: saleData.customerInfo.contact,
            email: saleData.customerInfo.email,
            phone: saleData.customerInfo.phone,
            address: saleData.customerInfo.address,
            type: 'customer'
          },
          user: {
            id: saleData.userId,
            email: saleData.userEmail,
            name: saleData.userEmail.split('@')[0],
            role: 'admin'
          },
          items: saleData.items.map(item => ({
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            category: item.category || 'Sin categoría',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          })),
          subtotal: saleData.totalAmount,
          taxes: 0,
          discount: 0,
          totalAmount: saleData.totalAmount,
          totalQuantity: saleData.totalQuantity,
          paymentMethod: saleData.paymentMethod,
          comments: saleData.comments,
          status: saleData.status
        };

        transactions.push(transactionData);
      });
    }

    // Obtener compras si están incluidas
    if (filters.includeTypes.includes('purchase')) {
      console.log('📉 Cargando datos de compras...');
      const purchasesQuery = query(
        collection(db, 'purchases'),
        where('purchaseDate', '>=', Timestamp.fromDate(filters.startDate)),
        where('purchaseDate', '<=', Timestamp.fromDate(filters.endDate)),
        orderBy('purchaseDate', 'desc')
      );

      const purchasesSnapshot = await getDocs(purchasesQuery);
      
      purchasesSnapshot.docs.forEach(doc => {
        const purchaseData = doc.data() as Purchase;
        purchaseData.id = doc.id;
        purchaseData.purchaseDate = purchaseData.purchaseDate || new Date();
        purchaseData.createdAt = purchaseData.createdAt || new Date();
        
        // Convertir compra a TransactionData
        const transactionData: TransactionData = {
          id: purchaseData.id,
          code: purchaseData.code,
          type: 'purchase',
          transactionDate: purchaseData.purchaseDate,
          createdAt: purchaseData.createdAt,
          counterparty: {
            id: purchaseData.supplierId,
            rut: purchaseData.supplierInfo.rut,
            name: purchaseData.supplierInfo.name,
            contact: purchaseData.supplierInfo.contact,
            email: purchaseData.supplierInfo.email,
            phone: purchaseData.supplierInfo.phone,
            address: purchaseData.supplierInfo.address,
            type: 'supplier'
          },
          user: {
            id: purchaseData.userId,
            email: purchaseData.userEmail,
            name: purchaseData.userEmail.split('@')[0],
            role: 'admin'
          },
          items: purchaseData.items.map(item => ({
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            category: item.category || 'Sin categoría',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          })),
          subtotal: purchaseData.totalAmount,
          taxes: 0,
          discount: 0,
          totalAmount: purchaseData.totalAmount,
          totalQuantity: purchaseData.totalQuantity,
          comments: purchaseData.comments,
          status: purchaseData.status
        };

        transactions.push(transactionData);
      });
    }

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

    // Filtro por monto
    if (filters.minAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter(t => t.totalAmount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter(t => t.totalAmount <= filters.maxAmount!);
    }

    // Filtro por IDs específicos
    if (filters.customerIds && filters.customerIds.length > 0) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.type === 'sale' && filters.customerIds!.includes(t.counterparty.id)
      );
    }

    if (filters.supplierIds && filters.supplierIds.length > 0) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.type === 'purchase' && filters.supplierIds!.includes(t.counterparty.id)
      );
    }

    if (filters.userIds && filters.userIds.length > 0) {
      filteredTransactions = filteredTransactions.filter(t => 
        filters.userIds!.includes(t.user.id)
      );
    }

    if (filters.productIds && filters.productIds.length > 0) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.items.some(item => filters.productIds!.includes(item.productId))
      );
    }

    if (filters.categories && filters.categories.length > 0) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.items.some(item => filters.categories!.includes(item.category))
      );
    }

    // Ordenar por fecha (más recientes primero)
    filteredTransactions.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());

    console.log(`✅ ${filteredTransactions.length} transacciones cargadas`);
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
    const dateKey = transaction.transactionDate.toISOString().split('T')[0];
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
        lastTransactionDate: transaction.transactionDate,
        percentage: 0
      };
      
      existing.transactionCount += 1;
      existing.totalAmount += transaction.totalAmount;
      existing.totalQuantity += transaction.totalQuantity;
      existing.lastTransactionDate = transaction.transactionDate > existing.lastTransactionDate ? 
        transaction.transactionDate : existing.lastTransactionDate;
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
        lastTransactionDate: transaction.transactionDate,
        percentage: 0
      };
      
      existing.transactionCount += 1;
      existing.totalAmount += transaction.totalAmount;
      existing.totalQuantity += transaction.totalQuantity;
      existing.lastTransactionDate = transaction.transactionDate > existing.lastTransactionDate ? 
        transaction.transactionDate : existing.lastTransactionDate;
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
      lastActivity: transaction.transactionDate,
      percentage: 0
    };
    
    userExisting.transactionCount += 1;
    userExisting.totalAmount += transaction.totalAmount;
    userExisting.lastActivity = transaction.transactionDate > userExisting.lastActivity ? 
      transaction.transactionDate : userExisting.lastActivity;
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
 * Crear un nuevo reporte
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

    // Crear objeto de reporte
    const reportData: Omit<TransactionReport, 'id'> = {
      code,
      type: request.type,
      title: request.title,
      description: request.description,
      periodStart: request.filters.startDate,
      periodEnd: request.filters.endDate,
      transactionData,
      summary,
      generatedBy: userId,
      generatedByName: userEmail.split('@')[0],
      generatedAt: new Date(),
      status: ReportStatus.COMPLETED,
      filters: request.filters,
      files: [], // Se llenarán después de la exportación
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
      // Convertir fechas en transactionData
      transactionData: reportData.transactionData.map(transaction => ({
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
      return {
        id: docSnap.id,
        ...data,
        periodStart: data.periodStart.toDate(),
        periodEnd: data.periodEnd.toDate(),
        generatedAt: data.generatedAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        // Convertir fechas en transactionData
        transactionData: data.transactionData.map((transaction: any) => ({
          ...transaction,
          transactionDate: transaction.transactionDate.toDate(),
          createdAt: transaction.createdAt.toDate()
        }))
      } as TransactionReport;
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
        periodStart: data.periodStart.toDate(),
        periodEnd: data.periodEnd.toDate(),
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
        generatedAt: data.generatedAt.toDate(),
        status: data.status || ReportStatus.COMPLETED,
        filters: data.filters || { includeTypes: [], startDate: new Date(), endDate: new Date() },
        files: data.files || [],
        statistics: data.statistics,
        exportConfig: data.exportConfig,
        updatedAt: data.updatedAt.toDate()
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
 * Obtener reportes recientes
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
      
      // Crear objeto con todas las propiedades requeridas
      return {
        id: doc.id,
        code: data.code || '',
        type: data.type || ReportType.SALES,
        title: data.title || '',
        description: data.description,
        periodStart: data.periodStart.toDate(),
        periodEnd: data.periodEnd.toDate(),
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
        generatedAt: data.generatedAt.toDate(),
        status: data.status || ReportStatus.COMPLETED,
        filters: data.filters || { 
          includeTypes: [], 
          startDate: new Date(), 
          endDate: new Date() 
        },
        files: data.files || [],
        statistics: data.statistics,
        exportConfig: data.exportConfig,
        updatedAt: data.updatedAt.toDate()
      } as TransactionReport;
    });
  } catch (error) {
    console.error('Error obteniendo reportes recientes:', error);
    throw error;
  }
};