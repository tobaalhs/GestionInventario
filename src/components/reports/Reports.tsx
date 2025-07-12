import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MovementHistory from './MovementHistory';
import TransactionReports from './TransactionReports';
import AdvancedSearch from './AdvancedSearch';
import ExportManager from './ExportManager';
import { getTokenStatistics, cleanupExpiredTokens } from '../../services/tokenService';
import './Reports.css';

type ReportView = 'overview' | 'movements' | 'transactions' | 'search' | 'exports';

interface DashboardStats {
  totalMovements: number;
  totalReports: number;
  pendingExports: number;
  lastUpdate: Date;
  // ✅ Nuevas estadísticas de tokens
  totalTokens: number;
  activeTokens: number;
  expiredTokens: number;
  totalDownloads: number;
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
    lastUpdate: new Date(),
    totalTokens: 0,
    activeTokens: 0,
    expiredTokens: 0,
    totalDownloads: 0
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      
      // ✅ Cargar estadísticas de tokens
      const tokenStats = await getTokenStatistics();
      
      // Aquí cargarías las estadísticas reales del resto
      // Por ahora usamos datos simulados para el ejemplo
      setStats({
        totalMovements: 1247,
        totalReports: 28,
        pendingExports: 3,
        lastUpdate: new Date(),
        totalTokens: tokenStats.totalTokens,
        activeTokens: tokenStats.activeTokens,
        expiredTokens: tokenStats.expiredTokens,
        totalDownloads: tokenStats.totalDownloads
      });
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Función para limpiar tokens expirados
  const handleCleanupTokens = async () => {
    try {
      console.log('🧹 Iniciando limpieza de tokens...');
      const deletedCount = await cleanupExpiredTokens();
      
      if (deletedCount > 0) {
        alert(`✅ Se eliminaron ${deletedCount} tokens expirados.`);
        await loadDashboardStats(); // Recargar estadísticas
      } else {
        alert('ℹ️ No hay tokens expirados para eliminar.');
      }
    } catch (error) {
      console.error('Error limpiando tokens:', error);
      alert('❌ Error al limpiar tokens expirados.');
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

      {/* ✅ Nueva sección de estadísticas de tokens */}
      <div className="token-stats-section">
        <h3>🔗 Gestión de Enlaces de Descarga</h3>
        <div className="token-stats-grid">
          <div className="token-stat-card">
            <div className="token-stat-icon">🎫</div>
            <div className="token-stat-content">
              <h4>Tokens Totales</h4>
              <p className="token-stat-number">{stats.totalTokens}</p>
              <p className="token-stat-description">Generados</p>
            </div>
          </div>
          
          <div className="token-stat-card active">
            <div className="token-stat-icon">✅</div>
            <div className="token-stat-content">
              <h4>Tokens Activos</h4>
              <p className="token-stat-number">{stats.activeTokens}</p>
              <p className="token-stat-description">Válidos</p>
            </div>
          </div>
          
          <div className="token-stat-card expired">
            <div className="token-stat-icon">⌛</div>
            <div className="token-stat-content">
              <h4>Tokens Expirados</h4>
              <p className="token-stat-number">{stats.expiredTokens}</p>
              <p className="token-stat-description">
                {stats.expiredTokens > 0 && (
                  <button 
                    onClick={handleCleanupTokens}
                    className="cleanup-btn"
                    title="Limpiar tokens expirados"
                  >
                    🧹 Limpiar
                  </button>
                )}
              </p>
            </div>
          </div>
          
          <div className="token-stat-card">
            <div className="token-stat-icon">📥</div>
            <div className="token-stat-content">
              <h4>Descargas Totales</h4>
              <p className="token-stat-number">{stats.totalDownloads}</p>
              <p className="token-stat-description">Realizadas</p>
            </div>
          </div>
        </div>
        
        <div className="token-info-panel">
          <h4>ℹ️ Información sobre Enlaces Seguros</h4>
          <ul>
            <li>Los enlaces de descarga por email incluyen tokens temporales de seguridad</li>
            <li>Los tokens expiran automáticamente después de 24 horas por defecto</li>
            <li>No se requiere autenticación para usar los enlaces con token válido</li>
            <li>El sistema realiza seguimiento de todas las descargas por seguridad</li>
          </ul>
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
              <p>PDF, Excel con enlaces seguros</p>
            </div>
          </button>
        </div>
      </div>

      <div className="recent-activity">
        <h3>📝 Actividad Reciente</h3>
        <div className="activity-list">
          <div className="activity-item">
            <span className="activity-icon">🔗</span>
            <div className="activity-content">
              <p><strong>Token de descarga creado</strong> - Reporte de ventas Q4</p>
              <span className="activity-time">Hace 30 minutos</span>
            </div>
          </div>
          
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
              <p><strong>Email enviado</strong> - Reporte con enlace seguro</p>
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
        <div className="loading-spinner">Cargando reportes y estadísticas de tokens...</div>
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
          <p>Historial, estadísticas y análisis del sistema de inventario con enlaces seguros</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={loadDashboardStats}
            title="Actualizar estadísticas"
          >
            🔄 Actualizar
          </button>
          {stats.expiredTokens > 0 && (
            <button 
              className="btn btn-warning"
              onClick={handleCleanupTokens}
              title="Limpiar tokens expirados"
            >
              🧹 Limpiar Tokens ({stats.expiredTokens})
            </button>
          )}
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
      
      {/* ✅ Estilos adicionales para los tokens */}
      <style>{`
        .token-stats-section {
          margin: 20px 0;
          padding: 20px;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .token-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin: 15px 0;
        }
        
        .token-stat-card {
          display: flex;
          align-items: center;
          padding: 15px;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          background: #f8f9fa;
        }
        
        .token-stat-card.active {
          border-color: #28a745;
          background: #d4edda;
        }
        
        .token-stat-card.expired {
          border-color: #ffc107;
          background: #fff3cd;
        }
        
        .token-stat-icon {
          font-size: 24px;
          margin-right: 12px;
        }
        
        .token-stat-content h4 {
          margin: 0 0 5px 0;
          font-size: 14px;
          color: #495057;
        }
        
        .token-stat-number {
          font-size: 20px;
          font-weight: bold;
          margin: 0;
          color: #212529;
        }
        
        .token-stat-description {
          font-size: 12px;
          color: #6c757d;
          margin: 0;
        }
        
        .cleanup-btn {
          background: #ffc107;
          color: #212529;
          border: none;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          cursor: pointer;
        }
        
        .cleanup-btn:hover {
          background: #e0a800;
        }
        
        .token-info-panel {
          margin-top: 20px;
          padding: 15px;
          background: #e7f3ff;
          border: 1px solid #b8daff;
          border-radius: 6px;
        }
        
        .token-info-panel h4 {
          margin: 0 0 10px 0;
          color: #004085;
        }
        
        .token-info-panel ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .token-info-panel li {
          margin: 5px 0;
          color: #004085;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default Reports;