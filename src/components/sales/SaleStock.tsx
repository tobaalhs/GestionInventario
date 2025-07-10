import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSales } from '../../hooks/useSales';
import CustomerSelector from './CustomerSelector';
import SaleProductSelector from './SaleProductSelector';
import SaleItemsList from './SaleItemsList';
import SaleConfirmation from './SaleConfirmation';
import StockCriticalAlert from './StockCriticalAlert';
import { 
  SaleFormData, 
  SaleItemForm, 
  CustomerFormData, 
  PaymentMethod, 
  SaleStatus 
} from '../../interfaces/Sale';
import { 
  generateUniqueCode, 
  validateSaleForm, 
  formDataToSale, 
  formatCLP 
} from '../../utils/saleUtils';
import { updateFinancesSummary } from '../../services/financeService';
import './SaleStock.css';

const SaleStock: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { 
    loading, 
    submitting, 
    error, 
    processSale, 
    validateStock, 
    checkCriticalStock 
  } = useSales();
  
  // Estados principales del formulario
  const [formData, setFormData] = useState<SaleFormData>({
    selectedProducts: [],
    customer: {
      isNewCustomer: false,
      rut: '',
      name: '',
      contact: '',
      email: '',
      phone: '',
      address: ''
    },
    saleDate: new Date().toISOString().split('T')[0],
    comments: '',
    paymentMethod: PaymentMethod.CASH
  });

  // Estados de UI
  const [localLoading, setLocalLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);
  const [saleTotal, setSaleTotal] = useState(0);
  const [generatedCode, setGeneratedCode] = useState('');
  const [criticalProducts, setCriticalProducts] = useState<any[]>([]);

  // Efectos
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    // Calcular total cuando cambien los productos
    const total = formData.selectedProducts.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0
    );
    setSaleTotal(total);
  }, [formData.selectedProducts]);

  // Funciones de manejo de productos
  const handleAddProduct = (product: SaleItemForm) => {
    const updatedProducts = [...formData.selectedProducts, { 
      ...product, 
      id: Date.now().toString(),
      totalPrice: product.quantity * product.unitPrice
    }];
    
    setFormData(prev => ({
      ...prev,
      selectedProducts: updatedProducts
    }));
    setErrors([]);
  };

  const handleUpdateProduct = (productId: string, updates: Partial<SaleItemForm>) => {
    const updatedProducts = formData.selectedProducts.map(product => {
      if (product.id === productId) {
        const updated = { ...product, ...updates };
        updated.totalPrice = updated.quantity * updated.unitPrice;
        return updated;
      }
      return product;
    });
    
    setFormData(prev => ({
      ...prev,
      selectedProducts: updatedProducts
    }));
  };

  const handleRemoveProduct = (productId: string) => {
    const updatedProducts = formData.selectedProducts.filter(
      product => product.id !== productId
    );
    
    setFormData(prev => ({
      ...prev,
      selectedProducts: updatedProducts
    }));
  };

  // Funciones de manejo de cliente
  const handleCustomerSelect = (customer: CustomerFormData) => {
    console.log('Cliente seleccionado en SaleStock:', customer);
    setFormData(prev => ({
      ...prev,
      customer
    }));
    setErrors([]);
  };

  // Función de manejo de cambios generales
  const handleFormChange = (field: keyof SaleFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validación del formulario
  const validateForm = (): boolean => {
    const validation = validateSaleForm(formData);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      showErrorMessage('Por favor, corrija los errores en el formulario');
      return false;
    }

    if (validation.warnings && validation.warnings.length > 0) {
      console.warn('Advertencias en el formulario:', validation.warnings);
    }

    setErrors([]);
    return true;
  };

  // Preparar venta para confirmación
  const handlePrepareConfirmation = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLocalLoading(true);

      // Verificar stock disponible
      const stockValidation = await validateStock(formData.selectedProducts);
      if (!stockValidation.isValid) {
        setErrors(stockValidation.errors);
        showErrorMessage('Stock insuficiente para algunos productos');
        return;
      }

      // Verificar productos que quedarán en stock crítico
      const criticalProductsCheck = await checkCriticalStock(formData.selectedProducts);
      
      if (criticalProductsCheck.length > 0) {
        setCriticalProducts(criticalProductsCheck);
        setShowCriticalAlert(true);
        return;
      }

      // Generar código y mostrar confirmación
      const code = generateUniqueCode('SALE');
      setGeneratedCode(code);
      setShowConfirmation(true);

    } catch (error) {
      console.error('Error preparando confirmación:', error);
      showErrorMessage('Error verificando disponibilidad de productos');
    } finally {
      setLocalLoading(false);
    }
  };

  // Procesar venta confirmada
  const handleConfirmSale = async () => {
    if (!currentUser) return;

    try {
      setLocalLoading(true);

      console.log('=== PROCESANDO VENTA ===');
      console.log('Datos del cliente:', formData.customer);

      // Convertir formulario a objeto Sale
      const saleData = formDataToSale(
        formData,
        generatedCode,
        currentUser.uid,
        currentUser.email || currentUser.displayName || 'Usuario desconocido'
      );

      console.log('Datos de venta preparados:', {
        customerId: saleData.customerId,
        customerName: saleData.customerInfo.name,
        isNewCustomer: formData.customer.isNewCustomer,
        itemsCount: saleData.items.length,
        totalAmount: saleData.totalAmount
      });

      // Procesar la venta completa
      await processSale({
        ...saleData,
        status: SaleStatus.COMPLETED
      });

      // Actualizar resumen financiero
      await updateFinancesSummary();

      // Mostrar éxito
      setShowConfirmation(false);
      showSuccessMessage(
        `Venta registrada exitosamente. Código: ${generatedCode}. Total: ${formatCLP(saleTotal)}`
      );

      // Limpiar formulario
      resetForm();

    } catch (error) {
      console.error('Error al procesar venta:', error);
      showErrorMessage(error instanceof Error ? error.message : 'Error al procesar la venta');
    } finally {
      setLocalLoading(false);
    }
  };

  // Continuar con venta a pesar de stock crítico
  const handleContinueWithCriticalStock = () => {
    setShowCriticalAlert(false);
    const code = generateUniqueCode('SALE');
    setGeneratedCode(code);
    setShowConfirmation(true);
  };

  // Cancelar venta por stock crítico
  const handleCancelCriticalStock = () => {
    setShowCriticalAlert(false);
    setCriticalProducts([]);
  };

  // Limpiar formulario
  const resetForm = () => {
    setFormData({
      selectedProducts: [],
      customer: {
        isNewCustomer: false,
        rut: '',
        name: '',
        contact: '',
        email: '',
        phone: '',
        address: ''
      },
      saleDate: new Date().toISOString().split('T')[0],
      comments: '',
      paymentMethod: PaymentMethod.CASH
    });
    setGeneratedCode('');
    setSaleTotal(0);
    setCriticalProducts([]);
    setErrors([]);
  };

  // Funciones de mensajes
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const showErrorMessage = (message: string) => {
    setErrors([message]);
    setTimeout(() => setErrors([]), 5000);
  };

  if (!currentUser) {
    return <div className="loading-spinner">Cargando...</div>;
  }

  const isFormLoading = loading || submitting || localLoading;

  return (
    <div className="stock-sale-container">
      {/* Header */}
      <div className="sale-header">
        <div className="header-content">
          <button 
            className="btn btn-secondary back-btn"
            onClick={() => navigate('/dashboard')}
            title="Volver al Dashboard"
          >
            ← Volver al Dashboard
          </button>
          <div className="header-title">
            <h1>💰 Venta de Stock</h1>
            <p>Registra nuevas ventas de productos</p>
          </div>
        </div>
      </div>

      {/* Debug info - Solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && formData.customer.rut && (
        <div style={{ backgroundColor: '#e8f5e8', border: '1px solid #4caf50', padding: '10px', marginBottom: '20px', borderRadius: '4px' }}>
          <strong>🔧 Debug - Información del Cliente:</strong><br/>
          ID: <code>{formData.customer.id || 'SIN ID'}</code> | 
          Es Nuevo: <code>{formData.customer.isNewCustomer ? 'SÍ' : 'NO'}</code> | 
          RUT: <code>{formData.customer.rut}</code> | 
          Nombre: <code>{formData.customer.name}</code>
        </div>
      )}

      {/* Mensajes */}
      {successMessage && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          <span className="alert-message">{successMessage}</span>
          <button 
            className="alert-close"
            onClick={() => setSuccessMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {errors.length > 0 && (
        <div className="alert alert-error">
          <span className="alert-icon">❌</span>
          <div className="alert-messages">
            {errors.map((error, index) => (
              <div key={index} className="alert-message">{error}</div>
            ))}
          </div>
          <button 
            className="alert-close"
            onClick={() => setErrors([])}
          >
            ✕
          </button>
        </div>
      )}

      {/* Formulario Principal */}
      <div className="sale-form-container">
        <div className="form-sections">
          
          {/* Sección de Productos */}
          <div className="form-section">
            <h3>📦 Selección de Productos</h3>
            <SaleProductSelector onAddProduct={handleAddProduct} />
            
            <SaleItemsList
              items={formData.selectedProducts}
              onUpdateItem={handleUpdateProduct}
              onRemoveItem={handleRemoveProduct}
            />
          </div>

          {/* Sección de Cliente */}
          <div className="form-section">
            <h3>👤 Información del Cliente</h3>
            <CustomerSelector
              selectedCustomer={formData.customer}
              onCustomerSelect={handleCustomerSelect}
            />
          </div>

          {/* Sección de Detalles de Venta */}
          <div className="form-section">
            <h3>📅 Detalles de la Venta</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="saleDate">Fecha de Venta</label>
                <input
                  type="date"
                  id="saleDate"
                  value={formData.saleDate}
                  onChange={(e) => handleFormChange('saleDate', e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="paymentMethod">Método de Pago</label>
                <select
                  id="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={(e) => handleFormChange('paymentMethod', e.target.value as PaymentMethod)}
                  className="form-select"
                  required
                >
                  <option value={PaymentMethod.CASH}>Efectivo</option>
                  <option value={PaymentMethod.CREDIT_CARD}>Tarjeta de Crédito</option>
                  <option value={PaymentMethod.DEBIT_CARD}>Tarjeta de Débito</option>
                  <option value={PaymentMethod.TRANSFER}>Transferencia</option>
                  <option value={PaymentMethod.CHECK}>Cheque</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="comments" className="optional">
                Comentarios sobre la venta
              </label>
              <textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => handleFormChange('comments', e.target.value)}
                className="form-input"
                rows={3}
                placeholder="Información adicional sobre la venta..."
              />
            </div>
          </div>

          {/* Resumen de Totales */}
          <div className="form-section">
            <div className="sale-summary">
              <h3>💰 Resumen de la Venta</h3>
              <div className="summary-row">
                <span>Total de productos:</span>
                <span>{formData.selectedProducts.length}</span>
              </div>
              <div className="summary-row">
                <span>Cantidad total:</span>
                <span>{formData.selectedProducts.reduce((sum, item) => sum + item.quantity, 0)} unidades</span>
              </div>
              <div className="summary-row total">
                <span>Total a cobrar:</span>
                <span className="total-amount">
                  {formatCLP(saleTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="form-actions">
            <button
              type="button"
              onClick={resetForm}
              className="btn btn-secondary"
              disabled={isFormLoading}
            >
              🔄 Limpiar Formulario
            </button>
            
            <button
              type="button"
              onClick={handlePrepareConfirmation}
              className="btn btn-primary"
              disabled={isFormLoading || formData.selectedProducts.length === 0 || !formData.customer.rut}
            >
              {isFormLoading ? '🔄 Procesando...' : '📋 Revisar y Confirmar Venta'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Alerta de Stock Crítico */}
      {showCriticalAlert && (
        <StockCriticalAlert
          products={criticalProducts}
          onConfirm={handleContinueWithCriticalStock}
          onCancel={handleCancelCriticalStock}
        />
      )}

      {/* Modal de Confirmación */}
      {showConfirmation && (
        <SaleConfirmation
          formData={formData}
          saleTotal={saleTotal}
          generatedCode={generatedCode}
          onConfirm={handleConfirmSale}
          onCancel={() => setShowConfirmation(false)}
          loading={isFormLoading}
          criticalProducts={criticalProducts}
        />
      )}
    </div>
  );
};

export default SaleStock;