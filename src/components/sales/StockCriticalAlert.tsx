import React from 'react';
import { CriticalStockProduct } from '../../interfaces/Sale';

interface StockCriticalAlertProps {
  products: CriticalStockProduct[];
  onConfirm: () => void;
  onCancel: () => void;
  message?: string;
}

const StockCriticalAlert: React.FC<StockCriticalAlertProps> = ({
  products,
  onConfirm,
  onCancel,
  message = "Los siguientes productos quedarán en stock crítico o se agotarán:"
}) => {
  // Separar productos por tipo de criticidad
  const outOfStockProducts = products.filter(p => p.isOut);
  const criticalStockProducts = products.filter(p => p.isCritical && !p.isOut);

  return (
    <div className="modal-overlay">
      <div className="modal alert-modal stock-critical-modal">
        <div className="modal-header alert-header">
          <h2>⚠️ Advertencia de Stock</h2>
          <button 
            className="close-btn"
            onClick={onCancel}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="alert-intro">
            <div className="alert-icon-large">
              ⚠️
            </div>
            <div className="alert-message">
              <h3>Stock Crítico Detectado</h3>
              <p>{message}</p>
            </div>
          </div>

          {/* Productos que se agotarán */}
          {outOfStockProducts.length > 0 && (
            <div className="critical-products-section">
              <h4 className="section-title out-of-stock-title">
                🚫 Productos que se agotarán completamente ({outOfStockProducts.length})
              </h4>
              <div className="products-grid">
                {outOfStockProducts.map(product => (
                  <div key={product.productId} className="critical-product-card out-of-stock">
                    <div className="product-header">
                      <div className="product-name">{product.productName}</div>
                      <div className="product-code">({product.productCode})</div>
                    </div>
                    <div className="stock-info">
                      <div className="stock-row">
                        <span>Stock actual:</span>
                        <span className="current-stock">{product.currentStock}</span>
                      </div>
                      <div className="stock-row">
                        <span>Cantidad vendida:</span>
                        <span className="sold-quantity">-{product.quantitySold}</span>
                      </div>
                      <div className="stock-row final-stock">
                        <span>Stock restante:</span>
                        <span className="new-stock out-of-stock">
                          {product.newStock} ⚠️
                        </span>
                      </div>
                    </div>
                    <div className="alert-badge out-of-stock-badge">
                      AGOTADO
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Productos en stock crítico */}
          {criticalStockProducts.length > 0 && (
            <div className="critical-products-section">
              <h4 className="section-title critical-title">
                ⚠️ Productos en stock crítico ({criticalStockProducts.length})
              </h4>
              <div className="products-grid">
                {criticalStockProducts.map(product => (
                  <div key={product.productId} className="critical-product-card critical">
                    <div className="product-header">
                      <div className="product-name">{product.productName}</div>
                      <div className="product-code">({product.productCode})</div>
                    </div>
                    <div className="stock-info">
                      <div className="stock-row">
                        <span>Stock actual:</span>
                        <span className="current-stock">{product.currentStock}</span>
                      </div>
                      <div className="stock-row">
                        <span>Cantidad vendida:</span>
                        <span className="sold-quantity">-{product.quantitySold}</span>
                      </div>
                      <div className="stock-row final-stock">
                        <span>Stock restante:</span>
                        <span className="new-stock critical">
                          {product.newStock} ⚠️
                        </span>
                      </div>
                    </div>
                    <div className="alert-badge critical-badge">
                      CRÍTICO
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="alert-info">
            <div className="info-box">
              <h4>📋 Información Importante</h4>
              <ul>
                <li><strong>Stock crítico:</strong> Productos con 5 unidades o menos</li>
                <li><strong>Productos agotados:</strong> No tendrán stock disponible para futuras ventas</li>
                <li>Se generarán alertas automáticas para notificar a los administradores</li>
                <li>Se recomienda realizar pedidos de reposición para estos productos</li>
              </ul>
            </div>
          </div>

          {/* Resumen de acciones */}
          <div className="alert-actions-summary">
            <h4>🔄 Acciones que se realizarán al continuar:</h4>
            <div className="actions-list">
              <div className="action-item">
                <span className="action-icon">📦</span>
                <span>Se actualizará el stock de todos los productos</span>
              </div>
              <div className="action-item">
                <span className="action-icon">🔔</span>
                <span>Se crearán {products.length} alertas de stock crítico</span>
              </div>
              <div className="action-item">
                <span className="action-icon">📧</span>
                <span>Se notificará a los administradores sobre el stock crítico</span>
              </div>
              <div className="action-item">
                <span className="action-icon">📝</span>
                <span>Se registrará en el log del sistema para seguimiento</span>
              </div>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="alert-stats">
            <div className="stat-item">
              <div className="stat-number">{products.length}</div>
              <div className="stat-label">Productos afectados</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{outOfStockProducts.length}</div>
              <div className="stat-label">Se agotarán</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{criticalStockProducts.length}</div>
              <div className="stat-label">Stock crítico</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">
                {products.reduce((sum, p) => sum + p.quantitySold, 0)}
              </div>
              <div className="stat-label">Unidades totales</div>
            </div>
          </div>
        </div>

        <div className="modal-footer alert-footer">
          <div className="footer-message">
            <span className="warning-icon">⚠️</span>
            <span>¿Desea continuar con la venta a pesar de las advertencias de stock?</span>
          </div>
          <div className="footer-actions">
            <button
              onClick={onCancel}
              className="btn btn-secondary"
            >
              ← Cancelar y revisar
            </button>
            <button
              onClick={onConfirm}
              className="btn btn-warning"
            >
              ⚠️ Continuar con la venta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockCriticalAlert;