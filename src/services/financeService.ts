import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FinancesSummary } from '../interfaces/Purchase';
import { calculateInventoryValue } from './stockMovementService';

/**
 * ID fijo para el documento de resumen financiero
 */
const FINANCES_SUMMARY_ID = 'main_summary';

/**
 * Obtener resumen financiero actual
 */
export const getFinancesSummary = async (): Promise<FinancesSummary> => {
  try {
    const docRef = doc(db, 'financesSummary', FINANCES_SUMMARY_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        lastUpdated: data.lastUpdated.toDate()
      } as FinancesSummary;
    } else {
      // Si no existe, crear uno inicial
      return await createInitialFinancesSummary();
    }
  } catch (error) {
    console.error('Error obteniendo resumen financiero:', error);
    throw error;
  }
};

/**
 * Crear resumen financiero inicial
 */
const createInitialFinancesSummary = async (): Promise<FinancesSummary> => {
  try {
    console.log('Creando resumen financiero inicial...');
    
    const initialSummary: FinancesSummary = {
      id: FINANCES_SUMMARY_ID,
      totalInventoryValue: 0,
      totalStock: 0,
      currentCash: 0,
      monthlyPurchases: 0,
      monthlySales: 0,
      yearlyPurchases: 0,
      yearlySales: 0,
      averageMonthlyPurchases: 0,
      averageMonthlySales: 0,
      inventoryTurnover: 0,
      lastUpdated: new Date(),
      updatedBy: 'system'
    };

    const docRef = doc(db, 'financesSummary', FINANCES_SUMMARY_ID);
    await setDoc(docRef, {
      ...initialSummary,
      lastUpdated: Timestamp.now()
    });

    return initialSummary;
  } catch (error) {
    console.error('Error creando resumen financiero inicial:', error);
    throw error;
  }
};

/**
 * Actualizar resumen financiero completo
 */
export const updateFinancesSummary = async (updatedBy: string = 'system'): Promise<void> => {
  try {
    console.log('Actualizando resumen financiero...');

    // Calcular valor total del inventario
    const totalInventoryValue = await calculateInventoryValue();

    // Calcular stock total
    const totalStock = await calculateTotalStock();

    // Calcular compras y ventas del mes actual
    const currentMonth = new Date();
    const monthlyPurchases = await calculateMonthlyPurchases(currentMonth);
    const monthlySales = await calculateMonthlySales(currentMonth);

    // Calcular compras y ventas del año actual
    const currentYear = new Date().getFullYear();
    const yearlyPurchases = await calculateYearlyPurchases(currentYear);
    const yearlySales = await calculateYearlySales(currentYear);

    // Calcular promedios mensuales (últimos 12 meses)
    const averageMonthlyPurchases = await calculateAverageMonthlyPurchases();
    const averageMonthlySales = await calculateAverageMonthlySales();

    // Calcular rotación de inventario
    const inventoryTurnover = totalInventoryValue > 0 ? yearlySales / totalInventoryValue : 0;

    // Obtener cash actual (o mantener el existente)
    const currentFinances = await getFinancesSummary();
    const currentCash = currentFinances.currentCash;

    const updatedSummary: Partial<FinancesSummary> = {
      totalInventoryValue,
      totalStock,
      currentCash,
      monthlyPurchases,
      monthlySales,
      yearlyPurchases,
      yearlySales,
      averageMonthlyPurchases,
      averageMonthlySales,
      inventoryTurnover,
      lastUpdated: new Date(),
      updatedBy
    };

    const docRef = doc(db, 'financesSummary', FINANCES_SUMMARY_ID);
    await updateDoc(docRef, {
      ...updatedSummary,
      lastUpdated: Timestamp.now()
    });

    console.log('Resumen financiero actualizado exitosamente');
  } catch (error) {
    console.error('Error actualizando resumen financiero:', error);
    throw error;
  }
};

/**
 * Calcular stock total en unidades
 */
const calculateTotalStock = async (): Promise<number> => {
  try {
    const q = query(
      collection(db, 'items'),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    let totalStock = 0;
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      totalStock += data.stock || 0;
    });

    return totalStock;
  } catch (error) {
    console.error('Error calculando stock total:', error);
    throw error;
  }
};

/**
 * Calcular compras del mes actual
 */
const calculateMonthlyPurchases = async (month: Date): Promise<number> => {
  try {
    // Obtener todas las compras completadas y filtrar en el cliente
    const q = query(
      collection(db, 'purchases'),
      where('status', '==', 'completed')
    );
    
    const querySnapshot = await getDocs(q);
    
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    
    let totalPurchases = 0;
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const purchaseDate = data.purchaseDate.toDate();
      
      // Filtrar por fecha en el cliente
      if (purchaseDate >= startOfMonth && purchaseDate <= endOfMonth) {
        totalPurchases += data.totalAmount || 0;
      }
    });

    return totalPurchases;
  } catch (error) {
    console.error('Error calculando compras mensuales:', error);
    return 0; // Retornar 0 en caso de error para no bloquear el flujo
  }
};

/**
 * Calcular ventas del mes actual
 * Nota: Por ahora retorna 0, se implementará cuando se agregue módulo de ventas
 */
const calculateMonthlySales = async (month: Date): Promise<number> => {
  try {
    // Obtener todas las ventas completadas
    const q = query(
      collection(db, 'sales'),
      where('status', '==', 'completed')
    );
    
    const querySnapshot = await getDocs(q);
    
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    
    let totalSales = 0;
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const saleDate = data.saleDate.toDate();
      
      // Filtrar por fecha en el cliente
      if (saleDate >= startOfMonth && saleDate <= endOfMonth) {
        totalSales += data.totalAmount || 0;
      }
    });

    return totalSales;
  } catch (error) {
    console.error('Error calculando ventas mensuales:', error);
    return 0;
  }
};

/**
 * Calcular compras del año actual
 */
const calculateYearlyPurchases = async (year: number): Promise<number> => {
  try {
    // Obtener todas las compras completadas y filtrar en el cliente
    const q = query(
      collection(db, 'purchases'),
      where('status', '==', 'completed')
    );
    
    const querySnapshot = await getDocs(q);
    
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);
    
    let totalPurchases = 0;
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const purchaseDate = data.purchaseDate.toDate();
      
      // Filtrar por año en el cliente
      if (purchaseDate >= startOfYear && purchaseDate <= endOfYear) {
        totalPurchases += data.totalAmount || 0;
      }
    });

    return totalPurchases;
  } catch (error) {
    console.error('Error calculando compras anuales:', error);
    return 0;
  }
};

/**
 * Calcular ventas del año actual
 * Nota: Por ahora retorna 0, se implementará cuando se agregue módulo de ventas
 */
const calculateYearlySales = async (year: number): Promise<number> => {
  try {
    // Obtener todas las ventas completadas
    const q = query(
      collection(db, 'sales'),
      where('status', '==', 'completed')
    );
    
    const querySnapshot = await getDocs(q);
    
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);
    
    let totalSales = 0;
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const saleDate = data.saleDate.toDate();
      
      // Filtrar por año en el cliente
      if (saleDate >= startOfYear && saleDate <= endOfYear) {
        totalSales += data.totalAmount || 0;
      }
    });

    return totalSales;
  } catch (error) {
    console.error('Error calculando ventas anuales:', error);
    return 0;
  }
};

/**
 * Calcular promedio mensual de compras (últimos 12 meses)
 */
const calculateAverageMonthlyPurchases = async (): Promise<number> => {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(now.getMonth() - 12);

    // Obtener todas las compras completadas y filtrar en el cliente
    const q = query(
      collection(db, 'purchases'),
      where('status', '==', 'completed')
    );
    
    const querySnapshot = await getDocs(q);
    
    let totalPurchases = 0;
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const purchaseDate = data.purchaseDate.toDate();
      
      // Filtrar por período en el cliente
      if (purchaseDate >= twelveMonthsAgo && purchaseDate <= now) {
        totalPurchases += data.totalAmount || 0;
      }
    });

    return totalPurchases / 12; // Promedio mensual
  } catch (error) {
    console.error('Error calculando promedio mensual de compras:', error);
    return 0;
  }
};

/**
 * Calcular promedio mensual de ventas (últimos 12 meses)
 * Nota: Por ahora retorna 0, se implementará cuando se agregue módulo de ventas
 */
const calculateAverageMonthlySales = async (): Promise<number> => {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(now.getMonth() - 12);

    // Obtener todas las ventas completadas
    const q = query(
      collection(db, 'sales'),
      where('status', '==', 'completed')
    );
    
    const querySnapshot = await getDocs(q);
    
    let totalSales = 0;
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const saleDate = data.saleDate.toDate();
      
      // Filtrar por período en el cliente
      if (saleDate >= twelveMonthsAgo && saleDate <= now) {
        totalSales += data.totalAmount || 0;
      }
    });

    return totalSales / 12; // Promedio mensual
  } catch (error) {
    console.error('Error calculando promedio mensual de ventas:', error);
    return 0;
  }
};

/**
 * Actualizar flujo de caja (entrada o salida)
 */
export const updateCashFlow = async (amount: number, type: 'income' | 'expense', description?: string): Promise<void> => {
  try {
    const currentFinances = await getFinancesSummary();
    let newCashAmount = currentFinances.currentCash;

    if (type === 'income') {
      newCashAmount += amount;
    } else {
      newCashAmount -= amount;
    }

    const docRef = doc(db, 'financesSummary', FINANCES_SUMMARY_ID);
    await updateDoc(docRef, {
      currentCash: newCashAmount,
      lastUpdated: Timestamp.now(),
      updatedBy: 'cash_flow_update'
    });

    // Registrar el movimiento de caja
    await recordCashMovement(amount, type, description);

    console.log(`Flujo de caja actualizado: ${type} por $${amount}`);
  } catch (error) {
    console.error('Error actualizando flujo de caja:', error);
    throw error;
  }
};

/**
 * Registrar movimiento de caja
 */
const recordCashMovement = async (amount: number, type: 'income' | 'expense', description?: string): Promise<void> => {
  try {
    const movementData = {
      amount,
      type,
      description: description || `${type === 'income' ? 'Ingreso' : 'Gasto'} registrado`,
      createdAt: Timestamp.now()
    };

    await setDoc(doc(collection(db, 'cashMovements')), movementData);
  } catch (error) {
    console.error('Error registrando movimiento de caja:', error);
    throw error;
  }
};

/**
 * Obtener valor total del inventario actual
 */
