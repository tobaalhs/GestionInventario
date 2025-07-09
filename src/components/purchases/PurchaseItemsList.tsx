import React, { useState } from 'react';

interface PurchaseItemForm {
  id?: string;
  productId?: string;
  isNewProduct: boolean;
  productCode: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  sellPrice?: number;
  description?: string;
  expirationDate?: string;
}

interface PurchaseItemsListProps {
  items: PurchaseItemForm[];
  onUpdateItem: (itemId: string, updates: Partial<PurchaseItemForm>) => void;
  onRemoveItem: (itemId: string) => void;
}

const PurchaseItemsList: React.FC<PurchaseItemsListProps> = ({
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
  const handleStartEdit = (item: PurchaseItemForm) => {
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
  const handleSaveEdit = (itemId: string) => {
    if (editingValues.quantity <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    if (editingValues.unitPrice <= 0) {
      alert('El precio debe ser mayor a 0');
      return;
    }

    onUpdateItem(itemId, {
      quantity: editingValues.quantity,
      unitPrice: editingValues.unitPrice
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

  if (items.length === 0) {
    return (
      <div className="purchase-items-empty">
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No hay productos agregados</h3>
          <p>Usa el buscador de arriba para agregar productos a tu compra</p>
        </div>
      </div>
    );
  }

  return (
    <div className="purchase-items-list">
      <div className="list-header">
        <h4>📋 Productos Seleccionados ({items.length})</h4>
        <div className="list-summary">
          <span>Total: {calculateTotalQuantity()} unidades</span>
          <span className="total-amount">{formatCLP(calculateListTotal())}</span>
        </div>
      </div>

      <div className="items-container">
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`purchase-item ${item.isNewProduct ? 'new-product' : 'existing-product'}`}
          >
            {/* Indicador de producto nuevo */}
            {item.isNewProduct && (
              <div className="new-product-badge">
                ✨ Nuevo Producto
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
                  {item.description && (
                    <span className="item-description" title={item.description}>
                      📝 {item.description.length > 50 
                          ? `${item.description.substring(0, 50)}...` 
                          : item.description}
                    </span>
                  )}
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
                        className="edit-input"
                      />
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
                        onClick={() => handleSaveEdit(item.id!)}
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
                      title="Eliminar de la lista"
                    >
                      🗑️ Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Información adicional para productos nuevos */}
            {item.isNewProduct && (
              <div className="new-product-details">
                <div className="detail-item">
                  <span className="detail-label">Este producto se registrará automáticamente al confirmar la compra</span>
                </div>
                {item.sellPrice && item.sellPrice > 0 && (
                  <div className="detail-item">
                    <span className="detail-label">Precio de venta sugerido:</span>
                    <span className="detail-value">{formatCLP(item.sellPrice)}</span>
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
            <span>Productos nuevos:</span>
            <span>{items.filter(item => item.isNewProduct).length}</span>
          </div>
          <div className="summary-row total-row">
            <span><strong>Total de la compra:</strong></span>
            <span className="total-amount"><strong>{formatCLP(calculateListTotal())}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseItemsList;