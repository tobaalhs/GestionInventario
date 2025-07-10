import { useState, useEffect, useCallback } from 'react';
import { 
  Sale, 
  SaleFilters, 
  SaleStatistics, 
  SaleFormData, 
  SaleFormState,
  SaleFormErrors,
  StockValidationResult,
  CriticalStockProduct,
  ValidationResult,
  SaleStatus,
  PaymentMethod
} from '../interfaces/Sale';
import { 
  getSales,
  createSale,
  processSaleTransaction,
  getSaleStatistics,
  generateSaleCode,
  validateSaleData,
  checkStockAvailability,
  checkCriticalStockAfterSale
} from '../services/saleService';
import { useAuth } from '../contexts/AuthContext';

interface UseSalesReturn {
  // Estados de datos
  sales: Sale[];
  currentSale: Sale | null;
  statistics: SaleStatistics | null;
  
  // Estados de UI
  loading: boolean;
  submitting: boolean;
  error: string | null;
  
  // Estado del formulario
  formState: SaleFormState;
  
  // Funciones principales
  loadSales: (filters?: SaleFilters) => Promise<void>;
  loadStatistics: (startDate?: Date, endDate?: Date) => Promise<void>;
  createNewSale: (saleData: Sale) => Promise<void>;
  processSale: (saleData: Sale) => Promise<void>;
  
  // Funciones del formulario
  initializeForm: () => void;
  updateFormData: (updates: Partial<SaleFormData>) => void;
  validateForm: () => boolean;
  generateCode: () => string;
  
  // Validaciones
  validateStock: (items: any[]) => Promise<StockValidationResult>;
  checkCriticalStock: (items: any[]) => Promise<CriticalStockProduct[]>;
  
  // Utilidades
  resetForm: () => void;
  clearError: () => void;
  setFormErrors: (errors: SaleFormErrors) => void;
}

