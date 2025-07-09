import React from 'react';

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

interface SupplierFormData {
  id?: string;
  isNewSupplier: boolean;
  rut: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
}

interface PurchaseFormData {
  selectedProducts: PurchaseItemForm[];
  supplier: SupplierFormData;
  purchaseDate: string;
  expirationDate: string;
  comments: string;
}

interface PurchaseConfirmationProps {
  formData: PurchaseFormData;
  purchaseTotal: number;
  generatedCode: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const PurchaseConfirmation: React.FC<PurchaseConfirmationProps> = ({
  formData,
  purchaseTotal,
  generatedCode,
  onConfirm,
  onCancel,
  loading
}) => {
  // Formatear precio en pesos chilenos
  const formatCLP = (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'No especificada';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calcular totales
  const totalQuantity = formData.selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
  const newProductsCount = formData.selectedProducts.filter(item => item.isNewProduct).length;
  const existingProductsCount = formData.selectedProducts.length - newProductsCount;

  return (
    <div className="modal-overlay">
      <div className="modal confirmation-modal">
        <div className="modal-header">
          <h2>📋 Confirmar Compra</h2>
          <button 
            className="close-btn"
            onClick={onCancel}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Código de compra */}
          <div className="confirmation-section">
            <div className="code-section">
              <h3>🏷️ Código de Compra</h3>
              <div className="generated-code">
                <code>{generatedCode}</code>
              </div>
              <small>Este código se generará automáticamente al confirmar la compra</small>
            </div>
          </div>

          {/* Información del proveedor */}
          <div className="confirmation-section">
            <h3>🏢 Proveedor</h3>
            <div className="supplier-summary">
              <div className="supplier-info">
                <div className="info-row">
                  <strong>{formData.supplier.name}</strong>
                  {formData.supplier.isNewSupplier && (
                    <span className="new-badge">Nuevo Proveedor</span>
                  )}
                </div>
                <div className="info-row">
                  <span>RUT: {formData.supplier.rut}</span>
                  <span>Contacto: {formData.supplier.contact}</span>
                </div>
                {formData.supplier.email && (
                  <div className="info-row">
                    <span>Email: {formData.supplier.email}</span>
                  </div>
                )}
                {formData.supplier.phone && (
                  <div className="info-row">
                    <span>Teléfono: {formData.supplier.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resumen de productos */}
          <div className="confirmation-section">
            <h3>📦 Productos de la Compra</h3>
            <div className="products-summary">
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-label">Total de productos:</span>
                  <span className="stat-value">{formData.selectedProducts.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Productos existentes:</span>
                  <span className="stat-value">{existingProductsCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Productos nuevos:</span>
                  <span className="stat-value">{newProductsCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Cantidad total:</span>
                  <span className="stat-value">{totalQuantity} unidades</span>
                </div>
              </div>

              <div className="products-list">
                {formData.selectedProducts.map((product, index) => (
                  <div key={product.id || index} className="product-summary-item">
                    <div className="product-header">
                      <span className="product-name">{product.productName}</span>
                      <span className="product-code">({product.productCode})</span>
                      {product.isNewProduct && (
                        <span className="new-product-indicator">✨ Nuevo</span>
                      )}
                    </div>
                    <div className="product-details">
                      <span>Categoría: {product.category}</span>
                      <span>Cantidad: {product.quantity} unidades</span>
                      <span>Precio unitario: {formatCLP(product.unitPrice)}</span>
                      <span className="product-total">
                        Subtotal: {formatCLP(product.quantity * product.unitPrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detalles de la compra */}
          <div className="confirmation-section">
            <h3>📅 Detalles de la Compra</h3>
            <div className="purchase-details">
              <div className="detail-row">
                <span className="detail-label">Fecha de compra:</span>
                <span className="detail-value">{formatDate(formData.purchaseDate)}</span>
              </div>
              {formData.expirationDate && (
                <div className="detail-row">
                  <span className="detail-label">Fecha de vencimiento del lote:</span>
                  <span className="detail-value">{formatDate(formData.expirationDate)}</span>
                </div>
              )}
              {formData.comments && (
                <div className="detail-row">
                  <span className="detail-label">Comentarios:</span>
                  <span className="detail-value">{formData.comments}</span>
                </div>
              )}
            </div>
          </div>

          {/* Total financiero */}
          <div className="confirmation-section total-section">
            <h3>💰 Total de la Compra</h3>
            <div className="financial-summary">
              <div className="total-breakdown">
                {formData.selectedProducts.map((product, index) => (
                  <div key={product.id || index} className="breakdown-item">
                    <span>{product.productName} (x{product.quantity})</span>
                    <span>{formatCLP(product.quantity * product.unitPrice)}</span>
                  </div>
                ))}
              </div>
              <div className="final-total">
                <span>Total a invertir en inventario:</span>
                <span className="total-amount">{formatCLP(purchaseTotal)}</span>
              </div>
            </div>
          </div>

          {/* Acciones que se realizarán */}
          <div className="confirmation-section actions-section">
            <h3>⚡ Acciones que se realizarán</h3>
            <div className="actions-list">
              <div className="action-item">
                <span className="action-icon">📦</span>
                <span>Se actualizará el stock de {existingProductsCount} productos existentes</span>
              </div>
              {newProductsCount > 0 && (
                <div className="action-item">
                  <span className="action-icon">✨</span>
                  <span>Se registrarán {newProductsCount} productos nuevos en el inventario</span>
                </div>
              )}
              {formData.supplier.isNewSupplier && (
                <div className="action-item">
                  <span className="action-icon">🏢</span>
                  <span>Se registrará el proveedor "{formData.supplier.name}" en la base de datos</span>
                </div>
              )}
              <div className="action-item">
                <span className="action-icon">📝</span>
                <span>Se generará un registro de movimiento de stock para cada producto</span>
              </div>
              <div className="action-item">
                <span className="action-icon">💰</span>
                <span>Se actualizarán los totales financieros del inventario</span>
              </div>
              <div className="action-item">
                <span className="action-icon">🔍</span>
                <span>Se creará un historial completo de la transacción</span>
              </div>
            </div>
          </div>

          {/* Advertencia */}
          <div className="confirmation-section warning-section">
            <div className="warning-box">
              <div className="warning-icon">⚠️</div>
              <div className="warning-content">
                <p><strong>Importante:</strong></p>
                <p>Una vez confirmada, esta compra se procesará inmediatamente y se actualizarán todos los registros del sistema. Asegúrate de que toda la información sea correcta antes de continuar.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={loading}
          >
            ← Revisar información
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner">🔄</span>
                Procesando compra...
              </>
            ) : (
              <>
                ✅ Confirmar y Procesar Compra
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseConfirmation;