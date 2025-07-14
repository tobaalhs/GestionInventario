import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getFinancesSummary, 
  getPurchasesTrend,
  updateFinancesSummary 
} from '../../services/financeService';
import { FinancesSummary } from '../../interfaces/Purchase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './FinancialDashboard.css';

interface MonthlyData {
  month: string;
  ingresos: number;
  egresos: number;
  formattedMonth: string;
}

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

const FinancialDashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [financesSummary, setFinancesSummary] = useState<FinancesSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentMonthSales, setCurrentMonthSales] = useState(0);

  // Función mejorada para obtener categorías de compras
  const getPurchaseCategories = async (): Promise<CategoryData[]> => {
    try {
      console.log('Obteniendo categorías de compras...');
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Obtener compras del mes actual
      const purchasesQuery = query(
        collection(db, 'purchases'),
        where('status', '==', 'completed')
      );
      
      const purchasesSnapshot = await getDocs(purchasesQuery);
      console.log(`Encontradas ${purchasesSnapshot.docs.length} compras en total`);
      
      const categoryTotals: { [key: string]: number } = {};
      let totalAmount = 0;
      
      purchasesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Verificar si la compra está en el mes actual
        if (data.purchaseDate && data.purchaseDate.toDate) {
          const purchaseDate = data.purchaseDate.toDate();
          
          if (purchaseDate >= startOfMonth && purchaseDate <= endOfMonth) {
            console.log('Compra del mes encontrada:', data);
            
            // Procesar los items de la compra
            if (data.items && Array.isArray(data.items)) {
              data.items.forEach((item: any) => {
                const category = item.category || 'Sin categoría';
                const itemTotal = item.totalPrice || (item.quantity * item.unitPrice) || 0;
                
                categoryTotals[category] = (categoryTotals[category] || 0) + itemTotal;
                totalAmount += itemTotal;
                
                console.log(`Item: ${item.productName}, Categoría: ${category}, Total: ${itemTotal}`);
              });
            }
          }
        }
      });
      
      console.log('Totales por categoría:', categoryTotals);
      console.log('Total amount:', totalAmount);
      
      // Si no hay datos del mes actual, intentar con los últimos 3 meses
      if (totalAmount === 0) {
        console.log('No hay datos del mes actual, intentando con los últimos 3 meses...');
        
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        purchasesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          
          if (data.purchaseDate && data.purchaseDate.toDate) {
            const purchaseDate = data.purchaseDate.toDate();
            
            if (purchaseDate >= threeMonthsAgo) {
              if (data.items && Array.isArray(data.items)) {
                data.items.forEach((item: any) => {
                  const category = item.category || 'Sin categoría';
                  const itemTotal = item.totalPrice || (item.quantity * item.unitPrice) || 0;
                  
                  categoryTotals[category] = (categoryTotals[category] || 0) + itemTotal;
                  totalAmount += itemTotal;
                });
              }
            }
          }
        });
        
        console.log('Totales por categoría (3 meses):', categoryTotals);
      }
      
      // Convertir a array y calcular porcentajes
      const colors = ['#4F46E5', '#059669', '#DC2626', '#D97706', '#7C3AED', '#DB2777', '#059669', '#E11D48'];
      const categories: CategoryData[] = Object.entries(categoryTotals)
        .map(([category, amount], index) => ({
          category,
          amount,
          percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
          color: colors[index % colors.length]
        }))
        .sort((a, b) => b.amount - a.amount) // Ordenar por monto descendente
        .slice(0, 6); // Tomar solo las 6 principales
      
      console.log('Categorías finales:', categories);
      return categories;
      
    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      return [];
    }
  };

  // Función para obtener ventas del mes actual directamente
  const getCurrentMonthSales = async (): Promise<number> => {
    try {
      console.log('Obteniendo ventas del mes actual...');
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Intentar obtener de la colección 'sales'
      const salesQuery = query(
        collection(db, 'sales'),
        where('status', '==', 'completed')
      );
      
      const salesSnapshot = await getDocs(salesQuery);
      console.log(`Encontradas ${salesSnapshot.docs.length} ventas en total`);
      
      let totalSales = 0;
      salesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.saleDate && data.saleDate.toDate) {
          const saleDate = data.saleDate.toDate();
          
          if (saleDate >= startOfMonth && saleDate <= endOfMonth) {
            totalSales += data.totalAmount || 0;
            console.log(`Venta del mes: ${data.totalAmount}`);
          }
        }
      });
      
      console.log(`Total ventas del mes: ${totalSales}`);
      return totalSales;
      
    } catch (error) {
      console.error('Error obteniendo ventas del mes:', error);
      return 0;
    }
  };

  // Función para obtener ventas de un mes específico
  const getSalesForMonth = async (targetMonth: Date): Promise<number> => {
    try {
      const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
      
      const salesQuery = query(
        collection(db, 'sales'),
        where('status', '==', 'completed')
      );
      
      const salesSnapshot = await getDocs(salesQuery);
      
      let totalSales = 0;
      salesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.saleDate && data.saleDate.toDate) {
          const saleDate = data.saleDate.toDate();
          
          if (saleDate >= startOfMonth && saleDate <= endOfMonth) {
            totalSales += data.totalAmount || 0;
          }
        }
      });
      
      return totalSales;
    } catch (error) {
      console.error(`Error obteniendo ventas para ${targetMonth.toISOString().substring(0, 7)}:`, error);
      return 0;
    }
  };

  // Cargar datos financieros
  const loadFinancialData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Cargando datos financieros...');
      
      // Obtener resumen financiero original
      const summary = await getFinancesSummary();
      console.log('Resumen financiero obtenido:', summary);
      
      // Obtener ventas del mes actual
      const monthSales = await getCurrentMonthSales();
      setCurrentMonthSales(monthSales);
      
      // Actualizar el resumen con ventas reales
      const updatedSummary = {
        ...summary,
        monthlySales: monthSales
      };
      
      setFinancesSummary(updatedSummary);

      // Obtener datos de los últimos 6 meses para el gráfico
      const monthlyChartData: MonthlyData[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);
        
        // Obtener compras del mes usando el servicio existente
        const purchasesTrend = await getPurchasesTrend(6);
        const monthKey = month.toISOString().substring(0, 7);
        const purchaseData = purchasesTrend.find(p => p.month === monthKey);
        const purchaseAmount = purchaseData?.amount || 0;
        
        // Obtener ventas del mes
        const salesAmount = await getSalesForMonth(month);
        
        monthlyChartData.push({
          month: monthKey,
          ingresos: salesAmount,
          egresos: purchaseAmount,
          formattedMonth: month.toLocaleDateString('es-CL', { month: 'short' })
        });
      }
      
      setMonthlyData(monthlyChartData);
      console.log('Datos mensuales cargados:', monthlyChartData);

      // Obtener categorías mejoradas
      const categories = await getPurchaseCategories();
      setCategoryData(categories);
      
      setLastUpdated(new Date());
      console.log('Datos financieros cargados exitosamente');
      
    } catch (error) {
      console.error('Error cargando datos financieros:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualizar resumen financiero
  const refreshFinancialSummary = async () => {
    try {
      setIsRefreshing(true);
      console.log('Actualizando resumen financiero...');
      await updateFinancesSummary(currentUser?.email || 'system');
      await loadFinancialData();
    } catch (error) {
      console.error('Error actualizando resumen financiero:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      console.log('Auto-refresh ejecutándose...');
      loadFinancialData();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [autoRefresh, loadFinancialData]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-CL').format(Math.round(num));
  };

  if (loading) {
    return (
      <div className="financial-dashboard-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Cargando datos financieros...</p>
        </div>
      </div>
    );
  }

  // Calcular máximo valor para normalizar barras
  const maxValue = Math.max(...monthlyData.map(d => Math.max(d.ingresos, d.egresos)), 1);

  return (
    <div className="financial-dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-button">← Volver al Dashboard</Link>
          <h1>Dashboard Financiero</h1>
        </div>
        <div className="header-right">
          <div className="refresh-controls">
            <button 
              onClick={refreshFinancialSummary} 
              className={`refresh-button ${isRefreshing ? 'refreshing' : ''}`}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Actualizando...' : 'Actualizar Datos'}
            </button>
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-actualizar (5 min)
            </label>
          </div>
          <div className="user-info">
            <span>{currentUser?.displayName || 'Usuario'}</span>
            <button className="logout-button" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Principal - Resumen Financiero */}
      <section className="financial-summary">
        <h2>Resumen Financiero</h2>
        <div className="summary-cards">
          <div className="summary-card money-card">
            <div className="card-icon">💰</div>
            <div className="card-content">
              <h3>Dinero Actual</h3>
              <p className="amount">{formatCurrency(financesSummary?.currentCash || 0)}</p>
              <span className="subtitle">Efectivo disponible</span>
            </div>
          </div>

          <div className="summary-card income-card">
            <div className="card-icon">📈</div>
            <div className="card-content">
              <h3>Ingresos del Mes</h3>
              <p className="amount">{formatCurrency(currentMonthSales)}</p>
              <span className="subtitle">Ventas realizadas</span>
            </div>
          </div>

          <div className="summary-card expense-card">
            <div className="card-icon">📉</div>
            <div className="card-content">
              <h3>Egresos del Mes</h3>
              <p className="amount">{formatCurrency(financesSummary?.monthlyPurchases || 0)}</p>
              <span className="subtitle">Compras realizadas</span>
            </div>
          </div>

          <div className="summary-card inventory-card">
            <div className="card-icon">📦</div>
            <div className="card-content">
              <h3>Valor Inventario</h3>
              <p className="amount">{formatCurrency(financesSummary?.totalInventoryValue || 0)}</p>
              <span className="subtitle">{formatNumber(financesSummary?.totalStock || 0)} productos</span>
            </div>
          </div>
        </div>
      </section>

      {/* Gráficos */}
      <section className="charts-section">
        <div className="charts-container">
          {/* Gráfico de Barras - Ingresos vs Egresos */}
          <div className="chart-card">
            <h3>Ingresos vs Egresos (Últimos 6 Meses)</h3>
            <div className="bar-chart">
              {monthlyData.map((data, index) => {
                const incomeHeight = maxValue > 0 ? (data.ingresos / maxValue) * 180 : 2;
                const expenseHeight = maxValue > 0 ? (data.egresos / maxValue) * 180 : 2;

                return (
                  <div key={index} className="bar-group">
                    <div className="bars">
                      <div 
                        className="bar income-bar" 
                        style={{ height: `${Math.max(incomeHeight, 2)}px` }}
                        title={`Ingresos: ${formatCurrency(data.ingresos)}`}
                      ></div>
                      <div 
                        className="bar expense-bar" 
                        style={{ height: `${Math.max(expenseHeight, 2)}px` }}
                        title={`Egresos: ${formatCurrency(data.egresos)}`}
                      ></div>
                    </div>
                    <span className="bar-label">{data.formattedMonth}</span>
                  </div>
                );
              })}
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color income-color"></span>
                <span>Ingresos</span>
              </div>
              <div className="legend-item">
                <span className="legend-color expense-color"></span>
                <span>Egresos</span>
              </div>
            </div>
          </div>

          {/* Gráfico Circular - Gastos por Categorías */}
          <div className="chart-card">
            <h3>Gastos por Categorías (Último Mes)</h3>
            <div className="pie-chart-container">
              {categoryData.length > 0 ? (
                <>
                  <div className="pie-chart">
                    <svg width="250" height="250" viewBox="0 0 250 250">
                      {(() => {
                        let currentAngle = 0;
                        const radius = 100;
                        const centerX = 125;
                        const centerY = 125;
                        
                        return categoryData.map((category, index) => {
                          const angle = (category.percentage / 100) * 360;
                          const startAngle = currentAngle;
                          const endAngle = currentAngle + angle;
                          
                          const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
                          const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
                          const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
                          const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
                          
                          const largeArcFlag = angle > 180 ? 1 : 0;
                          const pathData = [
                            `M ${centerX} ${centerY}`,
                            `L ${x1} ${y1}`,
                            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                            'Z'
                          ].join(' ');
                          
                          currentAngle += angle;
                          
                          return (
                            <path
                              key={index}
                              d={pathData}
                              fill={category.color}
                              stroke="#fff"
                              strokeWidth="3"
                              className="pie-slice"
                            >
                              <title>{`${category.category}: ${formatCurrency(category.amount)} (${category.percentage.toFixed(1)}%)`}</title>
                            </path>
                          );
                        });
                      })()}
                    </svg>
                  </div>
                  <div className="pie-chart-legend">
                    {categoryData.map((category, index) => (
                      <div key={index} className="legend-item">
                        <span 
                          className="legend-color" 
                          style={{ backgroundColor: category.color }}
                        ></span>
                        <span className="legend-text">
                          <strong>{category.category}</strong>: {formatCurrency(category.amount)} ({category.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="no-data">
                  <div className="no-data-icon">📊</div>
                  <p>No hay datos de categorías para mostrar</p>
                  <span>Realiza algunas compras para ver el desglose por categorías</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Información adicional */}
      <section className="additional-info">
        <div className="info-cards">
          <div className="info-card">
            <div className="info-icon">🔄</div>
            <h4>Rotación de Inventario</h4>
            <p className="metric">{(financesSummary?.inventoryTurnover || 0).toFixed(2)}x</p>
            <span>Veces por año</span>
          </div>
          
          <div className="info-card">
            <div className="info-icon">📊</div>
            <h4>Promedio Mensual Compras</h4>
            <p className="metric">{formatCurrency(financesSummary?.averageMonthlyPurchases || 0)}</p>
            <span>Últimos 12 meses</span>
          </div>
          
          <div className="info-card">
            <div className="info-icon">📈</div>
            <h4>Compras del Año</h4>
            <p className="metric">{formatCurrency(financesSummary?.yearlyPurchases || 0)}</p>
            <span>{new Date().getFullYear()}</span>
          </div>

          <div className="info-card profit-card">
            <div className="info-icon">💹</div>
            <h4>Balance del Mes</h4>
            <p className={`metric ${currentMonthSales - (financesSummary?.monthlyPurchases || 0) >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(currentMonthSales - (financesSummary?.monthlyPurchases || 0))}
            </p>
            <span>Ingresos - Egresos</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="footer-content">
          <p>© 2025 Sistema de Gestión de Inventario - Dashboard Financiero</p>
          {lastUpdated && (
            <span className="last-updated">
              Última actualización: {lastUpdated.toLocaleString('es-CL')}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
};

export default FinancialDashboard;