import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MovementHistory from './MovementHistory';
import TransactionReports from './TransactionReports';
import AdvancedSearch from './AdvancedSearch';
import { getTokenStatistics, cleanupExpiredTokens } from '../../services/tokenService'; 
import './Reports.css';

type ReportView = 'overview' | 'movements' | 'transactions' | 'search';

interface DashboardStats {
  totalMovements: number;
  totalReports: number;
  totalTokens: number;
  activeTokens: number;
  expiredTokens: number;
  totalDownloads: number;
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
    totalTokens: 0,
    activeTokens: 0,
    expiredTokens: 0,
    totalDownloads: 0,
    lastUpdate: new Date()
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      
      const tokenStats = await getTokenStatistics();
      
      let realMovementCount = 0;
      let realReportCount = 0;
      
      try {
        const { getDocs, collection, query, orderBy } = await import('firebase/firestore');
        const { db } = await import('../../firebase/config');
        
        console.log('📊 Contando movimientos en stockMovements...');
        const movementsQuery = query(
          collection(db, 'stockMovements'),
          orderBy('createdAt', 'desc')
        );
        const movementsSnapshot = await getDocs(movementsQuery);
        realMovementCount = movementsSnapshot.size;
        
        console.log('📊 Movimientos encontrados:', realMovementCount);
        
        console.log('📋 Contando reportes...');
        const reportsQuery = query(
          collection(db, 'reports'),
          orderBy('generatedAt', 'desc')
        );
        const reportsSnapshot = await getDocs(reportsQuery);
        realReportCount = reportsSnapshot.size;
        
        console.log('📋 Reportes encontrados:', realReportCount);
        
      } catch (firestoreError) {
        console.warn('⚠️ Error obteniendo estadísticas directas de Firestore:', firestoreError);
        
        try {
          console.log('🔄 Usando servicios como fallback...');
          const { searchMovements } = await import('../../services/movementHistoryService');
          
          const result = await searchMovements({
            movementType: 'all',
            pageSize: 10000,
            page: 1
          });
          
          realMovementCount = result.totalCount;
          console.log('📊 Movimientos desde servicio:', realMovementCount);
          
        } catch (serviceError) {
          console.warn('⚠️ Error usando servicio de movimientos:', serviceError);
          realMovementCount = 0;
        }
        
        try {
          const { getRecentReports } = await import('../../services/reportService');
          const reports = await getRecentReports(1000);
          realReportCount = reports.length;
          console.log('📋 Reportes desde servicio:', realReportCount);
        } catch (serviceError) {
          console.warn('⚠️ Error usando servicio de reportes:', serviceError);
          realReportCount = 0;
        }
      }
      
      setStats({
        totalMovements: realMovementCount, 
        totalReports: realReportCount,     
        totalTokens: tokenStats.totalTokens,
        activeTokens: tokenStats.activeTokens,
        expiredTokens: tokenStats.expiredTokens,
        totalDownloads: tokenStats.totalDownloads,
        lastUpdate: new Date()
      });
      
      console.log('✅ Estadísticas actualizadas:', {
        movimientos: realMovementCount,
        reportes: realReportCount,
        tokens: tokenStats.totalTokens
      });
      
    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
      setStats(prev => ({
        ...prev,
        totalMovements: 0,
        totalReports: 0,
        lastUpdate: new Date()
      }));
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    console.log('🔄 Refrescando estadísticas manualmente...');
    await loadDashboardStats();
  };

  const handleCleanupTokens = async () => {
    try {
      console.log('🧹 Iniciando limpieza de tokens...');
      const deletedCount = await cleanupExpiredTokens();
      
      if (deletedCount > 0) {
        alert(`✅ Se eliminaron ${deletedCount} tokens expirados.`);
        await loadDashboardStats();
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
            <p className="stat-description">
              {stats.totalMovements === 0 ? 'No hay movimientos registrados' : 'Total registrados'}
            </p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>Reportes Generados</h3>
            <p className="stat-number">{stats.totalReports}</p>
            <p className="stat-description">
              {stats.totalReports === 0 ? 'No hay reportes' : 'Total creados'}
            </p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🔗</div>
          <div className="stat-content">
            <h3>Enlaces Activos</h3>
            <p className="stat-number">{stats.activeTokens}</p>
            <p className="stat-description">Tokens válidos</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📥</div>
          <div className="stat-content">
            <h3>Descargas Totales</h3>
            <p className="stat-number">{stats.totalDownloads}</p>
            <p className="stat-description">Realizadas</p>
          </div>
        </div>
      </div>

      <div className="stats-info">
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '12px 16px',
          margin: '16px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <p style={{ margin: '0', fontSize: '0.9em', color: '#0c4a6e' }}>
              📊 <strong>Última actualización:</strong> {stats.lastUpdate.toLocaleString('es-CL')}
            </p>
            <p style={{ margin: '0', fontSize: '0.8em', color: '#0369a1' }}>
              Las estadísticas se obtienen directamente desde Firebase Firestore
            </p>
          </div>
          <button 
            className="btn btn-sm btn-primary"
            onClick={refreshStats}
            disabled={loading}
            style={{ minWidth: '120px' }}
          >
            {loading ? '🔄 Cargando...' : '🔄 Actualizar'}
          </button>
        </div>
      </div>

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
              <h4>Historial de Movimientos</h4>
              <p>Ver {stats.totalMovements.toLocaleString()} movimientos registrados</p>
            </div>
          </button>

          <button 
            className="action-btn"
            onClick={() => setCurrentView('transactions')}
          >
            <span className="action-icon">💼</span>
            <div className="action-content">
              <h4>Reportes de Transacciones</h4>
              <p>Generar y ver {stats.totalReports} reportes</p>
            </div>
          </button>

          <button 
            className="action-btn"
            onClick={() => setCurrentView('search')}
          >
            <span className="action-icon">🔍</span>
            <div className="action-content">
              <h4>Búsqueda Avanzada</h4>
              <p>Buscar en reportes y movimientos</p>
            </div>
          </button>

          <button 
            className="action-btn"
            onClick={handleCleanupTokens}
            disabled={stats.expiredTokens === 0}
          >
            <span className="action-icon">🧹</span>
            <div className="action-content">
              <h4>Mantener Sistema</h4>
              <p>Limpiar {stats.expiredTokens} tokens expirados</p>
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
              <p><strong>Sistema actualizado</strong> - Conteo corregido desde Firebase</p>
              <span className="activity-time">{stats.lastUpdate.toLocaleTimeString('es-CL')}</span>
            </div>
          </div>
          
          {stats.totalReports > 0 && (
            <div className="activity-item">
              <span className="activity-icon">📊</span>
              <div className="activity-content">
                <p><strong>Reportes disponibles</strong> - {stats.totalReports} reportes generados</p>
                <span className="activity-time">Sistema</span>
              </div>
            </div>
          )}
          
          {stats.totalMovements > 0 && (
            <div className="activity-item">
              <span className="activity-icon">📈</span>
              <div className="activity-content">
                <p><strong>Movimientos registrados</strong> - {stats.totalMovements.toLocaleString()} movimientos de stock</p>
                <span className="activity-time">Base de datos</span>
              </div>
            </div>
          )}
          
          {stats.activeTokens > 0 && (
            <div className="activity-item">
              <span className="activity-icon">🔗</span>
              <div className="activity-content">
                <p><strong>Enlaces activos</strong> - {stats.activeTokens} tokens válidos</p>
                <span className="activity-time">Sistema de descarga</span>
              </div>
            </div>
          )}
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
        <div className="loading-spinner">
          <span style={{ fontSize: '3rem', animation: 'spin 1s linear infinite' }}>🔄</span>
          <p>Cargando estadísticas del sistema...</p>
        </div>
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
          <p>Sistema integrado de historial, reportes y búsqueda con estadísticas en tiempo real</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={refreshStats}
            disabled={loading}
            title="Actualizar estadísticas"
          >
            {loading ? '🔄 Actualizando...' : '🔄 Actualizar'}
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
        </nav>
      </div>

      <div className="reports-content">
        {renderCurrentView()}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .stats-info {
          margin: 16px 0;
        }
        
        .loading-spinner {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        
        .loading-spinner p {
          margin: 16px 0 0 0;
          color: #64748b;
          font-size: 1.125rem;
          font-weight: 500;
        }
        
        .integration-info {
          margin: 20px 0;
          padding: 24px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
        }
        
        .integration-info h3 {
          margin: 0 0 20px 0;
          color: #1e293b;
          font-size: 1.25rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .integration-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }
        
        .integration-card {
          padding: 20px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #f8fafc;
        }
        
        .integration-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        
        .integration-icon {
          font-size: 1.5rem;
        }
        
        .integration-header h4 {
          margin: 0;
          color: #334155;
          font-size: 1rem;
          font-weight: 600;
        }
        
        .integration-card ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .integration-card li {
          margin: 8px 0;
          color: #475569;
          font-size: 0.875rem;
        }
        
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
      `}</style>
    </div>
  );
};

export default Reports;