export const useSales = (): UseSalesReturn => {
  const { currentUser } = useAuth();
  
  // Estados principales
  const [sales, setSales] = useState<Sale[]>([]);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [statistics, setStatistics] = useState<SaleStatistics | null>(null);
  
  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado del formulario inicial
  const initialFormState: SaleFormState = {
    formData: {
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
    },
    isSubmitting: false,
    isValid: false,
    hasUnsavedChanges: false,
    errors: {
      general: [],
      products: [],
      customer: {
        rut: [],
        name: [],
        contact: [],
        email: [],
        phone: []
      },
      sale: {
        saleDate: [],
        paymentMethod: [],
        comments: [],
        totalAmount: []
      }
    },
    warnings: [],
    totalAmount: 0,
    totalQuantity: 0,
    totalItems: 0,
    criticalProducts: [],
    showCriticalAlert: false,
    showConfirmation: false,
    generatedCode: ''
  };
  
  const [formState, setFormState] = useState<SaleFormState>(initialFormState);

  // Cargar ventas
  const loadSales = useCallback(async (filters?: SaleFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Cargando ventas con filtros:', filters);
      const salesData = await getSales(filters);
      
      setSales(salesData);
      console.log(`✅ ${salesData.length} ventas cargadas`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando ventas';
      setError(errorMessage);
      console.error('❌ Error cargando ventas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar estadísticas
  const loadStatistics = useCallback(async (startDate?: Date, endDate?: Date) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📈 Cargando estadísticas de ventas...');
      const stats = await getSaleStatistics(startDate, endDate);
      
      setStatistics(stats);
      console.log('✅ Estadísticas cargadas');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando estadísticas';
      setError(errorMessage);
      console.error('❌ Error cargando estadísticas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Crear nueva venta
  const createNewSale = useCallback(async (saleData: Sale) => {
    try {
      setSubmitting(true);
      setError(null);
      
      console.log('🏗️ Creando nueva venta:', saleData.code);
      await createSale(saleData);
      
      // Recargar la lista de ventas
      await loadSales();
      
      console.log('✅ Venta creada exitosamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creando venta';
      setError(errorMessage);
      console.error('❌ Error creando venta:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [loadSales]);

  // Procesar venta completa
  const processSale = useCallback(async (saleData: Sale) => {
    try {
      setSubmitting(true);
      setError(null);
      
      console.log('⚙️ Procesando venta completa:', saleData.code);
      await processSaleTransaction(saleData);
      
      // Recargar datos
      await loadSales();
      if (statistics) {
        await loadStatistics();
      }
      
      console.log('✅ Venta procesada exitosamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error procesando venta';
      setError(errorMessage);
      console.error('❌ Error procesando venta:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [loadSales, loadStatistics, statistics]);

  // Inicializar formulario
  const initializeForm = useCallback(() => {
    setFormState(initialFormState);
  }, [initialFormState]);

  // Actualizar datos del formulario
  const updateFormData = useCallback((updates: Partial<SaleFormData>) => {
    setFormState(prev => {
      const newFormData = { ...prev.formData, ...updates };
      
      // Recalcular totales
      const totalQuantity = newFormData.selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = newFormData.selectedProducts.reduce((sum, item) => sum + item.totalPrice, 0);
      const totalItems = newFormData.selectedProducts.length;
      
      return {
        ...prev,
        formData: newFormData,
        totalQuantity,
        totalAmount,
        totalItems,
        hasUnsavedChanges: true,
        isValid: totalItems > 0 && newFormData.customer.rut.trim() !== ''
      };
    });
  }, []);

  // Validar formulario
  const validateForm = useCallback((): boolean => {
    const errors: SaleFormErrors = {
      general: [],
      products: [],
      customer: {
        rut: [],
        name: [],
        contact: [],
        email: [],
        phone: []
      },
      sale: {
        saleDate: [],
        paymentMethod: [],
        comments: [],
        totalAmount: []
      }
    };

    const { formData } = formState;

    // Validar productos
    if (formData.selectedProducts.length === 0) {
      errors.general.push('Debe agregar al menos un producto');
    }

    formData.selectedProducts.forEach((product, index) => {
      const productErrors = {
        productId: product.id,
        quantity: [] as string[],
        unitPrice: [] as string[],
        stock: [] as string[]
      };

      if (product.quantity <= 0) {
        productErrors.quantity.push('La cantidad debe ser mayor a 0');
      }

      if (product.quantity > product.maxQuantity) {
        productErrors.stock.push(`Stock insuficiente (máximo: ${product.maxQuantity})`);
      }

      if (product.unitPrice <= 0) {
        productErrors.unitPrice.push('El precio debe ser mayor a 0');
      }

      if (productErrors.quantity.length > 0 || productErrors.unitPrice.length > 0 || productErrors.stock.length > 0) {
        errors.products.push(productErrors);
      }
    });

    // Validar cliente
    if (!formData.customer.rut.trim()) {
      errors.customer.rut.push('El RUT es obligatorio');
    }

    if (!formData.customer.name.trim()) {
      errors.customer.name.push('El nombre es obligatorio');
    }

    if (!formData.customer.contact.trim()) {
      errors.customer.contact.push('La información de contacto es obligatoria');
    }

    // Validar venta
    if (!formData.saleDate) {
      errors.sale.saleDate.push('La fecha de venta es obligatoria');
    }

    if (formState.totalAmount <= 0) {
      errors.sale.totalAmount.push('El monto total debe ser mayor a 0');
    }

    // Actualizar errores en el estado
    setFormState(prev => ({
      ...prev,
      errors,
      isValid: errors.general.length === 0 && 
               errors.products.length === 0 && 
               errors.customer.rut.length === 0 && 
               errors.customer.name.length === 0 && 
               errors.customer.contact.length === 0 &&
               errors.sale.saleDate.length === 0 &&
               errors.sale.totalAmount.length === 0
    }));

    return formState.isValid;
  }, [formState]);

  // Generar código de venta
  const generateCode = useCallback((): string => {
    const code = generateSaleCode();
    setFormState(prev => ({
      ...prev,
      generatedCode: code
    }));
    return code;
  }, []);

  // Validar stock
  const validateStock = useCallback(async (items: any[]): Promise<StockValidationResult> => {
    try {
      console.log('🔍 Validando stock para productos...');
      const result = await checkStockAvailability(items);
      
      // Actualizar productos críticos en el estado
      setFormState(prev => ({
        ...prev,
        criticalProducts: result.criticalProducts,
        showCriticalAlert: result.criticalProducts.length > 0
      }));
      
      return result;
    } catch (error) {
      console.error('Error validando stock:', error);
      throw error;
    }
  }, []);

  // Verificar stock crítico
  const checkCriticalStock = useCallback(async (items: any[]): Promise<CriticalStockProduct[]> => {
    try {
      const criticalProducts = await checkCriticalStockAfterSale(items);
      
      setFormState(prev => ({
        ...prev,
        criticalProducts,
        showCriticalAlert: criticalProducts.length > 0
      }));
      
      return criticalProducts;
    } catch (error) {
      console.error('Error verificando stock crítico:', error);
      return [];
    }
  }, []);

  // Limpiar formulario
  const resetForm = useCallback(() => {
    setFormState(initialFormState);
  }, [initialFormState]);

  // Limpiar error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Establecer errores del formulario
  const setFormErrors = useCallback((errors: SaleFormErrors) => {
    setFormState(prev => ({
      ...prev,
      errors,
      isValid: false
    }));
  }, []);

  // Efectos
  useEffect(() => {
    // Cargar ventas al montar el componente
    if (currentUser) {
      loadSales();
    }
  }, [currentUser, loadSales]);

  return {
    // Estados de datos
    sales,
    currentSale,
    statistics,
    
    // Estados de UI
    loading,
    submitting,
    error,
    
    // Estado del formulario
    formState,
    
    // Funciones principales
    loadSales,
    loadStatistics,
    createNewSale,
    processSale,
    
    // Funciones del formulario
    initializeForm,
    updateFormData,
    validateForm,
    generateCode,
    
    // Validaciones
    validateStock,
    checkCriticalStock,
    
    // Utilidades
    resetForm,
    clearError,
    setFormErrors
  };
};