import React, { useState, useEffect } from 'react';
import './ReportFilters.css';
import { 
  TransactionFilters, 
  ReportType,
  ReportGrouping 
} from '../../interfaces/Report';
import { 
  MovementFilters, 
  MovementType, 
  MovementSortField 
} from '../../interfaces/Movement';
import { getDateRange, validateDateRange } from '../../utils/reportUtils';
import { validateFilters, applyQuickFilters } from '../../utils/filterUtils';

interface ReportFiltersProps {
  filters: TransactionFilters | MovementFilters;
  onFiltersChange: (filters: Partial<TransactionFilters | MovementFilters>) => void;
  onApply: () => void;
  onClear: () => void;
  type: 'transaction' | 'movement';
  loading?: boolean;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
  presets?: FilterPreset[];
  onSavePreset?: (name: string, filters: any) => void;
}

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: any;
  isDefault?: boolean;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onFiltersChange,
  onApply,
  onClear,
  type,
  loading = false,
  showAdvanced = false,
  onToggleAdvanced,
  presets = [],
  onSavePreset
}) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [validation, setValidation] = useState<{ isValid: boolean; errors: string[] }>({ isValid: true, errors: [] });
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  // Sincronizar filtros locales con props
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Validar filtros cuando cambien
  useEffect(() => {
    const result = validateFilters(localFilters, type);
    setValidation(result);
  }, [localFilters, type]);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleQuickDateRange = (period: string) => {
    const dateRange = getDateRange(period as any);
    handleFilterChange('startDate', dateRange.startDate);
    handleFilterChange('endDate', dateRange.endDate);
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    setLocalFilters(preset.filters);
    onFiltersChange(preset.filters);
    setShowPresets(false);
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      alert('Por favor ingresa un nombre para el preset');
      return;
    }
    
    if (onSavePreset) {
      onSavePreset(presetName, localFilters);
      setPresetName('');
      setShowSavePreset(false);
    }
  };

  const renderQuickDateFilters = () => (
    <div className="quick-date-filters">
      <h4>📅 Rangos Rápidos</h4>
      <div className="quick-buttons">
        <button 
          type="button"
          className="quick-btn"
          onClick={() => handleQuickDateRange('today')}
        >
          Hoy
        </button>
        <button 
          type="button"
          className="quick-btn"
          onClick={() => handleQuickDateRange('yesterday')}
        >
          Ayer
        </button>
        <button 
          type="button"
          className="quick-btn"
          onClick={() => handleQuickDateRange('thisWeek')}
        >
          Esta Semana
        </button>
        <button 
          type="button"
          className="quick-btn"
          onClick={() => handleQuickDateRange('lastWeek')}
        >
          Semana Pasada
        </button>
        <button 
          type="button"
          className="quick-btn"
          onClick={() => handleQuickDateRange('thisMonth')}
        >
          Este Mes
        </button>
        <button 
          type="button"
          className="quick-btn"
          onClick={() => handleQuickDateRange('lastMonth')}
        >
          Mes Pasado
        </button>
        <button 
          type="button"
          className="quick-btn"
          onClick={() => handleQuickDateRange('thisYear')}
        >
          Este Año
        </button>
      </div>
    </div>
  );

  const renderBasicFilters = () => (
    <div className="basic-filters">
      <div className="filter-row">
        <div className="form-group">
          <label>Fecha desde:</label>
          <input
            type="date"
            value={localFilters.startDate ? localFilters.startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : undefined)}
            className="filter-input"
          />
        </div>

        <div className="form-group">
          <label>Fecha hasta:</label>
          <input
            type="date"
            value={localFilters.endDate ? localFilters.endDate.toISOString().split('T')[0] : ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : undefined)}
            className="filter-input"
          />
        </div>

        <div className="form-group">
          <label>Buscar:</label>
          <input
            type="text"
            value={localFilters.searchTerm || ''}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            placeholder="Código, nombre, cliente..."
            className="filter-input search-input"
          />
        </div>
      </div>
    </div>
  );

  const renderTransactionFilters = () => {
    const transactionFilters = localFilters as TransactionFilters;
    
    return (
      <>
        <div className="filter-row">
          <div className="form-group">
            <label>Tipos de transacción:</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={transactionFilters.includeTypes?.includes('sale') || false}
                  onChange={(e) => {
                    const includeTypes = transactionFilters.includeTypes || [];
                    const newTypes = e.target.checked 
                      ? [...includeTypes.filter(t => t !== 'sale'), 'sale']
                      : includeTypes.filter(t => t !== 'sale');
                    handleFilterChange('includeTypes', newTypes);
                  }}
                />
                Ventas
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={transactionFilters.includeTypes?.includes('purchase') || false}
                  onChange={(e) => {
                    const includeTypes = transactionFilters.includeTypes || [];
                    const newTypes = e.target.checked 
                      ? [...includeTypes.filter(t => t !== 'purchase'), 'purchase']
                      : includeTypes.filter(t => t !== 'purchase');
                    handleFilterChange('includeTypes', newTypes);
                  }}
                />
                Compras
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Monto mínimo:</label>
            <input
              type="number"
              value={transactionFilters.minAmount || ''}
              onChange={(e) => handleFilterChange('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0"
              className="filter-input"
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Monto máximo:</label>
            <input
              type="number"
              value={transactionFilters.maxAmount || ''}
              onChange={(e) => handleFilterChange('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="Sin límite"
              className="filter-input"
              min="0"
            />
          </div>
        </div>

        {showAdvanced && (
          <div className="advanced-filters-section">
            <div className="filter-row">
              <div className="form-group">
                <label>Agrupación:</label>
                <select
                  value={transactionFilters.groupBy || ReportGrouping.NONE}
                  onChange={(e) => handleFilterChange('groupBy', e.target.value as ReportGrouping)}
                  className="filter-select"
                >
                  <option value={ReportGrouping.NONE}>Sin agrupación</option>
                  <option value={ReportGrouping.DATE}>Por fecha</option>
                  <option value={ReportGrouping.WEEK}>Por semana</option>
                  <option value={ReportGrouping.MONTH}>Por mes</option>
                  <option value={ReportGrouping.QUARTER}>Por trimestre</option>
                  <option value={ReportGrouping.YEAR}>Por año</option>
                  <option value={ReportGrouping.CUSTOMER}>Por cliente</option>
                  <option value={ReportGrouping.SUPPLIER}>Por proveedor</option>
                  <option value={ReportGrouping.PRODUCT}>Por producto</option>
                  <option value={ReportGrouping.CATEGORY}>Por categoría</option>
                  <option value={ReportGrouping.USER}>Por usuario</option>
                </select>
              </div>

              <div className="form-group">
                <label>Métodos de pago:</label>
                <select
                  multiple
                  value={transactionFilters.paymentMethods || []}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    handleFilterChange('paymentMethods', values);
                  }}
                  className="filter-select"
                  size={4}
                >
                  <option value="cash">Efectivo</option>
                  <option value="credit_card">Tarjeta de Crédito</option>
                  <option value="debit_card">Tarjeta de Débito</option>
                  <option value="bank_transfer">Transferencia</option>
                  <option value="check">Cheque</option>
                  <option value="store_credit">Crédito Tienda</option>
                </select>
              </div>

              <div className="form-group">
                <label>Estados:</label>
                <select
                  multiple
                  value={transactionFilters.statuses || []}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    handleFilterChange('statuses', values);
                  }}
                  className="filter-select"
                  size={4}
                >
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="refunded">Reembolsado</option>
                </select>
              </div>
            </div>

            <div className="filter-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={transactionFilters.includeDeletedTransactions || false}
                  onChange={(e) => handleFilterChange('includeDeletedTransactions', e.target.checked)}
                />
                Incluir transacciones eliminadas
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={transactionFilters.includePendingTransactions !== false}
                  onChange={(e) => handleFilterChange('includePendingTransactions', e.target.checked)}
                />
                Incluir transacciones pendientes
              </label>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderMovementFilters = () => {
  const movementFilters = localFilters as MovementFilters;
  
  return (
    <>
      <div className="filter-row">
        <div className="form-group">
          <label>Tipo de movimiento:</label>
          <select
            value={movementFilters.movementType || 'all'}
            onChange={(e) => handleFilterChange('movementType', e.target.value === 'all' ? 'all' : e.target.value as MovementType)}
            className="filter-select"
          >
            <option value="all">Todos los tipos</option>
            <option value={MovementType.PURCHASE}>Compras (Entrada)</option>
            <option value={MovementType.SALE}>Ventas (Salida)</option>
            <option value={MovementType.ADJUSTMENT}>Ajustes</option>
            <option value={MovementType.RETURN}>Devoluciones</option>
            <option value={MovementType.EXPIRED}>Productos vencidos</option>
            <option value={MovementType.DAMAGED}>Productos dañados</option>
            <option value={MovementType.TRANSFER}>Transferencias</option>
          </select>
        </div>

        <div className="form-group">
          <label>Cantidad mínima:</label>
          <input
            type="number"
            value={movementFilters.minQuantity || ''}
            onChange={(e) => handleFilterChange('minQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="0"
            className="filter-input"
            min="0"
          />
        </div>

        <div className="form-group">
          <label>Cantidad máxima:</label>
          <input
            type="number"
            value={movementFilters.maxQuantity || ''}
            onChange={(e) => handleFilterChange('maxQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Sin límite"
            className="filter-input"
            min="0"
          />
        </div>
      </div>

      {showAdvanced && (
        <div className="advanced-filters-section">
          <div className="filter-row">
            {/* AGREGADO: Filtros por monto (valor monetario) */}
            <div className="form-group">
              <label>Monto mínimo ($):</label>
              <input
                type="number"
                value={movementFilters.minAmount || ''}
                onChange={(e) => handleFilterChange('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0"
                className="filter-input"
                min="0"
                step="1000"
              />
            </div>

            <div className="form-group">
              <label>Monto máximo ($):</label>
              <input
                type="number"
                value={movementFilters.maxAmount || ''}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Sin límite"
                className="filter-input"
                min="0"
                step="1000"
              />
            </div>

            <div className="form-group">
              <label>Ordenar por:</label>
              <select
                value={movementFilters.sortBy || MovementSortField.DATE}
                onChange={(e) => handleFilterChange('sortBy', e.target.value as MovementSortField)}
                className="filter-select"
              >
                <option value={MovementSortField.DATE}>Fecha</option>
                <option value={MovementSortField.PRODUCT_NAME}>Producto</option>
                <option value={MovementSortField.PRODUCT_CODE}>Código</option>
                <option value={MovementSortField.TYPE}>Tipo</option>
                <option value={MovementSortField.QUANTITY}>Cantidad</option>
                <option value={MovementSortField.TOTAL_VALUE}>Valor</option>
                <option value={MovementSortField.USER_NAME}>Usuario</option>
                <option value={MovementSortField.RESULTING_STOCK}>Stock resultante</option>
              </select>
            </div>
          </div>

          <div className="filter-row">
            <div className="form-group">
              <label>Orden:</label>
              <select
                value={movementFilters.sortOrder || 'desc'}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
                className="filter-select"
              >
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </select>
            </div>

            <div className="form-group">
              <label>Usuario responsable:</label>
              <input
                type="text"
                value={movementFilters.userId || ''}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="Email del usuario..."
                className="filter-input"
              />
            </div>

            <div className="form-group">
              <label>Categoría:</label>
              <input
                type="text"
                value={movementFilters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                placeholder="Categoría del producto..."
                className="filter-input"
              />
            </div>
          </div>

          <div className="filter-row">
            <div className="form-group">
              <label>Código de lote:</label>
              <input
                type="text"
                value={movementFilters.batchCode || ''}
                onChange={(e) => handleFilterChange('batchCode', e.target.value)}
                placeholder="Código de lote..."
                className="filter-input"
              />
            </div>

            <div className="form-group">
              <label>Resultados por página:</label>
              <select
                value={movementFilters.pageSize || 50}
                onChange={(e) => handleFilterChange('pageSize', parseInt(e.target.value))}
                className="filter-select"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          <div className="filter-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={movementFilters.hasExpirationDate || false}
                onChange={(e) => handleFilterChange('hasExpirationDate', e.target.checked ? true : undefined)}
              />
              Solo productos con fecha de vencimiento
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={movementFilters.hasComments || false}
                onChange={(e) => handleFilterChange('hasComments', e.target.checked ? true : undefined)}
              />
              Solo movimientos con comentarios
            </label>
          </div>
        </div>
      )}
    </>
  );
};

  const renderPresets = () => (
    <div className="presets-section">
      <div className="presets-header">
        <h4>⚡ Filtros Predefinidos</h4>
        <div className="presets-actions">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setShowPresets(!showPresets)}
          >
            {showPresets ? 'Ocultar' : 'Mostrar'} Presets
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setShowSavePreset(true)}
          >
            💾 Guardar Filtros
          </button>
        </div>
      </div>

      {showPresets && presets.length > 0 && (
        <div className="presets-list">
          {presets.map((preset) => (
            <div key={preset.id} className="preset-item">
              <div className="preset-info">
                <h5>{preset.name}</h5>
                <p>{preset.description}</p>
                {preset.isDefault && <span className="default-badge">Por defecto</span>}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => handleApplyPreset(preset)}
              >
                Aplicar
              </button>
            </div>
          ))}
        </div>
      )}

      {showSavePreset && (
        <div className="save-preset-modal">
          <div className="modal-content">
            <h4>💾 Guardar Filtros</h4>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Nombre del filtro..."
              className="filter-input"
              autoFocus
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSavePreset(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderValidationErrors = () => {
    if (validation.isValid) return null;

    return (
      <div className="validation-errors">
        <h4>⚠️ Errores en los filtros:</h4>
        <ul>
          {validation.errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="report-filters">
      <div className="filters-header">
        <h3>🔍 Filtros de Búsqueda</h3>
        <div className="filters-actions">
          {onToggleAdvanced && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={onToggleAdvanced}
            >
              {showAdvanced ? '▲ Ocultar' : '▼ Mostrar'} Avanzados
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={onClear}
            disabled={loading}
          >
            🗑️ Limpiar
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={onApply}
            disabled={loading || !validation.isValid}
          >
            {loading ? '🔄 Aplicando...' : '🔍 Aplicar Filtros'}
          </button>
        </div>
      </div>

      {renderQuickDateFilters()}
      {renderBasicFilters()}
      
      {type === 'transaction' ? renderTransactionFilters() : renderMovementFilters()}
      
      {presets.length > 0 && renderPresets()}
      {renderValidationErrors()}

    </div>
  );
};

export default ReportFilters;