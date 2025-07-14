import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useReports } from '../../hooks/useReports';
import {
  TransactionReport,
  ReportType,
  ReportStatus,
  ReportSearchFilters
} from '../../interfaces/Report';
import { 
  MovementFilters, 
  MovementType, 
  MovementSortField 
} from '../../interfaces/Movement';
import { searchMovements } from '../../services/movementHistoryService';
import { 
  translateReportType, 
  translateReportStatus, 
  translateTransactionType,
  getStatusColorClass,
  formatCurrencySpanish 
} from '../../utils/translationUtils';
import ReportModal from './ReportModal';

interface AdvancedSearchProps {}

type SearchType = 'reports' | 'movements';

interface SearchPresets {
  name: string;
  description: string;
  filters: any;
  type: SearchType;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = () => {
  const { currentUser } = useAuth();
  const { 
    reports, 
    loading: reportsLoading, 
    error: reportsError, 
    searchReportsByFilters, 
    clearError 
  } = useReports();

  const [searchType, setSearchType] = useState<SearchType>('reports');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [reportFilters, setReportFilters] = useState<ReportSearchFilters>({
    types: [],
    statuses: [],
    generatedBy: [],
    searchTerm: '',
    sortBy: 'generatedAt',
    sortOrder: 'desc',
    pageSize: 20
  });

  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [selectedReportStatus, setSelectedReportStatus] = useState<string>('');

  const [movementFilters, setMovementFilters] = useState<MovementFilters>({
    movementType: 'all',
    sortBy: MovementSortField.DATE,
    sortOrder: 'desc',
    pageSize: 50
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SearchPresets[]>([]);
  const [searchName, setSearchName] = useState('');
  const [showSaveSearch, setShowSaveSearch] = useState(false);

  const searchPresets: SearchPresets[] = [
    {
      name: 'Reportes de este mes',
      description: 'Todos los reportes generados en el mes actual',
      type: 'reports',
      filters: {
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        endDate: new Date(),
        statuses: [ReportStatus.COMPLETED]
      }
    },
    {
      name: 'Movimientos de ventas recientes',
      description: 'Movimientos de venta de los últimos 7 días',
      type: 'movements',
      filters: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        movementType: MovementType.SALE
      }
    },
    {
      name: 'Compras grandes',
      description: 'Movimientos de compra superiores a $100.000',
      type: 'movements',
      filters: {
        movementType: MovementType.PURCHASE,
        minAmount: 100000
      }
    },
    {
      name: 'Movimientos recientes',
      description: 'Todos los movimientos de los últimos 30 días',
      type: 'movements',
      filters: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      }
    }
  ];

  useEffect(() => {
    const newTypes = selectedReportType ? [selectedReportType as ReportType] : [];
    const newStatuses = selectedReportStatus ? [selectedReportStatus as ReportStatus] : [];
    
    setReportFilters(prev => ({
      ...prev,
      types: newTypes,
      statuses: newStatuses
    }));
  }, [selectedReportType, selectedReportStatus]);

  useEffect(() => {
    if (searchType === 'reports' && reports.length > 0) {
      console.log('📊 Actualizando resultados de reportes:', reports.length);
      setSearchResults(reports);
    }
  }, [reports, searchType]);

  useEffect(() => {
    if (reportsError) {
      setError(reportsError);
      const timer = setTimeout(() => {
        clearError();
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [reportsError, clearError]);

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = () => {
    const saved = localStorage.getItem('advancedSearches');
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved));
      } catch (err) {
        console.error('Error cargando búsquedas guardadas:', err);
      }
    }
  };

  const saveSearch = () => {
    if (!searchName.trim()) {
      alert('Ingresa un nombre para la búsqueda');
      return;
    }

    let filters: any;
    switch (searchType) {
      case 'reports':
        filters = reportFilters;
        break;
      case 'movements':
        filters = movementFilters;
        break;
    }

    const newSearch: SearchPresets = {
      name: searchName,
      description: `Búsqueda personalizada de ${searchType}`,
      type: searchType,
      filters
    };

    const updatedSearches = [...savedSearches, newSearch];
    setSavedSearches(updatedSearches);
    localStorage.setItem('advancedSearches', JSON.stringify(updatedSearches));
    
    setSearchName('');
    setShowSaveSearch(false);
    alert('Búsqueda guardada exitosamente');
  };

  const loadPreset = (preset: SearchPresets) => {
    setSearchType(preset.type);
    
    switch (preset.type) {
      case 'reports':
        setReportFilters(prev => ({ ...prev, ...preset.filters }));
        if (preset.filters.types && preset.filters.types.length > 0) {
          setSelectedReportType(preset.filters.types[0]);
        }
        if (preset.filters.statuses && preset.filters.statuses.length > 0) {
          setSelectedReportStatus(preset.filters.statuses[0]);
        }
        break;
      case 'movements':
        setMovementFilters(prev => ({ ...prev, ...preset.filters }));
        break;
    }
  };

  const executeSearch = async () => {
    try {
      setSearching(true);
      setError(null);
      setSearchResults([]);

      console.log(`🔍 Ejecutando búsqueda de tipo: ${searchType}`);

      switch (searchType) {
        case 'reports':
          await searchReports();
          break;
        case 'movements':
          await searchMovementsData();
          break;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error en búsqueda';
      setError(errorMessage);
      console.error('❌ Error en búsqueda:', err);
    } finally {
      setSearching(false);
    }
  };

  const searchReports = async () => {
    try {
      console.log('📊 Buscando reportes con filtros:', reportFilters);
      await searchReportsByFilters(reportFilters);
      console.log('✅ Búsqueda de reportes completada');
    } catch (error) {
      console.error('❌ Error buscando reportes:', error);
      throw error;
    }
  };

  const searchMovementsData = async () => {
    try {
      console.log('📈 Buscando movimientos con filtros:', movementFilters);
      const result = await searchMovements(movementFilters);
      setSearchResults(result.movements);
      console.log(`✅ ${result.movements.length} movimientos encontrados`);
    } catch (error) {
      console.error('❌ Error buscando movimientos:', error);
      throw error;
    }
  };

  const clearAllFilters = () => {
    switch (searchType) {
      case 'reports':
        setReportFilters({
          types: [],
          statuses: [],
          generatedBy: [],
          searchTerm: '',
          sortBy: 'generatedAt',
          sortOrder: 'desc',
          pageSize: 20
        });
        setSelectedReportType('');
        setSelectedReportStatus('');
        break;
      case 'movements':
        setMovementFilters({
          movementType: 'all',
          sortBy: MovementSortField.DATE,
          sortOrder: 'desc',
          pageSize: 50
        });
        break;
    }
    setSearchResults([]);
    setError(null);
  };

  const handleSearchTypeChange = (newType: SearchType) => {
    setSearchType(newType);
    setSearchResults([]);
    setError(null);
    console.log(`🔄 Cambiando tipo de búsqueda a: ${newType}`);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
      case 'success': return 'success';
      case 'generating':
      case 'pending': return 'warning';
      case 'failed':
      case 'error': return 'danger';
      default: return 'secondary';
    }
  };

  const renderSearchTypeSelector = () => (
    <div className="search-type-selector">
      <h3>🔍 Tipo de Búsqueda</h3>
      <div className="type-buttons">
        <button 
          className={`type-btn ${searchType === 'reports' ? 'active' : ''}`}
          onClick={() => handleSearchTypeChange('reports')}
        >
          <span className="type-icon">📊</span>
          <div>
            <strong>Reportes</strong>
            <small>Buscar en reportes generados</small>
          </div>
        </button>

        <button 
          className={`type-btn ${searchType === 'movements' ? 'active' : ''}`}
          onClick={() => handleSearchTypeChange('movements')}
        >
          <span className="type-icon">📈</span>
          <div>
            <strong>Movimientos</strong>
            <small>Historial de stock</small>
          </div>
        </button>
      </div>
    </div>
  );

  const renderReportFilters = () => (
    <div className="filter-section">
      <div className="filter-controls">
        <div className="form-group">
          <label>Buscar en título/descripción:</label>
          <input
            type="text"
            value={reportFilters.searchTerm || ''}
            onChange={(e) => setReportFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            placeholder="Buscar reportes..."
            className="search-input"
          />
        </div>

        <div className="form-group">
          <label>Tipo de reporte:</label>
          <select
            value={selectedReportType}
            onChange={(e) => setSelectedReportType(e.target.value)}
            className="filter-select"
          >
            <option value="">📋 Todos los tipos</option>
            <option value={ReportType.SALES}>📈 Ventas</option>
            <option value={ReportType.PURCHASES}>📉 Compras</option>
            <option value={ReportType.COMBINED}>📊 Combinado</option>
            <option value={ReportType.FINANCIAL_SUMMARY}>💰 Resumen Financiero</option>
          </select>
        </div>

        <div className="form-group">
          <label>Estado:</label>
          <select
            value={selectedReportStatus}
            onChange={(e) => setSelectedReportStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">🔄 Todos los estados</option>
            <option value={ReportStatus.COMPLETED}>✅ Completado</option>
            <option value={ReportStatus.GENERATING}>🔄 Generando</option>
            <option value={ReportStatus.FAILED}>❌ Error</option>
            <option value={ReportStatus.PENDING}>⏳ Pendiente</option>
          </select>
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="advanced-filters">
          <div className="filter-controls">
            <div className="form-group">
              <label>Fecha desde:</label>
              <input
                type="date"
                value={reportFilters.startDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setReportFilters(prev => ({ 
                  ...prev, 
                  startDate: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                className="filter-select"
              />
            </div>

            <div className="form-group">
              <label>Fecha hasta:</label>
              <input
                type="date"
                value={reportFilters.endDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setReportFilters(prev => ({ 
                  ...prev, 
                  endDate: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                className="filter-select"
              />
            </div>

            <div className="form-group">
              <label>Ordenar por:</label>
              <select
                value={reportFilters.sortBy || 'generatedAt'}
                onChange={(e) => setReportFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                className="filter-select"
              >
                <option value="generatedAt">📅 Fecha de generación</option>
                <option value="title">📝 Título</option>
                <option value="type">📊 Tipo</option>
                <option value="status">🔄 Estado</option>
              </select>
            </div>

            <div className="form-group">
              <label>Orden:</label>
              <select
                value={reportFilters.sortOrder || 'desc'}
                onChange={(e) => setReportFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
                className="filter-select"
              >
                <option value="desc">⬇️ Descendente</option>
                <option value="asc">⬆️ Ascendente</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderMovementFilters = () => (
    <div className="filter-section">
      <div className="filter-controls">
        <div className="form-group">
          <label>Buscar producto/código:</label>
          <input
            type="text"
            value={movementFilters.searchTerm || ''}
            onChange={(e) => setMovementFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            placeholder="Código o nombre del producto..."
            className="search-input"
          />
        </div>

        <div className="form-group">
          <label>Tipo de movimiento:</label>
          <select
            value={movementFilters.movementType || 'all'}
            onChange={(e) => setMovementFilters(prev => ({ 
              ...prev, 
              movementType: e.target.value === 'all' ? 'all' : e.target.value as MovementType 
            }))}
            className="filter-select"
          >
            <option value="all">📋 Todos los tipos</option>
            <option value={MovementType.PURCHASE}>📦 Compras</option>
            <option value={MovementType.SALE}>💰 Ventas</option>
          </select>
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="advanced-filters">
          <div className="filter-controls">
            <div className="form-group">
              <label>Fecha desde:</label>
              <input
                type="date"
                value={movementFilters.startDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setMovementFilters(prev => ({ 
                  ...prev, 
                  startDate: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                className="filter-select"
              />
            </div>

            <div className="form-group">
              <label>Fecha hasta:</label>
              <input
                type="date"
                value={movementFilters.endDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setMovementFilters(prev => ({ 
                  ...prev, 
                  endDate: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                className="filter-select"
              />
            </div>

            <div className="form-group">
              <label>Monto mínimo:</label>
              <input
                type="number"
                value={movementFilters.minAmount || ''}
                onChange={(e) => setMovementFilters(prev => ({ 
                  ...prev, 
                  minAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
                placeholder="0"
                className="filter-select"
              />
            </div>

            <div className="form-group">
              <label>Monto máximo:</label>
              <input
                type="number"
                value={movementFilters.maxAmount || ''}
                onChange={(e) => setMovementFilters(prev => ({ 
                  ...prev, 
                  maxAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
                placeholder="Sin límite"
                className="filter-select"
              />
            </div>

            <div className="form-group">
              <label>Usuario:</label>
              <input
                type="text"
                value={movementFilters.userId || ''}
                onChange={(e) => setMovementFilters(prev => ({ ...prev, userId: e.target.value }))}
                placeholder="Email del usuario..."
                className="filter-select"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPresets = () => (
    <div className="presets-section">
      <h3>⚡ Búsquedas Rápidas</h3>
      <div className="presets-grid">
        {searchPresets.filter(preset => preset.type === searchType).map((preset, index) => (
          <button
            key={index}
            className="preset-btn"
            onClick={() => loadPreset(preset)}
          >
            <strong>{preset.name}</strong>
            <small>{preset.description}</small>
          </button>
        ))}
      </div>

      {savedSearches.filter(search => search.type === searchType).length > 0 && (
        <>
          <h4>💾 Búsquedas Guardadas</h4>
          <div className="presets-grid">
            {savedSearches.filter(search => search.type === searchType).map((search, index) => (
              <button
                key={index}
                className="preset-btn saved"
                onClick={() => loadPreset(search)}
              >
                <strong>{search.name}</strong>
                <small>{search.description}</small>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderResults = () => {
    if (searching) {
      return (
        <div className="loading-section">
          <div className="loading-spinner">
            <span>🔄</span>
            <p>Buscando {searchType}...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-section">
          <div className="error-icon">⚠️</div>
          <h3>Error en la búsqueda</h3>
          <p>{error}</p>
          <button 
            className="btn btn-primary"
            onClick={() => setError(null)}
          >
            Reintentar
          </button>
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>No se encontraron resultados</h3>
          <p>Prueba ajustando los filtros de búsqueda o ejecuta una nueva búsqueda.</p>
          <button 
            className="btn btn-primary"
            onClick={executeSearch}
          >
            🔍 Buscar
          </button>
        </div>
      );
    }

    return (
      <div className="search-results">
        <div className="results-header">
          <h3>📋 Resultados de Búsqueda</h3>
          <p>Se encontraron <strong>{searchResults.length}</strong> resultados para <strong>{searchType}</strong></p>
        </div>

        <div className="table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                {searchType === 'reports' && (
                  <>
                    <th>Título</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Generado</th>
                    <th>Acciones</th>
                  </>
                )}
                {searchType === 'movements' && (
                  <>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Valor</th>
                    <th>Usuario</th>
                    <th>Acciones</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {searchResults.map((item, index) => (
                <tr key={index}>
                  {searchType === 'reports' && (
                    <>
                      <td>
                        <div className="item-title">
                          <strong>{(item as TransactionReport).title}</strong>
                          <small>{(item as TransactionReport).description}</small>
                        </div>
                      </td>
                      <td>
                        <span className="status-badge secondary">
                          {(item as TransactionReport).type}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusColor((item as TransactionReport).status)}`}>
                          {(item as TransactionReport).status}
                        </span>
                      </td>
                      <td>
                        <div className="date-cell">
                          <span>{(item as TransactionReport).generatedAt.toLocaleDateString('es-CL')}</span>
                          <small>{(item as TransactionReport).generatedAt.toLocaleTimeString('es-CL')}</small>
                        </div>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-info"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDetailsModal(true);
                          }}
                          title="Ver detalles"
                        >
                          👁️
                        </button>
                      </td>
                    </>
                  )}
                  {searchType === 'movements' && (
                    <>
                      <td>
                        <div className="date-cell">
                          <span>{(item as any).date?.toLocaleDateString('es-CL') || 'Sin fecha'}</span>
                          <small>{(item as any).date?.toLocaleTimeString('es-CL') || ''}</small>
                        </div>
                      </td>
                      <td>
                        <div className="product-cell">
                          <strong>{(item as any).productName || 'Sin nombre'}</strong>
                          <small>{(item as any).productCode || 'Sin código'}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusColor((item as any).type || '')}`}>
                          {(item as any).type || 'Sin tipo'}
                        </span>
                      </td>
                      <td>
                        <span className="quantity-badge">
                          {(item as any).quantity || 0}
                        </span>
                      </td>
                      <td>
                        <span className="price-text">
                          {(item as any).totalValue ? formatCurrency((item as any).totalValue) : '-'}
                        </span>
                      </td>
                      <td>
                        <div className="user-cell">
                          <span>{(item as any).userName || 'Sin usuario'}</span>
                          <small>{(item as any).userEmail || ''}</small>
                        </div>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-info"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDetailsModal(true);
                          }}
                          title="Ver detalles"
                        >
                          👁️
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="advanced-search">
      <style>{`
        .advanced-search {
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          background: #f8fafc;
          min-height: 100vh;
          position: relative;
        }
        
        .advanced-search-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
          position: relative;
          z-index: 1;
          margin-bottom: 0;
        }
        
        .search-results-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
          position: relative;
          z-index: 10;
          margin-top: 8px;
          animation: fadeInUp 0.4s ease-out;
        }
        
        .search-state-section {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
          position: relative;
          z-index: 10;
          margin-top: 8px;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .search-input {
          background: linear-gradient(to right, #ffffff 0%, #f8fafc 100%);
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 50px 12px 16px;
          transition: all 0.2s ease;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3e%3ccircle cx='11' cy='11' r='8'/%3e%3cpath d='m21 21-4.35-4.35'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 16px center;
          background-size: 20px;
          width: 100%;
          font-family: inherit;
        }
        
        .search-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          background-color: white;
          outline: none;
        }
        
        .filter-select {
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
          background: linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%);
          transition: all 0.2s ease;
          width: 100%;
          font-family: inherit;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=US-ASCII,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'><path fill='%23666' d='M2 0L0 2h4zm0 5L0 3h4z'/></svg>");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 12px;
          padding-right: 40px;
        }
        
        .filter-select:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          background-color: white;
          outline: none;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 16px;
        }
        
        .form-group label {
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
          display: block;
          font-size: 0.875rem;
        }
        
        .filter-controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .advanced-filters {
          border-top: 2px solid #f1f5f9;
          padding-top: 20px;
          margin-top: 20px;
          animation: slideDown 0.3s ease-out;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .type-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
          font-family: inherit;
          width: 100%;
        }
        
        .type-btn:hover {
          transform: translateY(-2px);
          border-color: #6366f1;
          background: white;
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.15);
        }
        
        .type-btn.active {
          border-color: #6366f1;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
        }
        
        .type-icon {
          font-size: 2.5rem;
          transition: transform 0.3s ease;
          min-width: 60px;
          text-align: center;
        }
        
        .type-btn.active .type-icon {
          transform: scale(1.1);
        }
        
        .type-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }
        
        .search-actions {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 2px solid #f1f5f9;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border-radius: 8px;
          padding: 20px;
        }
        
        .search-actions .btn {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }
        
        .search-actions .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .search-actions .btn-primary {
          font-size: 1rem;
          font-weight: 700;
          padding: 14px 32px;
        }
        
        @media (max-width: 768px) {
          .search-actions {
            flex-direction: column;
            gap: 8px;
          }
          
          .search-actions .btn {
            width: 100%;
            max-width: 300px;
          }
        }
      `}</style>

      <div className="advanced-search-section">
        <div className="section-header">
          <h2>🔍 Búsqueda Avanzada</h2>
          <div className="header-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowSaveSearch(true)}
              disabled={searchResults.length === 0}
            >
              💾 Guardar Búsqueda
            </button>
            
            <button 
              className="btn btn-primary"
              onClick={executeSearch}
              disabled={searching}
            >
              {searching ? '🔄 Buscando...' : '🔍 Buscar'}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-messages">
            <p className="error-message">⚠️ {error}</p>
          </div>
        )}
      </div>

      <div className="advanced-search-section">
        {renderSearchTypeSelector()}
      </div>

      <div className="advanced-search-section">
        {renderPresets()}
      </div>

      <div className="advanced-search-section">
        <div className="filters-header">
          <h3>⚙️ Filtros de Búsqueda</h3>
          <div className="filter-actions">
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              {showAdvancedFilters ? '▲ Ocultar Avanzados' : '▼ Mostrar Avanzados'}
            </button>
            <button 
              className="btn btn-sm btn-secondary"
              onClick={clearAllFilters}
            >
              🗑️ Limpiar
            </button>
          </div>
        </div>

        {searchType === 'reports' && renderReportFilters()}
        {searchType === 'movements' && renderMovementFilters()}

        <div className="search-actions">
          <button 
            className="btn btn-secondary"
            onClick={clearAllFilters}
          >
            🗑️ Limpiar Todos los Filtros
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={executeSearch}
            disabled={searching}
            style={{ minWidth: '200px' }}
          >
            {searching ? '🔄 Buscando...' : '🔍 Ejecutar Búsqueda'}
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => setShowSaveSearch(true)}
            disabled={searchResults.length === 0}
          >
            💾 Guardar
          </button>
        </div>
      </div>

      {(searching || error || searchResults.length > 0) && (
        <div className="search-results-section">
          {renderResults()}
        </div>
      )}

      {!searching && !error && searchResults.length === 0 && (
        <div className="search-state-section">
          <div className="no-results-icon">🔍</div>
          <h3>Listo para buscar</h3>
          <p>Configura los filtros y presiona el botón "Buscar" para ver los resultados.</p>
          <button 
            className="btn btn-primary"
            onClick={executeSearch}
          >
            🔍 Buscar
          </button>
        </div>
      )}

      {showSaveSearch && (
        <ReportModal
          title="💾 Guardar Búsqueda"
          onClose={() => setShowSaveSearch(false)}
        >
          <div className="save-search-form">
            <div className="form-group">
              <label>Nombre de la búsqueda:</label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Ej: Ventas del último trimestre"
                className="filter-select"
                autoFocus
              />
            </div>
            
            <div className="search-preview">
              <h4>📋 Filtros actuales:</h4>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: '10px', 
                borderRadius: '4px', 
                fontSize: '12px',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {JSON.stringify(
                  searchType === 'reports' ? reportFilters : movementFilters, 
                  null, 2
                )}
              </pre>
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowSaveSearch(false)}
            >
              Cancelar
            </button>
            <button 
              className="btn btn-primary"
              onClick={saveSearch}
              disabled={!searchName.trim()}
            >
              💾 Guardar
            </button>
          </div>
        </ReportModal>
      )}

      {selectedItem && showDetailsModal && (
  <ReportModal
    title="📋 Detalles del Elemento"
    onClose={() => setShowDetailsModal(false)}
  >
    <div className="item-details">
      <table className="details-table">
        <thead>
          <tr>
            <th>Campo</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>ID</strong></td>
            <td>{selectedItem.id}</td>
          </tr>
          <tr>
            <td><strong>Fecha</strong></td>
            <td>{new Date(selectedItem.date).toLocaleString()}</td>
          </tr>
          <tr>
            <td><strong>Producto</strong></td>
            <td>{selectedItem.productName}</td>
          </tr>
          <tr>
            <td><strong>Código de Producto</strong></td>
            <td>{selectedItem.productCode}</td>
          </tr>
          <tr>
            <td><strong>Stock Resultante</strong></td>
            <td>{selectedItem.resultingStock}</td>
          </tr>
          <tr>
            <td><strong>Tipo</strong></td>
            <td>{selectedItem.type}</td>
          </tr>
          <tr>
            <td><strong>Cantidad</strong></td>
            <td>{selectedItem.quantity}</td>
          </tr>
          <tr>
            <td><strong>Valor Total</strong></td>
            <td>{formatCurrency(selectedItem.totalValue)}</td>
          </tr>
          <tr>
            <td><strong>Usuario</strong></td>
            <td>{selectedItem.userName}</td>
          </tr>
          <tr>
            <td><strong>Email Usuario</strong></td>
            <td>{selectedItem.userEmail}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </ReportModal>
)}

    </div>
  );
};

export default AdvancedSearch;