import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ProductSelector from './ProductSelector';
import SupplierSelector from './SupplierSelector';
import PurchaseItemsList from './PurchaseItemsList';
import PurchaseConfirmation from './PurchaseConfirmation';
import { validatePurchaseForm, calculatePurchaseTotal, generateUniqueCode } from '../../utils/purchaseUtils';
import { createPurchase, processPurchaseTransaction } from '../../services/purchaseService';
import { updateFinancesSummary } from '../../services/financeService';
import { PurchaseStatus } from '../../interfaces/Purchase';
import './StockPurchase.css';

// Interfaces locales para el formulario
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
  address?: string;
}

interface PurchaseFormData {
  selectedProducts: PurchaseItemForm[];
  supplier: SupplierFormData;
  purchaseDate: string;
  expirationDate: string;
  comments: string;
}

const StockPurchase: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  
  // Estados principales
  const [formData, setFormData] = useState<PurchaseFormData>({
    selectedProducts: [],
    supplier: {
      isNewSupplier: false,
      rut: '',
      name: '',
      contact: '',
      email: '',
      phone: '',
      address: ''
    },
    purchaseDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    comments: ''
  });

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [purchaseTotal, setPurchaseTotal] = useState(0);
  const [generatedCode, setGeneratedCode] = useState('');

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
    setPurchaseTotal(total);
  }, [formData.selectedProducts]);

  // Funciones de manejo de datos
  const handleAddProduct = (product: PurchaseItemForm) => {
    const updatedProducts = [...formData.selectedProducts, { 
      ...product, 
      id: Date.now().toString() 
    }];
    setFormData(prev => ({
      ...prev,
      selectedProducts: updatedProducts
    }));
    setErrors([]);
  };

  const handleUpdateProduct = (productId: string, updates: Partial<PurchaseItemForm>) => {
    const updatedProducts = formData.selectedProducts.map(product =>
      product.id === productId ? { ...product, ...updates } : product
    );
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

  const handleSupplierSelect = (supplier: SupplierFormData) => {
    console.log('Proveedor seleccionado en StockPurchase:', supplier);
    setFormData(prev => ({
      ...prev,
      supplier
    }));
    setErrors([]);
  };

  const handleFormChange = (field: keyof PurchaseFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validación del formulario
  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    if (formData.selectedProducts.length === 0) {
      validationErrors.push('Debe agregar al menos un producto');
    }

    if (!formData.supplier.rut.trim()) {
      validationErrors.push('Debe seleccionar un proveedor');
    }

    if (!formData.purchaseDate) {
      validationErrors.push('La fecha de compra es obligatoria');
    }

    // Validar productos
    formData.selectedProducts.forEach((product, index) => {
      if (!product.productName.trim()) {
        validationErrors.push(`Producto ${index + 1}: El nombre es obligatorio`);
      }
      if (!product.productCode.trim()) {
        validationErrors.push(`Producto ${index + 1}: El código es obligatorio`);
      }
      if (product.quantity <= 0) {
        validationErrors.push(`Producto ${index + 1}: La cantidad debe ser mayor a 0`);
      }
      if (product.unitPrice <= 0) {
        validationErrors.push(`Producto ${index + 1}: El precio debe ser mayor a 0`);
      }
    });

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  // Preparar compra para confirmación
  const handlePrepareConfirmation = () => {
    if (!validateForm()) {
      showErrorMessage('Por favor, corrija los errores en el formulario');
      return;
    }

    const code = generateUniqueCode('COMP');
    setGeneratedCode(code);
    setShowConfirmation(true);
  };

  // Procesar compra - AQUÍ ESTÁ LA CORRECCIÓN PRINCIPAL
  const handleConfirmPurchase = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      console.log('=== PROCESANDO COMPRA ===');
      console.log('Datos del proveedor:', formData.supplier);

      // ✅ LÓGICA CORREGIDA PARA MANEJAR PROVEEDORES EXISTENTES VS NUEVOS
      let supplierId = '';
      let supplierInfo;

      if (formData.supplier.isNewSupplier || !formData.supplier.id) {
        // Caso 1: Proveedor nuevo o sin ID
        console.log('Caso: Proveedor nuevo - se creará durante la transacción');
        supplierId = ''; // Se creará en processPurchaseTransaction
        supplierInfo = {
          id: '',
          rut: formData.supplier.rut,
          name: formData.supplier.name,
          contact: formData.supplier.contact,
          email: formData.supplier.email || '',
          phone: formData.supplier.phone || '',
          address: formData.supplier.address || '',
          isActive: true,
          totalPurchases: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      } else {
        // Caso 2: Proveedor existente con ID
        console.log('Caso: Proveedor existente con ID:', formData.supplier.id);
        supplierId = formData.supplier.id;
        supplierInfo = {
          id: formData.supplier.id,
          rut: formData.supplier.rut,
          name: formData.supplier.name,
          contact: formData.supplier.contact,
          email: formData.supplier.email || '',
          phone: formData.supplier.phone || '',
          address: formData.supplier.address || '',
          isActive: true,
          totalPurchases: 0, // Se actualizará en el servicio
          createdAt: new Date(), // Se mantendrá el original en el servicio
          updatedAt: new Date()
        };
      }

      console.log('SupplierId final:', supplierId);
      console.log('SupplierInfo:', supplierInfo);

      // Crear objeto de compra CON LA LÓGICA CORREGIDA
      const purchaseData = {
        id: '',
        code: generatedCode,
        items: formData.selectedProducts.map(product => ({
          productId: product.productId || '',
          productCode: product.productCode,
          productName: product.productName,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          totalPrice: product.quantity * product.unitPrice,
          expirationDate: product.expirationDate ? new Date(product.expirationDate) : undefined,
          batchCode: `${generatedCode}-${product.productCode}`,
          category: product.category || 'Sin categoría',
          isNewProduct: product.isNewProduct
        })),
        supplierId: supplierId, // ✅ Usar el ID correcto (vacío para nuevos, con valor para existentes)
        supplierInfo: supplierInfo, // ✅ Información completa del proveedor
        purchaseDate: new Date(formData.purchaseDate),
        expirationDate: formData.expirationDate ? new Date(formData.expirationDate) : undefined,
        totalAmount: purchaseTotal,
        totalQuantity: formData.selectedProducts.reduce((sum, item) => sum + item.quantity, 0),
        comments: formData.comments,
        userId: currentUser.uid,
        userEmail: currentUser.email || currentUser.displayName || 'Usuario desconocido',
        status: PurchaseStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Datos de compra finales:', {
        supplierId: purchaseData.supplierId,
        isNewSupplier: formData.supplier.isNewSupplier,
        supplierHasId: !!formData.supplier.id
      });

      // Procesar la transacción completa
      await processPurchaseTransaction(purchaseData);

      // Actualizar resumen financiero
      await updateFinancesSummary();

      // Mostrar éxito
      setShowConfirmation(false);
      showSuccessMessage(
        `Compra registrada exitosamente. Código: ${generatedCode}. Stock actualizado para ${purchaseData.items.length} productos.`
      );

      // Limpiar formulario
      resetForm();

    } catch (error) {
      console.error('Error al procesar compra:', error);
      showErrorMessage(error instanceof Error ? error.message : 'Error al procesar la compra');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      selectedProducts: [],
      supplier: {
        isNewSupplier: false,
        rut: '',
        name: '',
        contact: '',
        email: '',
        phone: '',
        address: ''
      },
      purchaseDate: new Date().toISOString().split('T')[0],
      expirationDate: '',
      comments: ''
    });
    setGeneratedCode('');
    setPurchaseTotal(0);
  };

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

  return (
    <div className="stock-purchase-container">
      {/* Header */}
      <div className="purchase-header">
        <div className="header-content">
          <button 
            className="btn btn-secondary back-btn"
            onClick={() => navigate('/dashboard')}
            title="Volver al Dashboard"
          >
            ← Volver al Dashboard
          </button>
          <div className="header-title">
            <h1>🛒 Compra de Stock</h1>
            <p>Registra nuevas compras e ingresos de inventario</p>
          </div>
        </div>
      </div>

      {/* Debug info - Solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && formData.supplier.rut && (
        <div style={{ backgroundColor: '#e0f2fe', border: '1px solid #0277bd', padding: '10px', marginBottom: '20px', borderRadius: '4px' }}>
          <strong>🔧 Debug - Información del Proveedor:</strong><br/>
          ID: <code>{formData.supplier.id || 'SIN ID'}</code> | 
          Es Nuevo: <code>{formData.supplier.isNewSupplier ? 'SÍ' : 'NO'}</code> | 
          RUT: <code>{formData.supplier.rut}</code> | 
          Nombre: <code>{formData.supplier.name}</code>
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
      <div className="purchase-form-container">
        <div className="form-sections">
          
          {/* Sección de Productos */}
          <div className="form-section">
            <h3>📦 Selección de Productos</h3>
            <ProductSelector onAddProduct={handleAddProduct} />
            
            <PurchaseItemsList
              items={formData.selectedProducts}
              onUpdateItem={handleUpdateProduct}
              onRemoveItem={handleRemoveProduct}
            />
          </div>

          {/* Sección de Proveedor */}
          <div className="form-section">
            <h3>🏢 Información del Proveedor</h3>
            <SupplierSelector
              selectedSupplier={formData.supplier}
              onSupplierSelect={handleSupplierSelect}
            />
          </div>

          {/* Sección de Detalles de Compra */}
          <div className="form-section">
            <h3>📅 Detalles de la Compra</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="purchaseDate">Fecha de Compra</label>
                <input
                  type="date"
                  id="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={(e) => handleFormChange('purchaseDate', e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="expirationDate" className="optional">
                  Fecha de Vencimiento del Lote
                </label>
                <input
                  type="date"
                  id="expirationDate"
                  value={formData.expirationDate}
                  onChange={(e) => handleFormChange('expirationDate', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="comments" className="optional">
                Comentarios sobre la compra
              </label>
              <textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => handleFormChange('comments', e.target.value)}
                className="form-input"
                rows={3}
                placeholder="Información adicional sobre la compra..."
              />
            </div>
          </div>

          {/* Resumen de Totales */}
          <div className="form-section">
            <div className="purchase-summary">
              <h3>💰 Resumen de la Compra</h3>
              <div className="summary-row">
                <span>Total de productos:</span>
                <span>{formData.selectedProducts.length}</span>
              </div>
              <div className="summary-row">
                <span>Cantidad total:</span>
                <span>{formData.selectedProducts.reduce((sum, item) => sum + item.quantity, 0)} unidades</span>
              </div>
              <div className="summary-row total">
                <span>Total a pagar:</span>
                <span className="total-amount">
                  {new Intl.NumberFormat('es-CL', {
                    style: 'currency',
                    currency: 'CLP'
                  }).format(purchaseTotal)}
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
              disabled={loading}
            >
              🔄 Limpiar Formulario
            </button>
            
            <button
              type="button"
              onClick={handlePrepareConfirmation}
              className="btn btn-primary"
              disabled={loading || formData.selectedProducts.length === 0 || !formData.supplier.rut}
            >
              {loading ? '🔄 Procesando...' : '📋 Revisar y Confirmar Compra'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación */}
      {showConfirmation && (
        <PurchaseConfirmation
          formData={formData}
          purchaseTotal={purchaseTotal}
          generatedCode={generatedCode}
          onConfirm={handleConfirmPurchase}
          onCancel={() => setShowConfirmation(false)}
          loading={loading}
        />
      )}
    </div>
  );
};

export default StockPurchase;