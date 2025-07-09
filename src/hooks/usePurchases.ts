import { useState, useEffect, useCallback } from 'react';
import { 
  Purchase, 
  PurchaseStatus, 
  PurchaseFilters, 
  PurchaseStatistics,
  ValidationResult 
} from '../interfaces/Purchase';
import { PurchaseFormData } from '../interfaces/FormTypes';
import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
  processPurchaseTransaction,
  cancelPurchase,
  getPurchaseStatistics,
  searchPurchases,
  getRecentPurchases,
  generatePurchaseCode,
  validatePurchaseData
} from '../services/purchaseService';
import { updateFinancesSummary } from '../services/financeService';

interface UsePurchasesReturn {
  // Estado
  purchases: Purchase[];
  currentPurchase: Purchase | null;
  loading: boolean;
  error: string | null;
  statistics: PurchaseStatistics | null;
  
  // Operaciones CRUD
  createNewPurchase: (data: PurchaseFormData, userId: string, userEmail: string) => Promise<string>;
  loadPurchases: (filters?: PurchaseFilters) => Promise<void>;
  loadPurchaseById: (id: string) => Promise<void>;
  updateExistingPurchase: (id: string, updates: Partial<Purchase>) => Promise<void>;
  deletePurchaseById: (id: string) => Promise<void>;
  cancelPurchaseById: (id: string, reason?: string) => Promise<void>;
  
  // Búsqueda y filtrado
  searchPurchasesByTerm: (searchTerm: string) => Promise<void>;
  filterPurchases: (filters: PurchaseFilters) => Promise<void>;
  loadRecentPurchases: (limit?: number) => Promise<void>;
  
  // Estadísticas
  loadStatistics: (startDate?: Date, endDate?: Date) => Promise<void>;
  refreshStatistics: () => Promise<void>;
  
  // Validación y utilidades
  validatePurchase: (purchaseData: Partial<Purchase>) => ValidationResult;
  generateCode: () => string;
  
  // Control de estado
  clearError: () => void;
  clearCurrentPurchase: () => void;
  refreshPurchases: () => Promise<void>;
}

