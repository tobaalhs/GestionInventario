import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MovementHistory from './MovementHistory';
import TransactionReports from './TransactionReports';
import AdvancedSearch from './AdvancedSearch';
import ExportManager from './ExportManager';
import './Reports.css';

type ReportView = 'overview' | 'movements' | 'transactions' | 'search' | 'exports';

interface DashboardStats {
  totalMovements: number;
  totalReports: number;
  pendingExports: number;
  lastUpdate: Date;
}

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState<ReportView>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalMovements: 0,
    totalReports: 0,
    pendingExports: 0,
    lastUpdate: new Date()
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      // Aquí cargarías las estadísticas reales
      // Por ahora usamos datos simulados
      setStats({
        totalMovements: 1247,
        totalReports: 28,
        pendingExports: 3,
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'movements':
        return <MovementHistory />;
      case 'transactions':
        return <TransactionReports />;
      case 'search':
        return <AdvancedSearch />;
      case 'exports':
        return <ExportManager />;
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <div className="reports-overview">
      <div className="overview-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Movimientos de Stock</h3>
            <p className="stat-number">{stats.totalMovements.toLocaleString()}</p>
            <p className="stat-description">Total registrados</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>Reportes Generados</h3>
            <p className="stat-number">{stats.totalReports}</p>
            <p className="stat-description">Este mes</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📤</div>
          <div className="stat-content">
            <h3>Exportaciones</h3>
            <p className="stat-number">{stats.pendingExports}</p>
            <p className="stat-description">Pendientes</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🕒</div>
          <div className="stat-content">
            <h3>Última Actualización</h3>
            <p className="stat-number">{stats.lastUpdate.toLocaleTimeString('es-CL', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</p>
            <p className="stat-description">Hoy</p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>🚀 Acciones Rápidas</h3>
        <div className="actions-grid">
          <button 
            className="action-btn"
            onClick={() => setCurrentView('movements')}
          >
            <span className="action-icon">📈</span>
            <div className="action-content">
              <h4>Ver Movimientos</h4>
              <p>Historial completo de stock</p>
            </div>
          </button>

          <button 
            className="action-btn"
            onClick={() => setCurrentView('transactions')}
          >
            <span className="action-icon">💼</span>
            <div className="action-content">
              <h4>Generar Reporte</h4>
              <p>Compras y ventas detalladas</p>
            </div>
          </button>

          <button 
            className="action-btn"
            onClick={() => setCurrentView('search')}
          >
            <span className="action-icon">🔍</span>
            <div className="action-content">
              <h4>Búsqueda Avanzada</h4>
              <p>Filtros y consultas específicas</p>
            </div>
          </button>

          <button 
            className="action-btn"
            onClick={() => setCurrentView('exports')}
          >
            <span className="action-icon">📊</span>
            <div className="action-content">
              <h4>Exportar Datos</h4>
              <p>PDF, Excel y más formatos</p>
            </div>
          </button>
        </div>
      </div>

      <div className="recent-activity">
        <h3>📝 Actividad Reciente</h3>
        <div className="activity-list">
          <div className="activity-item">
            <span className="activity-icon">📈</span>
            <div className="activity-content">
              <p><strong>Compra procesada</strong> - COMP-20250709-001</p>
              <span className="activity-time">Hace 2 horas</span>
            </div>
          </div>
          
          <div className="activity-item">
            <span className="activity-icon">📊</span>
            <div className="activity-content">
              <p><strong>Reporte generado</strong> - Ventas diciembre 2024</p>
              <span className="activity-time">Hace 4 horas</span>
            </div>
          </div>
          
          <div className="activity-item">
            <span className="activity-icon">📤</span>
            <div className="activity-content">
              <p><strong>Exportación completada</strong> - Movimientos.xlsx</p>
              <span className="activity-time">Hace 6 horas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="inventory-container">
        <div className="no-results">
          <div className="no-results-icon">🔒</div>
          <h3>Acceso Restringido</h3>
          <p>Solo los administradores pueden acceder a los reportes del sistema.</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/dashboard')}
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="inventory-container">
        <div className="loading-spinner">Cargando reportes...</div>
      </div>
    );
  }

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <div className="header-actions">
          <button 
            className="btn btn-secondary back-btn"
            onClick={() => navigate('/dashboard')}
            title="Volver al Dashboard"
          >
            ← Volver al Dashboard
          </button>
        </div>
        <div className="header-title">
          <h1>📊 Centro de Reportes</h1>
          <p>Historial, estadísticas y análisis del sistema de inventario</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={loadDashboardStats}
            title="Actualizar estadísticas"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      <div className="reports-navigation">
        <nav className="reports-nav">
          <button 
            className={`nav-btn ${currentView === 'overview' ? 'active' : ''}`}
            onClick={() => setCurrentView('overview')}
          >
            <span className="nav-icon">🏠</span>
            Resumen
          </button>
          
          <button 
            className={`nav-btn ${currentView === 'movements' ? 'active' : ''}`}
            onClick={() => setCurrentView('movements')}
          >
            <span className="nav-icon">📈</span>
            Historial de Movimientos
          </button>
          
          <button 
            className={`nav-btn ${currentView === 'transactions' ? 'active' : ''}`}
            onClick={() => setCurrentView('transactions')}
          >
            <span className="nav-icon">💼</span>
            Reportes de Transacciones
          </button>
          
          <button 
            className={`nav-btn ${currentView === 'search' ? 'active' : ''}`}
            onClick={() => setCurrentView('search')}
          >
            <span className="nav-icon">🔍</span>
            Búsqueda Avanzada
          </button>
          
          <button 
            className={`nav-btn ${currentView === 'exports' ? 'active' : ''}`}
            onClick={() => setCurrentView('exports')}
          >
            <span className="nav-icon">📊</span>
            Exportar Datos
          </button>
        </nav>
      </div>

      <div className="reports-content">
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default Reports;