export const getTotalInventoryValue = async (): Promise<number> => {
  try {
    return await calculateInventoryValue();
  } catch (error) {
    console.error('Error obteniendo valor total del inventario:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas financieras por período
 */
export const getFinancialStatsByPeriod = async (startDate: Date, endDate: Date) => {
  try {
    // Compras en el período
    const purchasesQuery = query(
      collection(db, 'purchases'),
      where('purchaseDate', '>=', Timestamp.fromDate(startDate)),
      where('purchaseDate', '<=', Timestamp.fromDate(endDate)),
      where('status', '==', 'completed')
    );
    
    const purchasesSnapshot = await getDocs(purchasesQuery);
    
    let totalPurchases = 0;
    let purchaseCount = 0;
    const purchasesBySupplier = new Map<string, number>();
    const purchasesByCategory = new Map<string, number>();

    purchasesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const amount = data.totalAmount || 0;
      
      totalPurchases += amount;
      purchaseCount += 1;

      // Por proveedor
      const supplierName = data.supplierInfo?.name || 'Sin proveedor';
      purchasesBySupplier.set(supplierName, (purchasesBySupplier.get(supplierName) || 0) + amount);

      // Por categoría (sumar todos los items)
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach((item: any) => {
          const category = item.category || 'Sin categoría';
          purchasesByCategory.set(category, (purchasesByCategory.get(category) || 0) + item.totalPrice);
        });
      }
    });

    // TODO: Calcular ventas cuando se implemente el módulo
    const totalSales = 0;
    const salesCount = 0;

    // Convertir Maps a arrays ordenados
    const topSuppliers = Array.from(purchasesBySupplier.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const topCategories = Array.from(purchasesByCategory.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return {
      period: {
        startDate,
        endDate,
        days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      },
      purchases: {
        total: totalPurchases,
        count: purchaseCount,
        average: purchaseCount > 0 ? totalPurchases / purchaseCount : 0,
        bySupplier: topSuppliers,
        byCategory: topCategories
      },
      sales: {
        total: totalSales,
        count: salesCount,
        average: salesCount > 0 ? totalSales / salesCount : 0
      },
      netFlow: totalSales - totalPurchases,
      profitMargin: totalSales > 0 ? ((totalSales - totalPurchases) / totalSales) * 100 : 0
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas financieras:', error);
    throw error;
  }
};

/**
 * Generar reporte financiero mensual
 */
export const generateMonthlyFinancialReport = async (year: number, month: number) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const stats = await getFinancialStatsByPeriod(startDate, endDate);
    const currentSummary = await getFinancesSummary();

    return {
      month: `${year}-${month.toString().padStart(2, '0')}`,
      period: stats.period,
      summary: {
        totalInventoryValue: currentSummary.totalInventoryValue,
        totalStock: currentSummary.totalStock,
        currentCash: currentSummary.currentCash
      },
      movements: {
        purchases: stats.purchases,
        sales: stats.sales,
        netFlow: stats.netFlow
      },
      analysis: {
        profitMargin: stats.profitMargin,
        inventoryTurnover: currentSummary.inventoryTurnover,
        purchaseGrowth: await calculatePurchaseGrowth(year, month),
        topPerformingCategories: stats.purchases.byCategory.slice(0, 5)
      },
      generatedAt: new Date()
    };
  } catch (error) {
    console.error('Error generando reporte mensual:', error);
    throw error;
  }
};

/**
 * Calcular crecimiento de compras respecto al mes anterior
 */
const calculatePurchaseGrowth = async (year: number, month: number): Promise<number> => {
  try {
    // Mes actual
    const currentMonth = new Date(year, month - 1, 1);
    const currentPurchases = await calculateMonthlyPurchases(currentMonth);

    // Mes anterior
    const previousMonth = new Date(year, month - 2, 1);
    const previousPurchases = await calculateMonthlyPurchases(previousMonth);

    if (previousPurchases === 0) return 0;

    return ((currentPurchases - previousPurchases) / previousPurchases) * 100;
  } catch (error) {
    console.error('Error calculando crecimiento de compras:', error);
    return 0;
  }
};

export const getSalesTrend = async (months: number = 12) => {
  try {
    const trends = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const sales = await calculateMonthlySales(month);
      
      trends.push({
        month: month.toISOString().substring(0, 7), // YYYY-MM
        amount: sales,
        formattedMonth: month.toLocaleDateString('es-CL', { year: 'numeric', month: 'long' })
      });
    }

    return trends;
  } catch (error) {
    console.error('Error obteniendo tendencia de ventas:', error);
    throw error;
  }
};

/**
 * Obtener tendencia de compras por meses
 */
export const getPurchasesTrend = async (months: number = 12) => {
  try {
    const trends = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const purchases = await calculateMonthlyPurchases(month);
      
      trends.push({
        month: month.toISOString().substring(0, 7), // YYYY-MM
        amount: purchases,
        formattedMonth: month.toLocaleDateString('es-CL', { year: 'numeric', month: 'long' })
      });
    }

    return trends;
  } catch (error) {
    console.error('Error obteniendo tendencia de compras:', error);
    throw error;
  }
};

/**
 * Actualizar finanzas después de una compra
 */
export const updateFinancesAfterPurchase = async (purchaseAmount: number, updatedBy: string): Promise<void> => {
  try {
    // Actualizar flujo de caja (gasto)
    await updateCashFlow(purchaseAmount, 'expense', 'Compra de inventario');

    // Actualizar resumen completo
    await updateFinancesSummary(updatedBy);

    console.log('Finanzas actualizadas después de compra');
  } catch (error) {
    console.error('Error actualizando finanzas después de compra:', error);
    throw error;
  }
};

/**
 * Actualizar finanzas después de una venta
 */
export const updateFinancesAfterSale = async (saleAmount: number, updatedBy: string): Promise<void> => {
  try {
    // Actualizar flujo de caja (ingreso)
    await updateCashFlow(saleAmount, 'income', 'Venta de productos');

    // Actualizar resumen completo
    await updateFinancesSummary(updatedBy);

    console.log('Finanzas actualizadas después de venta');
  } catch (error) {
    console.error('Error actualizando finanzas después de venta:', error);
    throw error;
  }
};