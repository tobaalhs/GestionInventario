import React from 'react';
import { SaleFormData, PaymentMethod, CriticalStockProduct } from '../../interfaces/Sale';
import { getPaymentMethodText, formatCLP, formatDate } from '../../utils/saleUtils';

interface SaleConfirmationProps {
  formData: SaleFormData;
  saleTotal: number;
  generatedCode: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  criticalProducts?: CriticalStockProduct[];
}

const SaleConfirmation: React.FC<SaleConfirmationProps> = ({
  formData,
  saleTotal,
  generatedCode,
  onConfirm,
  onCancel,
  loading,
  criticalProducts = []
}) => {
  // Calcular totales
  const totalQuantity = formData.selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
  const totalItems = formData.selectedProducts.length;

  // Verificar productos críticos
  const hasProductsWithCriticalStock = criticalProducts.length > 0;
  const productsOutOfStock = criticalProducts.filter(p => p.isOut);
  const productsWithCriticalStock = criticalProducts.filter(p => p.isCritical && !p.isOut);

  return (
    <div className="modal-overlay">
      <div className="modal confirmation-modal">
        <div className="modal-header">
          <h2>💰 Confirmar Venta</h2>
          <button 
            className="close-btn"
            onClick={onCancel}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Código de venta */}
          <div className="confirmation-section">
            <div className="code-section">
              <h3>🏷️ Código de Venta</h3>
              <div className="generated-code">
                <code>{generatedCode}</code>
              </div>
              <small>Este código se generará automáticamente al confirmar la venta</small>
            </div>
          </div>

          {/* Información del cliente */}
          <div className="confirmation-section">
            <h3>👤 Cliente</h3>
            <div className="customer-summary">
              <div className="customer-info">
                <div className="info-row">
                  <strong>{formData.customer.name}</strong>
                  {formData.customer.isNewCustomer && (
                    <span className="new-badge">Nuevo Cliente</span>
                  )}
                </div>
                <div className="info-row">
                  <span>RUT: {formData.customer.rut}</span>
                  <span>Contacto: {formData.customer.contact}</span>
                </div>
                {formData.customer.email && (
                  <div className="info-row">
                    <span>Email: {formData.customer.email}</span>
                  </div>
                )}
                {formData.customer.phone && (
                  <div className="info-row">
                    <span>Teléfono: {formData.customer.phone}</span>
                  </div>
                )}
                {formData.customer.address && (
                  <div className="info-row">
                    <span>Dirección: {formData.customer.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resumen de productos */}
          <div className="confirmation-section">
            <h3>🛒 Productos de la Venta</h3>
            <div className="products-summary">
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-label">Total de productos:</span>
                  <span className="stat-value">{totalItems}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Cantidad total:</span>
                  <span className="stat-value">{totalQuantity} unidades</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Método de pago:</span>
                  <span className="stat-value">{getPaymentMethodText(formData.paymentMethod)}</span>
                </div>
              </div>

              <div className="products-list">
                {formData.selectedProducts.map((product, index) => {
                  const remainingStock = product.availableStock - product.quantity;
                  const isCritical = remainingStock <= 5;
                  const isOut = remainingStock === 0;
                  
                  return (
                    <div key={product.id || index} className={`product-summary-item ${isCritical ? 'critical-stock' : ''}`}>
                      <div className="product-header">
                        <span className="product-name">{product.productName}</span>
                        <span className="product-code">({product.productCode})</span>
                        {isOut && (
                          <span className="stock-indicator out-of-stock">🚫 Se agotará</span>
                        )}
                        {isCritical && !isOut && (
                          <span className="stock-indicator critical">⚠️ Stock crítico</span>
                        )}
                      </div>
                      <div className="product-details">
                        <span>Categoría: {product.category}</span>
                        <span>Cantidad: {product.quantity} unidades</span>
                        <span>Precio unitario: {formatCLP(product.unitPrice)}</span>
                        <span>Stock actual: {product.availableStock}</span>
                        <span className={`remaining-stock ${isCritical ? 'critical' : ''}`}>
                          Stock restante: {remainingStock} unidades
                        </span>
                        <span className="product-total">
                          Subtotal: {formatCLP(product.quantity * product.unitPrice)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detalles de la venta */}
          <div className="confirmation-section">
            <h3>📅 Detalles de la Venta</h3>
            <div className="sale-details">
              <div className="detail-row">
                <span className="detail-label">Fecha de venta:</span>
                <span className="detail-value">{formatDate(new Date(formData.saleDate))}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Método de pago:</span>
                <span className="detail-value">{getPaymentMethodText(formData.paymentMethod)}</span>
              </div>
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
            <h3>💰 Total de la Venta</h3>
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
                <span>Total a cobrar:</span>
                <span className="total-amount">{formatCLP(saleTotal)}</span>
              </div>
            </div>
          </div>

          {/* Alertas de stock crítico */}
          {hasProductsWithCriticalStock && (
            <div className="confirmation-section stock-alert-section">
              <h3>⚠️ Alertas de Stock</h3>
              <div className="stock-alerts">
                {productsOutOfStock.length > 0 && (
                  <div className="alert-group out-of-stock">
                    <h4>🚫 Productos que se agotarán:</h4>
                    <ul>
                      {productsOutOfStock.map(product => (
                        <li key={product.productId}>
                          <strong>{product.productName}</strong> - Se agotará completamente
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {productsWithCriticalStock.length > 0 && (
                  <div className="alert-group critical-stock">
                    <h4>⚠️ Productos en stock crítico:</h4>
                    <ul>
                      {productsWithCriticalStock.map(product => (
                        <li key={product.productId}>
                          <strong>{product.productName}</strong> - Quedarán {product.newStock} unidades
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="alert-notice">
                  <p><strong>Nota:</strong> Se generarán alertas automáticas para estos productos después de completar la venta.</p>
                </div>
              </div>
            </div>
          )}

          {/* Acciones que se realizarán */}
          <div className="confirmation-section actions-section">
            <h3>⚡ Acciones que se realizarán</h3>
            <div className="actions-list">
              <div className="action-item">
                <span className="action-icon">📦</span>
                <span>Se actualizará el stock de {totalItems} productos</span>
              </div>
              {formData.customer.isNewCustomer && (
                <div className="action-item">
                  <span className="action-icon">👤</span>
                  <span>Se registrará el cliente "{formData.customer.name}" en la base de datos</span>
                </div>
              )}
              <div className="action-item">
                <span className="action-icon">📝</span>
                <span>Se generará un registro de movimiento de stock para cada producto vendido</span>
              </div>
              <div className="action-item">
                <span className="action-icon">💰</span>
                <span>Se actualizarán los totales financieros y estadísticas de ventas</span>
              </div>
              <div className="action-item">
                <span className="action-icon">🔔</span>
                <span>Se registrará la venta en el historial del cliente</span>
              </div>
              {hasProductsWithCriticalStock && (
                <div className="action-item">
                  <span className="action-icon">⚠️</span>
                  <span>Se crearán alertas de stock crítico para {criticalProducts.length} productos</span>
                </div>
              )}
            </div>
          </div>

          {/* Advertencia */}
          <div className="confirmation-section warning-section">
            <div className="warning-box">
              <div className="warning-icon">⚠️</div>
              <div className="warning-content">
                <p><strong>Importante:</strong></p>
                <p>Una vez confirmada, esta venta se procesará inmediatamente y se actualizarán todos los registros del sistema. El stock se reducirá automáticamente y no podrá revertirse fácilmente.</p>
                {hasProductsWithCriticalStock && (
                  <p><strong>Advertencia de stock:</strong> Algunos productos quedarán en niveles críticos. Considere realizar pedidos de reposición pronto.</p>
                )}
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
                Procesando venta...
              </>
            ) : (
              <>
                ✅ Confirmar y Procesar Venta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaleConfirmation;