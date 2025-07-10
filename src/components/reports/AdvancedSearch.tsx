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
import { searchExportHistory } from '../../services/exportService';
import ReportModal from './ReportModal';
import {
  ExportDataType,
  ExportFormat,
  ExportHistoryStatus,
  ExportHistoryFilters  // ⭐ IMPORTANTE: Asegúrate de importar este tipo
} from '../../interfaces/ExportConfig';

interface AdvancedSearchProps {}

type SearchType = 'reports' | 'movements' | 'exports';

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
    loading, 
    error, 
    searchReportsByFilters, 
    clearError 
  } = useReports();

  // Estados principales
  const [searchType, setSearchType] = useState<SearchType>('reports');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filtros para reportes
  const [reportFilters, setReportFilters] = useState<ReportSearchFilters>({
    types: [],
    statuses: [],
    generatedBy: [],
    searchTerm: '',
    sortBy: 'generatedAt',
    sortOrder: 'desc',
    pageSize: 20
  });

  // Filtros para movimientos
  const [movementFilters, setMovementFilters] = useState<MovementFilters>({
    movementType: 'all',
    sortBy: MovementSortField.DATE,
    sortOrder: 'desc',
    pageSize: 50
  });

  // Filtros para exportaciones
  const [exportFilters, setExportFilters] = useState<ExportHistoryFilters>({
  startDate: undefined,
  endDate: undefined,
  dataTypes: [],
  formats: [],
  exportedBy: [],
  configIds: [],
  statuses: [],
  minFileSize: undefined,
  maxFileSize: undefined,
  minRecordCount: undefined,
  maxRecordCount: undefined,
  searchTerm: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: undefined,
  pageSize: 20
});
  // Estados de UI
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SearchPresets[]>([]);
  const [searchName, setSearchName] = useState('');
  const [showSaveSearch, setShowSaveSearch] = useState(false);

  // Presets de búsqueda
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
      name: 'Exportaciones fallidas',
      description: 'Exportaciones que han fallado recientemente',
      type: 'exports',
      filters: {
        statuses: ['failed'],
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  ];

  useEffect(() => {
    loadSavedSearches();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const loadSavedSearches = () => {
    // Cargar búsquedas guardadas del localStorage
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
      case 'exports':
        filters = exportFilters;
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
        break;
      case 'movements':
        setMovementFilters(prev => ({ ...prev, ...preset.filters }));
        break;
      case 'exports':
        setExportFilters(prev => ({ ...prev, ...preset.filters }));
        break;
    }
  };

  const executeSearch = async () => {
    try {
      setSearching(true);
      setSearchResults([]);

      switch (searchType) {
        case 'reports':
          await searchReports();
          break;
        case 'movements':
            await searchMovementsData();
            break;
        case 'exports':
          await searchExports();
          break;
      }
    } catch (err) {
      console.error('Error en búsqueda:', err);
    } finally {
      setSearching(false);
    }
  };

  const searchReports = async () => {
    await searchReportsByFilters(reportFilters);
    setSearchResults(reports);
  };

  const searchMovementsData = async () => {
  const result = await searchMovements(movementFilters);
  setSearchResults(result.movements);
};

  const searchExports = async () => {
    const result = await searchExportHistory(exportFilters);
    setSearchResults(result.exports);
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
        break;
      case 'movements':
        setMovementFilters({
          movementType: 'all',
          sortBy: MovementSortField.DATE,
          sortOrder: 'desc',
          pageSize: 50
        });
        break;
      case 'exports':
        setExportFilters({
            startDate: undefined,
            endDate: undefined,
            dataTypes: [],
            formats: [],
            exportedBy: [],
            configIds: [],
            statuses: [],
            minFileSize: undefined,
            maxFileSize: undefined,
            minRecordCount: undefined,
            maxRecordCount: undefined,
            searchTerm: '',
            sortBy: 'createdAt',
            sortOrder: 'desc',
            page: undefined,
            pageSize: 20
        });
        break;
    }
    setSearchResults([]);
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
          onClick={() => setSearchType('reports')}
        >
          <span className="type-icon">📊</span>
          <div>
            <strong>Reportes</strong>
            <small>Buscar en reportes generados</small>
          </div>
        </button>

        <button 
          className={`type-btn ${searchType === 'movements' ? 'active' : ''}`}
          onClick={() => setSearchType('movements')}
        >
          <span className="type-icon">📈</span>
          <div>
            <strong>Movimientos</strong>
            <small>Historial de stock</small>
          </div>
        </button>

        <button 
          className={`type-btn ${searchType === 'exports' ? 'active' : ''}`}
          onClick={() => setSearchType('exports')}
        >
          <span className="type-icon">📤</span>
          <div>
            <strong>Exportaciones</strong>
            <small>Archivos exportados</small>
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
          <label>Tipos de reporte:</label>
          <select
            multiple
            value={reportFilters.types || []}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value as ReportType);
              setReportFilters(prev => ({ ...prev, types: values }));
            }}
            className="filter-select"
          >
            <option value={ReportType.SALES}>Ventas</option>
            <option value={ReportType.PURCHASES}>Compras</option>
            <option value={ReportType.COMBINED}>Combinado</option>
            <option value={ReportType.FINANCIAL_SUMMARY}>Resumen Financiero</option>
          </select>
        </div>

        <div className="form-group">
          <label>Estados:</label>
          <select
            multiple
            value={reportFilters.statuses || []}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value as ReportStatus);
              setReportFilters(prev => ({ ...prev, statuses: values }));
            }}
            className="filter-select"
          >
            <option value={ReportStatus.COMPLETED}>Completado</option>
            <option value={ReportStatus.GENERATING}>Generando</option>
            <option value={ReportStatus.FAILED}>Error</option>
            <option value={ReportStatus.PENDING}>Pendiente</option>
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
                <option value="generatedAt">Fecha de generación</option>
                <option value="title">Título</option>
                <option value="type">Tipo</option>
                <option value="status">Estado</option>
              </select>
            </div>

            <div className="form-group">
              <label>Orden:</label>
              <select
                value={reportFilters.sortOrder || 'desc'}
                onChange={(e) => setReportFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
                className="filter-select"
              >
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
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
            <option value="all">Todos los tipos</option>
            <option value={MovementType.PURCHASE}>Compras</option>
            <option value={MovementType.SALE}>Ventas</option>
            <option value={MovementType.ADJUSTMENT}>Ajustes</option>
            <option value={MovementType.RETURN}>Devoluciones</option>
            <option value={MovementType.EXPIRED}>Vencidos</option>
            <option value={MovementType.DAMAGED}>Dañados</option>
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

  const renderExportFilters = () => (
    <div className="filter-section">
      <div className="filter-controls">
        <div className="form-group">
          <label>Buscar en nombre:</label>
          <input
            type="text"
            value={exportFilters.searchTerm || ''}
            onChange={(e) => setExportFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            placeholder="Buscar exportaciones..."
            className="search-input"
          />
        </div>

        <div className="form-group">
          <label>Formatos:</label>
          <select
            multiple
            value={exportFilters.formats || []}
            onChange={(e) => {
            const values = Array.from(e.target.selectedOptions, option => option.value as ExportFormat);
            setExportFilters(prev => ({ ...prev, formats: values }));
            }}
            className="filter-select"
          >
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </div>

        <div className="form-group">
          <label>Estados:</label>
          <select
            multiple
            value={exportFilters.statuses || []}
            onChange={(e) => {
            const values = Array.from(e.target.selectedOptions, option => option.value as ExportHistoryStatus);
            setExportFilters(prev => ({ ...prev, statuses: values }));
            }}
            className="filter-select"
          >
            <option value="completed">Completado</option>
            <option value="failed">Error</option>
            <option value="expired">Expirado</option>
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
                value={exportFilters.startDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setExportFilters(prev => ({ 
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
                value={exportFilters.endDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setExportFilters(prev => ({ 
                  ...prev, 
                  endDate: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                className="filter-select"
              />
            </div>

            <div className="form-group">
              <label>Tamaño mínimo (KB):</label>
              <input
                type="number"
                value={exportFilters.minFileSize || ''}
                onChange={(e) => setExportFilters(prev => ({ 
                  ...prev, 
                  minFileSize: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
                placeholder="0"
                className="filter-select"
              />
            </div>

            <div className="form-group">
              <label>Tamaño máximo (KB):</label>
              <input
                type="number"
                value={exportFilters.maxFileSize || ''}
                onChange={(e) => setExportFilters(prev => ({ 
                  ...prev, 
                  maxFileSize: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
                placeholder="Sin límite"
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
    if (searchResults.length === 0) {
      return (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>No se encontraron resultados</h3>
          <p>Prueba ajustando los filtros de búsqueda.</p>
        </div>
      );
    }

    return (
      <div className="search-results">
        <div className="results-header">
          <h3>📋 Resultados de Búsqueda</h3>
          <p>Se encontraron <strong>{searchResults.length}</strong> resultados</p>
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
                {searchType === 'exports' && (
                  <>
                    <th>Nombre</th>
                    <th>Formato</th>
                    <th>Tamaño</th>
                    <th>Estado</th>
                    <th>Fecha</th>
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
                        <strong>{(item as TransactionReport).title}</strong>
                        <small>{(item as TransactionReport).description}</small>
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
                      <td>{(item as TransactionReport).generatedAt.toLocaleDateString('es-CL')}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-info"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDetailsModal(true);
                          }}
                        >
                          👁️
                        </button>
                      </td>
                    </>
                  )}
                  {searchType === 'movements' && (
                    <>
                      <td>{(item as any).date.toLocaleDateString('es-CL')}</td>
                      <td>
                        <strong>{(item as any).productName}</strong>
                        <small>{(item as any).productCode}</small>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusColor((item as any).type)}`}>
                          {(item as any).type}
                        </span>
                      </td>
                      <td>{(item as any).quantity}</td>
                      <td>{(item as any).totalValue ? formatCurrency((item as any).totalValue) : '-'}</td>
                      <td>{(item as any).userName}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-info"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDetailsModal(true);
                          }}
                        >
                          👁️
                        </button>
                      </td>
                    </>
                  )}
                  {searchType === 'exports' && (
                    <>
                      <td>
                        <strong>{(item as any).result.fileName}</strong>
                        <small>{(item as any).configName}</small>
                      </td>
                      <td>
                        <span className="status-badge secondary">
                          {(item as any).format.toUpperCase()}
                        </span>
                      </td>
                      <td>{((item as any).fileSize / 1024).toFixed(1)} KB</td>
                      <td>
                        <span className={`status-badge ${getStatusColor((item as any).status)}`}>
                          {(item as any).status}
                        </span>
                      </td>
                      <td>{(item as any).createdAt.toLocaleDateString('es-CL')}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-info"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDetailsModal(true);
                          }}
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
          <p className="error-message">{error}</p>
        </div>
      )}

      {renderSearchTypeSelector()}
      {renderPresets()}

      <div className="filters-container">
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
        {searchType === 'exports' && renderExportFilters()}
      </div>

      {searching ? (
        <div className="loading-spinner">Realizando búsqueda...</div>
      ) : (
        renderResults()
      )}

      {/* Modal para guardar búsqueda */}
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
              <pre>{JSON.stringify(
                searchType === 'reports' ? reportFilters :
                searchType === 'movements' ? movementFilters :
                exportFilters, 
                null, 2
              )}</pre>
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

      {/* Modal para detalles */}
      {selectedItem && showDetailsModal && (
        <ReportModal
          title="📋 Detalles del Elemento"
          onClose={() => setShowDetailsModal(false)}
        >
          <div className="item-details">
            <pre>{JSON.stringify(selectedItem, null, 2)}</pre>
          </div>
        </ReportModal>
      )}
    </div>
  );
};

export default AdvancedSearch;