export const usePurchases = (): UsePurchasesReturn => {
  // Estados principales
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [currentPurchase, setCurrentPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<PurchaseStatistics | null>(null);
  
  // Estados internos para gestión
  const [lastFilters, setLastFilters] = useState<PurchaseFilters | undefined>(undefined);

  /**
   * Crear una nueva compra completa
   */
  const createNewPurchase = useCallback(async (
    data: PurchaseFormData, 
    userId: string, 
    userEmail: string
  ): Promise<string> => {
    try {
      setLoading(true);
      setError(null);

      // Generar código único
      const code = generatePurchaseCode();

      // Convertir datos del formulario a formato de compra
      const purchaseData: Purchase = {
        id: '',
        code,
        items: data.selectedProducts.map(product => ({
          productId: product.productId || '',
          productCode: product.productCode,
          productName: product.productName,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          totalPrice: product.quantity * product.unitPrice,
          expirationDate: product.expirationDate ? new Date(product.expirationDate) : undefined,
          batchCode: `${code}-${product.productCode}`,
          category: product.category,
          isNewProduct: product.isNewProduct
        })),
        supplierId: data.supplier.id || '',
        supplierInfo: {
          id: data.supplier.id || '',
          rut: data.supplier.rut,
          name: data.supplier.name,
          contact: data.supplier.contact,
          email: data.supplier.email,
          phone: data.supplier.phone,
          address: data.supplier.address,
          isActive: true,
          totalPurchases: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        purchaseDate: new Date(data.purchaseDate),
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
        totalAmount: data.selectedProducts.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
        totalQuantity: data.selectedProducts.reduce((sum, item) => sum + item.quantity, 0),
        comments: data.comments,
        userId,
        userEmail,
        status: PurchaseStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Procesar la transacción completa
      await processPurchaseTransaction(purchaseData);

      // Actualizar finanzas
      await updateFinancesSummary(userEmail);

      // Recargar datos
      await refreshPurchases();
      await refreshStatistics();

      return code;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creando compra';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar compras con filtros opcionales
   */
  const loadPurchases = useCallback(async (filters?: PurchaseFilters): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setLastFilters(filters);

      const fetchedPurchases = await getPurchases(filters);
      setPurchases(fetchedPurchases);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando compras';
      setError(errorMessage);
      console.error('Error cargando compras:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar una compra específica por ID
   */
  const loadPurchaseById = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const purchase = await getPurchaseById(id);
      setCurrentPurchase(purchase);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando compra';
      setError(errorMessage);
      console.error('Error cargando compra:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualizar una compra existente
   */
  const updateExistingPurchase = useCallback(async (
    id: string, 
    updates: Partial<Purchase>
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await updatePurchase(id, updates);

      // Actualizar en el estado local
      setPurchases(prev => prev.map(purchase => 
        purchase.id === id ? { ...purchase, ...updates } : purchase
      ));

      // Si es la compra actual, actualizarla también
      if (currentPurchase?.id === id) {
        setCurrentPurchase(prev => prev ? { ...prev, ...updates } : null);
      }

      // Si se cambió el estado a completado, actualizar finanzas
      if (updates.status === PurchaseStatus.COMPLETED) {
        await updateFinancesSummary();
        await refreshStatistics();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando compra';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentPurchase]);

  /**
   * Eliminar una compra
   */
  const deletePurchaseById = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await deletePurchase(id);

      // Remover del estado local
      setPurchases(prev => prev.filter(purchase => purchase.id !== id));

      // Si es la compra actual, limpiarla
      if (currentPurchase?.id === id) {
        setCurrentPurchase(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error eliminando compra';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentPurchase]);

  /**
   * Cancelar una compra
   */
  const cancelPurchaseById = useCallback(async (id: string, reason?: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await cancelPurchase(id, reason);

      // Actualizar estado local
      const updatedPurchase = { status: PurchaseStatus.CANCELLED };
      setPurchases(prev => prev.map(purchase => 
        purchase.id === id ? { ...purchase, ...updatedPurchase } : purchase
      ));

      if (currentPurchase?.id === id) {
        setCurrentPurchase(prev => prev ? { ...prev, ...updatedPurchase } : null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cancelando compra';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentPurchase]);

  /**
   * Buscar compras por término
   */
  const searchPurchasesByTerm = useCallback(async (searchTerm: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const results = await searchPurchases(searchTerm);
      setPurchases(results);
      setLastFilters({ searchTerm });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error buscando compras';
      setError(errorMessage);
      console.error('Error buscando compras:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Filtrar compras
   */
  const filterPurchases = useCallback(async (filters: PurchaseFilters): Promise<void> => {
    await loadPurchases(filters);
  }, [loadPurchases]);

  /**
   * Cargar compras recientes
   */
  const loadRecentPurchases = useCallback(async (limit: number = 10): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const recentPurchases = await getRecentPurchases(limit);
      setPurchases(recentPurchases);
      setLastFilters(undefined);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando compras recientes';
      setError(errorMessage);
      console.error('Error cargando compras recientes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar estadísticas
   */
  const loadStatistics = useCallback(async (startDate?: Date, endDate?: Date): Promise<void> => {
    try {
      const stats = await getPurchaseStatistics(startDate, endDate);
      setStatistics(stats);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
      // No setear error para estadísticas ya que no es crítico
    }
  }, []);

  /**
   * Refrescar estadísticas
   */
  const refreshStatistics = useCallback(async (): Promise<void> => {
    await loadStatistics();
  }, [loadStatistics]);

  /**
   * Validar datos de compra
   */
  const validatePurchase = useCallback((purchaseData: Partial<Purchase>): ValidationResult => {
    return validatePurchaseData(purchaseData);
  }, []);

  /**
   * Generar código de compra
   */
  const generateCode = useCallback((): string => {
    return generatePurchaseCode();
  }, []);

  /**
   * Limpiar error
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Limpiar compra actual
   */
  const clearCurrentPurchase = useCallback((): void => {
    setCurrentPurchase(null);
  }, []);

  /**
   * Refrescar lista de compras
   */
  const refreshPurchases = useCallback(async (): Promise<void> => {
    await loadPurchases(lastFilters);
  }, [loadPurchases, lastFilters]);

  // Cargar datos iniciales
  useEffect(() => {
    loadRecentPurchases();
    loadStatistics();
  }, [loadRecentPurchases, loadStatistics]);

  return {
    // Estado
    purchases,
    currentPurchase,
    loading,
    error,
    statistics,
    
    // Operaciones CRUD
    createNewPurchase,
    loadPurchases,
    loadPurchaseById,
    updateExistingPurchase,
    deletePurchaseById,
    cancelPurchaseById,
    
    // Búsqueda y filtrado
    searchPurchasesByTerm,
    filterPurchases,
    loadRecentPurchases,
    
    // Estadísticas
    loadStatistics,
    refreshStatistics,
    
    // Validación y utilidades
    validatePurchase,
    generateCode,
    
    // Control de estado
    clearError,
    clearCurrentPurchase,
    refreshPurchases
  };
};