import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  searchMovements, 
  getMovementStatistics, 
  getMovementSummary 
} from '../../services/movementHistoryService';
import { 
  MovementRecord, 
  MovementFilters, 
  MovementSearchResult, 
  MovementStatistics,
  MovementType,
  MovementSortField 
} from '../../interfaces/Movement';
import ReportModal from './ReportModal';

interface MovementHistoryProps {}

const MovementHistory: React.FC<MovementHistoryProps> = () => {
  const { currentUser } = useAuth();
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<MovementStatistics | null>(null);
  
  // Estados de filtros
  const [filters, setFilters] = useState<MovementFilters>({
    startDate: (() => {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      return date;
    })(),
    endDate: new Date(),
    movementType: 'all',
    sortBy: MovementSortField.DATE,
    sortOrder: 'desc',
    pageSize: 50
  });

  // Estados de UI
  const [showFilters, setShowFilters] = useState(true);
  const [selectedMovement, setSelectedMovement] = useState<MovementRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    loadMovements();
  }, [filters]);

  const loadMovements = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Cargando movimientos con filtros:', filters);
      
      const result: MovementSearchResult = await searchMovements(filters);
      setMovements(result.movements);

      // Cargar estadísticas si es necesario
      if (filters.startDate && filters.endDate) {
        const stats = await getMovementStatistics(filters);
        setStatistics(stats);
      }

      console.log('✅ Movimientos cargados:', result.movements.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando movimientos';
      setError(errorMessage);
      console.error('❌ Error cargando movimientos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<MovementFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  const clearFilters = () => {
    const defaultFilters: MovementFilters = {
      startDate: (() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date;
      })(),
      endDate: new Date(),
      movementType: 'all',
      sortBy: MovementSortField.DATE,
      sortOrder: 'desc',
      pageSize: 50
    };
    setFilters(defaultFilters);
  };

  const handleExport = async () => {
    try {
      // Implementar exportación a Excel/PDF
      console.log('Exportando movimientos...');
      alert('Función de exportación en desarrollo');
    } catch (error) {
      console.error('Error exportando:', error);
    }
  };

  const handleMovementClick = (movement: MovementRecord) => {
    setSelectedMovement(movement);
    setShowModal(true);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getMovementTypeLabel = (type: MovementType): string => {
    const labels: Record<MovementType, string> = {
      [MovementType.PURCHASE]: 'Compra',
      [MovementType.SALE]: 'Venta',
      [MovementType.ADJUSTMENT]: 'Ajuste',
      [MovementType.RETURN]: 'Devolución',
      [MovementType.EXPIRED]: 'Vencido',
      [MovementType.DAMAGED]: 'Dañado',
      [MovementType.TRANSFER]: 'Transferencia'
    };
    return labels[type] || type;
  };

  const getMovementTypeColor = (type: MovementType): string => {
    const colors: Record<MovementType, string> = {
      [MovementType.PURCHASE]: 'success',
      [MovementType.SALE]: 'primary',
      [MovementType.ADJUSTMENT]: 'warning',
      [MovementType.RETURN]: 'info',
      [MovementType.EXPIRED]: 'danger',
      [MovementType.DAMAGED]: 'danger',
      [MovementType.TRANSFER]: 'secondary'
    };
    return colors[type] || 'secondary';
  };

  const renderFilters = () => (
    <div className="controls-section">
      <div className="section-header">
        <h3>🔍 Filtros de Búsqueda</h3>
        <button 
          className="btn btn-sm btn-secondary"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? '▲ Ocultar' : '▼ Mostrar'}
        </button>
      </div>

      {showFilters && (
        <>
          <div className="filter-controls">
            <div className="form-group">
              <label>Fecha desde:</label>
              <input
                type="date"
                value={filters.startDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => handleFilterChange({ 
                  startDate: e.target.value ? new Date(e.target.value) : undefined 
                })}
                className="filter-select"
              />
            </div>

            <div className="form-group">
              <label>Fecha hasta:</label>
              <input
                type="date"
                value={filters.endDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => handleFilterChange({ 
                  endDate: e.target.value ? new Date(e.target.value) : undefined 
                })}
                className="filter-select"
              />
            </div>

            <div className="form-group">
              <label>Tipo de movimiento:</label>
              <select
                value={filters.movementType || 'all'}
                onChange={(e) => handleFilterChange({ 
                  movementType: e.target.value === 'all' ? 'all' : e.target.value as MovementType 
                })}
                className="filter-select"
              >
                <option value="all">Todos los tipos</option>
                <option value={MovementType.PURCHASE}>Compras (Entrada)</option>
                <option value={MovementType.SALE}>Ventas (Salida)</option>
                <option value={MovementType.ADJUSTMENT}>Ajustes</option>
                <option value={MovementType.RETURN}>Devoluciones</option>
                <option value={MovementType.EXPIRED}>Productos vencidos</option>
                <option value={MovementType.DAMAGED}>Productos dañados</option>
              </select>
            </div>

            <div className="form-group">
              <label>Buscar por código/producto:</label>
              <input
                type="text"
                placeholder="Código o nombre del producto..."
                value={filters.searchTerm || ''}
                onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                className="search-input"
              />
            </div>
          </div>

          <div className="filter-controls">
            <div className="form-group">
              <label>Usuario responsable:</label>
              <input
                type="text"
                placeholder="Email del usuario..."
                value={filters.userId || ''}
                onChange={(e) => handleFilterChange({ userId: e.target.value })}
                className="filter-select"
              />
            </div>

            <div className="form-group">
              <label>Ordenar por:</label>
              <select
                value={filters.sortBy || MovementSortField.DATE}
                onChange={(e) => handleFilterChange({ 
                  sortBy: e.target.value as MovementSortField 
                })}
                className="filter-select"
              >
                <option value={MovementSortField.DATE}>Fecha</option>
                <option value={MovementSortField.PRODUCT_NAME}>Producto</option>
                <option value={MovementSortField.TYPE}>Tipo</option>
                <option value={MovementSortField.QUANTITY}>Cantidad</option>
                <option value={MovementSortField.TOTAL_VALUE}>Valor</option>
                <option value={MovementSortField.USER_NAME}>Usuario</option>
              </select>
            </div>

            <div className="form-group">
              <label>Orden:</label>
              <select
                value={filters.sortOrder || 'desc'}
                onChange={(e) => handleFilterChange({ 
                  sortOrder: e.target.value as 'asc' | 'desc' 
                })}
                className="filter-select"
              >
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </select>
            </div>

            <div className="form-group">
              <button 
                className="btn btn-secondary"
                onClick={clearFilters}
              >
                🗑️ Limpiar Filtros
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderTable = () => (
    <div className="table-container">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Producto</th>
            <th>Código</th>
            <th>Tipo</th>
            <th>Cantidad</th>
            <th>Stock Resultante</th>
            <th>Valor Total</th>
            <th>Usuario</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => (
            <tr key={movement.id}>
              <td>
                <div className="date-cell">
                  <div>{movement.date.toLocaleDateString('es-CL')}</div>
                  <small>{movement.date.toLocaleTimeString('es-CL', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</small>
                </div>
              </td>
              <td>
                <div className="product-cell">
                  <strong>{movement.productName}</strong>
                  {movement.category && <small>{movement.category}</small>}
                </div>
              </td>
              <td>
                <code>{movement.productCode}</code>
              </td>
              <td>
                <span className={`status-badge ${getMovementTypeColor(movement.type)}`}>
                  {getMovementTypeLabel(movement.type)}
                </span>
              </td>
              <td>
                <span className={`quantity-badge ${
                  [MovementType.PURCHASE, MovementType.RETURN].includes(movement.type) 
                    ? 'positive' : 'negative'
                }`}>
                  {[MovementType.PURCHASE, MovementType.RETURN].includes(movement.type) 
                    ? '+' : '-'}{movement.quantity}
                </span>
              </td>
              <td>
                <span className="stock-badge stock-medium">
                  {movement.resultingStock}
                </span>
              </td>
              <td>
                {movement.totalValue ? formatCurrency(movement.totalValue) : '-'}
              </td>
              <td>
                <div className="user-cell">
                  <div>{movement.userName}</div>
                  <small>{movement.userEmail}</small>
                </div>
              </td>
              <td>
                <button 
                  className="btn btn-sm btn-info"
                  onClick={() => handleMovementClick(movement)}
                  title="Ver detalles completos"
                >
                  👁️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCards = () => (
    <div className="cards-container">
      {movements.map((movement) => (
        <div key={movement.id} className="product-card movement-card">
          <div className="card-header">
            <span className={`status-badge ${getMovementTypeColor(movement.type)}`}>
              {getMovementTypeLabel(movement.type)}
            </span>
            <span className="movement-date">
              {movement.date.toLocaleDateString('es-CL')}
            </span>
          </div>
          
          <div className="card-body">
            <h4>{movement.productName}</h4>
            <p><strong>Código:</strong> <code>{movement.productCode}</code></p>
            <p><strong>Cantidad:</strong> 
              <span className={`quantity-badge ${
                [MovementType.PURCHASE, MovementType.RETURN].includes(movement.type) 
                  ? 'positive' : 'negative'
              }`}>
                {[MovementType.PURCHASE, MovementType.RETURN].includes(movement.type) 
                  ? '+' : '-'}{movement.quantity}
              </span>
            </p>
            <p><strong>Stock resultante:</strong> {movement.resultingStock}</p>
            {movement.totalValue && (
              <p><strong>Valor:</strong> {formatCurrency(movement.totalValue)}</p>
            )}
            <p><strong>Usuario:</strong> {movement.userName}</p>
          </div>
          
          <div className="card-actions">
            <button 
              className="btn btn-sm btn-info"
              onClick={() => handleMovementClick(movement)}
            >
              👁️ Ver Detalles
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderStatistics = () => {
    if (!statistics) return null;

    return (
      <div className="stats-section">
        <h3>📊 Estadísticas del Período</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <h4>Total Movimientos</h4>
              <p className="stat-number">{statistics.totalMovements}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h4>Valor Total</h4>
              <p className="stat-number">{formatCurrency(statistics.totalValue)}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h4>Productos Afectados</h4>
              <p className="stat-number">{statistics.topProducts.length}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h4>Usuarios Activos</h4>
              <p className="stat-number">{statistics.topUsers.length}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="movement-history">
      <div className="section-header">
        <h2>📈 Historial de Movimientos de Stock</h2>
        <div className="header-actions">
          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              📋 Tabla
            </button>
            <button 
              className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              🃏 Tarjetas
            </button>
          </div>
          
          <button 
            className="btn btn-primary"
            onClick={handleExport}
            disabled={movements.length === 0}
          >
            📊 Exportar a Excel
          </button>
        </div>
      </div>

      {renderFilters()}
      {renderStatistics()}

      {error && (
        <div className="error-messages">
          <p className="error-message">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Cargando movimientos...</div>
      ) : movements.length === 0 ? (
        <div className="no-results">
          <div className="no-results-icon">📊</div>
          <h3>No se encontraron movimientos</h3>
          <p>No hay movimientos que coincidan con los filtros aplicados.</p>
          <button onClick={clearFilters} className="btn btn-primary">
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          <div className="results-summary">
            <p>
              Mostrando <strong>{movements.length}</strong> movimientos 
              {filters.startDate && filters.endDate && (
                <> del {filters.startDate.toLocaleDateString('es-CL')} 
                 al {filters.endDate.toLocaleDateString('es-CL')}</>
              )}
            </p>
          </div>

          {viewMode === 'table' ? renderTable() : renderCards()}
        </>
      )}

      {selectedMovement && showModal && (
        <ReportModal
          title="Detalles del Movimiento"
          onClose={() => setShowModal(false)}
        >
          <div className="movement-details">
            <div className="detail-row">
              <div className="detail-group">
                <label>Fecha y Hora:</label>
                <p>{selectedMovement.date.toLocaleString('es-CL')}</p>
              </div>
              <div className="detail-group">
                <label>Tipo de Movimiento:</label>
                <p>
                  <span className={`status-badge ${getMovementTypeColor(selectedMovement.type)}`}>
                    {getMovementTypeLabel(selectedMovement.type)}
                  </span>
                </p>
              </div>
            </div>

            <div className="detail-row">
              <div className="detail-group">
                <label>Producto:</label>
                <p><strong>{selectedMovement.productName}</strong></p>
              </div>
              <div className="detail-group">
                <label>Código:</label>
                <p><code>{selectedMovement.productCode}</code></p>
              </div>
            </div>

            <div className="detail-row">
              <div className="detail-group">
                <label>Cantidad:</label>
                <p>
                  <span className={`quantity-badge ${
                    [MovementType.PURCHASE, MovementType.RETURN].includes(selectedMovement.type) 
                      ? 'positive' : 'negative'
                  }`}>
                    {[MovementType.PURCHASE, MovementType.RETURN].includes(selectedMovement.type) 
                      ? '+' : '-'}{selectedMovement.quantity}
                  </span>
                </p>
              </div>
              <div className="detail-group">
                <label>Stock Anterior:</label>
                <p>{selectedMovement.previousStock}</p>
              </div>
              <div className="detail-group">
                <label>Stock Resultante:</label>
                <p><strong>{selectedMovement.resultingStock}</strong></p>
              </div>
            </div>

            {selectedMovement.totalValue && (
              <div className="detail-row">
                <div className="detail-group">
                  <label>Precio Unitario:</label>
                  <p>{selectedMovement.unitPrice ? formatCurrency(selectedMovement.unitPrice) : '-'}</p>
                </div>
                <div className="detail-group">
                  <label>Valor Total:</label>
                  <p className="price-text">{formatCurrency(selectedMovement.totalValue)}</p>
                </div>
              </div>
            )}

            <div className="detail-row">
              <div className="detail-group">
                <label>Usuario Responsable:</label>
                <p>{selectedMovement.userName} ({selectedMovement.userEmail})</p>
              </div>
              {selectedMovement.category && (
                <div className="detail-group">
                  <label>Categoría:</label>
                  <p>{selectedMovement.category}</p>
                </div>
              )}
            </div>

            {selectedMovement.comments && (
              <div className="detail-row">
                <div className="detail-group full-width">
                  <label>Comentarios:</label>
                  <p>{selectedMovement.comments}</p>
                </div>
              </div>
            )}

            {(selectedMovement.supplierName || selectedMovement.customerName) && (
              <div className="detail-row">
                {selectedMovement.supplierName && (
                  <div className="detail-group">
                    <label>Proveedor:</label>
                    <p>{selectedMovement.supplierName}</p>
                  </div>
                )}
                {selectedMovement.customerName && (
                  <div className="detail-group">
                    <label>Cliente:</label>
                    <p>{selectedMovement.customerName}</p>
                  </div>
                )}
              </div>
            )}

            {(selectedMovement.batchCode || selectedMovement.expirationDate) && (
              <div className="detail-row">
                {selectedMovement.batchCode && (
                  <div className="detail-group">
                    <label>Código de Lote:</label>
                    <p><code>{selectedMovement.batchCode}</code></p>
                  </div>
                )}
                {selectedMovement.expirationDate && (
                  <div className="detail-group">
                    <label>Fecha de Vencimiento:</label>
                    <p>{selectedMovement.expirationDate.toLocaleDateString('es-CL')}</p>
                  </div>
                )}
              </div>
            )}

            {(selectedMovement.saleId || selectedMovement.purchaseId) && (
              <div className="detail-row">
                {selectedMovement.saleId && (
                  <div className="detail-group">
                    <label>ID de Venta:</label>
                    <p><code>{selectedMovement.saleId}</code></p>
                  </div>
                )}
                {selectedMovement.purchaseId && (
                  <div className="detail-group">
                    <label>ID de Compra:</label>
                    <p><code>{selectedMovement.purchaseId}</code></p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ReportModal>
      )}
    </div>
  );
};

export default MovementHistory;