import React, { useState } from 'react';
import { SaleItemForm } from '../../interfaces/Sale';

interface SaleItemsListProps {
  items: SaleItemForm[];
  onUpdateItem: (itemId: string, updates: Partial<SaleItemForm>) => void;
  onRemoveItem: (itemId: string) => void;
}

const SaleItemsList: React.FC<SaleItemsListProps> = ({
  items,
  onUpdateItem,
  onRemoveItem
}) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{
    quantity: number;
    unitPrice: number;
  }>({
    quantity: 0,
    unitPrice: 0
  });

  // Formatear precio en pesos chilenos
  const formatCLP = (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Iniciar edición
  const handleStartEdit = (item: SaleItemForm) => {
    if (!item.id) return;
    
    setEditingItemId(item.id);
    setEditingValues({
      quantity: item.quantity,
      unitPrice: item.unitPrice
    });
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingValues({ quantity: 0, unitPrice: 0 });
  };

  // Guardar edición
  const handleSaveEdit = (itemId: string, maxQuantity: number) => {
    if (editingValues.quantity <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    if (editingValues.quantity > maxQuantity) {
      alert(`La cantidad no puede ser mayor al stock disponible (${maxQuantity})`);
      return;
    }

    if (editingValues.unitPrice <= 0) {
      alert('El precio debe ser mayor a 0');
      return;
    }

    onUpdateItem(itemId, {
      quantity: editingValues.quantity,
      unitPrice: editingValues.unitPrice,
      totalPrice: editingValues.quantity * editingValues.unitPrice
    });

    setEditingItemId(null);
    setEditingValues({ quantity: 0, unitPrice: 0 });
  };

  // Calcular total de la lista
  const calculateListTotal = (): number => {
    return items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
  };

  // Calcular cantidad total
  const calculateTotalQuantity = (): number => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  // Verificar si un producto quedará en stock crítico
  const willBeCritical = (item: SaleItemForm): boolean => {
    const remainingStock = item.availableStock - item.quantity;
    return remainingStock <= 5;
  };

  // Verificar si un producto se agotará
  const willBeOutOfStock = (item: SaleItemForm): boolean => {
    const remainingStock = item.availableStock - item.quantity;
    return remainingStock === 0;
  };

  if (items.length === 0) {
    return (
      <div className="sale-items-empty">
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <h3>No hay productos agregados</h3>
          <p>Usa el buscador de arriba para agregar productos a tu venta</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sale-items-list">
      <div className="list-header">
        <h4>🛒 Productos para Venta ({items.length})</h4>
        <div className="list-summary">
          <span>Total: {calculateTotalQuantity()} unidades</span>
          <span className="total-amount">{formatCLP(calculateListTotal())}</span>
        </div>
      </div>

      <div className="items-container">
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`sale-item ${willBeCritical(item) ? 'critical-stock' : ''} ${willBeOutOfStock(item) ? 'out-of-stock' : ''}`}
          >
            {/* Indicadores de stock */}
            {willBeOutOfStock(item) && (
              <div className="stock-badge out-of-stock-badge">
                🚫 Se agotará
              </div>
            )}
            {willBeCritical(item) && !willBeOutOfStock(item) && (
              <div className="stock-badge critical-stock-badge">
                ⚠️ Stock crítico
              </div>
            )}

            <div className="item-content">
              {/* Información básica del producto */}
              <div className="item-info">
                <div className="item-header">
                  <h5 className="item-name">{item.productName}</h5>
                  <span className="item-code">Código: {item.productCode}</span>
                </div>
                <div className="item-details">
                  <span className="item-category">📂 {item.category}</span>
                  <span className="item-stock">
                    📦 Stock: {item.availableStock} unidades
                  </span>
                  <span className="item-remaining">
                    📊 Restante: {item.availableStock - item.quantity} unidades
                  </span>
                </div>
              </div>

              {/* Cantidades y precios */}
              <div className="item-quantities">
                {editingItemId === item.id ? (
                  // Modo edición
                  <div className="edit-mode">
                    <div className="edit-field">
                      <label>Cantidad:</label>
                      <input
                        type="number"
                        value={editingValues.quantity}
                        onChange={(e) => setEditingValues({
                          ...editingValues,
                          quantity: Number(e.target.value)
                        })}
                        min="1"
                        max={item.maxQuantity}
                        className="edit-input"
                      />
                      <small>Máx: {item.maxQuantity}</small>
                    </div>
                    <div className="edit-field">
                      <label>Precio unitario:</label>
                      <input
                        type="number"
                        value={editingValues.unitPrice}
                        onChange={(e) => setEditingValues({
                          ...editingValues,
                          unitPrice: Number(e.target.value)
                        })}
                        min="0"
                        step="0.01"
                        className="edit-input"
                      />
                    </div>
                    <div className="edit-total">
                      <strong>Total: {formatCLP(editingValues.quantity * editingValues.unitPrice)}</strong>
                    </div>
                    <div className="edit-actions">
                      <button
                        onClick={handleCancelEdit}
                        className="btn btn-sm btn-secondary"
                      >
                        ✕ Cancelar
                      </button>
                      <button
                        onClick={() => handleSaveEdit(item.id!, item.maxQuantity)}
                        className="btn btn-sm btn-primary"
                      >
                        ✓ Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  // Modo visualización
                  <div className="view-mode">
                    <div className="quantity-info">
                      <span className="quantity-label">Cantidad:</span>
                      <span className="quantity-value">{item.quantity} unidades</span>
                    </div>
                    <div className="price-info">
                      <span className="price-label">Precio unitario:</span>
                      <span className="price-value">{formatCLP(item.unitPrice)}</span>
                    </div>
                    <div className="total-info">
                      <span className="total-label">Subtotal:</span>
                      <span className="total-value">{formatCLP(item.quantity * item.unitPrice)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="item-actions">
                {editingItemId !== item.id && (
                  <>
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="btn btn-sm btn-outline"
                      title="Editar cantidad y precio"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.id!)}
                      className="btn btn-sm btn-danger"
                      title="Eliminar de la venta"
                    >
                      🗑️ Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Información de stock crítico */}
            {willBeCritical(item) && (
              <div className="stock-warning">
                {willBeOutOfStock(item) ? (
                  <div className="warning-item out-of-stock">
                    <span className="warning-icon">🚫</span>
                    <span className="warning-text">
                      Este producto se agotará completamente después de la venta
                    </span>
                  </div>
                ) : (
                  <div className="warning-item critical-stock">
                    <span className="warning-icon">⚠️</span>
                    <span className="warning-text">
                      Quedarán solo {item.availableStock - item.quantity} unidades (stock crítico)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Resumen final */}
      <div className="list-footer">
        <div className="footer-summary">
          <div className="summary-row">
            <span>Total de productos:</span>
            <span>{items.length}</span>
          </div>
          <div className="summary-row">
            <span>Cantidad total:</span>
            <span>{calculateTotalQuantity()} unidades</span>
          </div>
          <div className="summary-row">
            <span>Productos con stock crítico:</span>
            <span className="critical-count">
              {items.filter(item => willBeCritical(item)).length}
              {items.filter(item => willBeCritical(item)).length > 0 && ' ⚠️'}
            </span>
          </div>
          <div className="summary-row total-row">
            <span><strong>Total de la venta:</strong></span>
            <span className="total-amount"><strong>{formatCLP(calculateListTotal())}</strong></span>
          </div>
        </div>
      </div>

      {/* Alertas globales */}
      {items.some(item => willBeCritical(item)) && (
        <div className="global-warnings">
          <div className="warning-box">
            <div className="warning-header">
              <span className="warning-icon">⚠️</span>
              <span className="warning-title">Advertencia de Stock</span>
            </div>
            <div className="warning-content">
              <p>Algunos productos quedarán en stock crítico o se agotarán después de esta venta:</p>
              <ul>
                {items.filter(item => willBeOutOfStock(item)).map(item => (
                  <li key={item.id} className="out-of-stock-item">
                    <strong>{item.productName}</strong> se agotará completamente
                  </li>
                ))}
                {items.filter(item => willBeCritical(item) && !willBeOutOfStock(item)).map(item => (
                  <li key={item.id} className="critical-item">
                    <strong>{item.productName}</strong> quedará con {item.availableStock - item.quantity} unidades
                  </li>
                ))}
              </ul>
              <p><small>Se generarán alertas automáticas al completar la venta.</small></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleItemsList;