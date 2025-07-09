import { useState, useEffect, useCallback } from 'react';
import { Supplier, ValidationResult } from '../interfaces/Purchase';
import { 
  SupplierFormData, 
  SupplierSearchOptions, 
  SupplierSearchResult 
} from '../interfaces/FormTypes';
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  getSupplierByRut,
  updateSupplier,
  deleteSupplier,
  reactivateSupplier,
  searchSuppliers,
  getActiveSuppliers,
  validateSupplierData,
  validateSupplierRut,
  createSupplierFromForm,
  isSupplierRutUnique,
  updateSupplierPurchaseStats
} from '../services/supplierService';

interface UseSupplierReturn {
  // Estado
  suppliers: Supplier[];
  activeSuppliers: SupplierSearchResult[];
  currentSupplier: Supplier | null;
  searchResults: SupplierSearchResult[];
  loading: boolean;
  error: string | null;
  
  // Operaciones CRUD
  createNewSupplier: (data: SupplierFormData, userId: string, userEmail: string) => Promise<string>;
  loadSuppliers: (activeOnly?: boolean) => Promise<void>;
  loadSupplierById: (id: string) => Promise<void>;
  loadSupplierByRut: (rut: string) => Promise<Supplier | null>;
  updateExistingSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplierById: (id: string) => Promise<void>;
  reactivateSupplierById: (id: string) => Promise<void>;
  
  // Búsqueda y filtrado
  searchSuppliersByOptions: (options: SupplierSearchOptions) => Promise<void>;
  searchSupplierByRut: (rut: string) => Promise<Supplier | null>;
  loadActiveSuppliers: () => Promise<void>;
  
  // Validación
  validateSupplier: (supplierData: Partial<Supplier>) => ValidationResult;
  validateRut: (rut: string) => { isValid: boolean; formatted: string; error?: string };
  checkRutUnique: (rut: string, excludeId?: string) => Promise<boolean>;
  
  // Utilidades
  updateSupplierStats: (supplierId: string) => Promise<void>;
  
  // Control de estado
  clearError: () => void;
  clearCurrentSupplier: () => void;
  clearSearchResults: () => void;
  refreshSuppliers: () => Promise<void>;
}

export const useSuppliers = (): UseSupplierReturn => {
  // Estados principales
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeSuppliers, setActiveSuppliers] = useState<SupplierSearchResult[]>([]);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [searchResults, setSearchResults] = useState<SupplierSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados internos
  const [lastActiveOnlyFilter, setLastActiveOnlyFilter] = useState<boolean>(true);

  /**
   * Crear un nuevo proveedor
   */
  const createNewSupplier = useCallback(async (
    data: SupplierFormData, 
    userId: string, 
    userEmail: string
  ): Promise<string> => {
    try {
      setLoading(true);
      setError(null);

      // Validar datos antes de crear
      const validation = validateSupplierData(data);
      if (!validation.isValid) {
        throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
      }

      // Verificar que el RUT sea único
      const isUnique = await isSupplierRutUnique(data.rut);
      if (!isUnique) {
        throw new Error('Ya existe un proveedor con este RUT');
      }

      // Crear proveedor
      const supplierId = await createSupplierFromForm(data, userId, userEmail);

      // Recargar listas
      await refreshSuppliers();
      await loadActiveSuppliers();

      return supplierId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creando proveedor';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar todos los proveedores
   */
  const loadSuppliers = useCallback(async (activeOnly: boolean = true): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setLastActiveOnlyFilter(activeOnly);

      const fetchedSuppliers = await getSuppliers(activeOnly);
      setSuppliers(fetchedSuppliers);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando proveedores';
      setError(errorMessage);
      console.error('Error cargando proveedores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar proveedor por ID
   */
  const loadSupplierById = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const supplier = await getSupplierById(id);
      setCurrentSupplier(supplier);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando proveedor';
      setError(errorMessage);
      console.error('Error cargando proveedor:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar proveedor por RUT
   */
  const loadSupplierByRut = useCallback(async (rut: string): Promise<Supplier | null> => {
    try {
      setError(null);

      const supplier = await getSupplierByRut(rut);
      return supplier;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error buscando proveedor por RUT';
      setError(errorMessage);
      console.error('Error buscando proveedor por RUT:', err);
      return null;
    }
  }, []);

  /**
   * Actualizar proveedor existente
   */
  const updateExistingSupplier = useCallback(async (
    id: string, 
    updates: Partial<Supplier>
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await updateSupplier(id, updates);

      // Actualizar en el estado local
      setSuppliers(prev => prev.map(supplier => 
        supplier.id === id ? { ...supplier, ...updates } : supplier
      ));

      // Si es el proveedor actual, actualizarlo también
      if (currentSupplier?.id === id) {
        setCurrentSupplier(prev => prev ? { ...prev, ...updates } : null);
      }

      // Actualizar lista de proveedores activos si es necesario
      if (updates.isActive !== undefined) {
        await loadActiveSuppliers();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando proveedor';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentSupplier]);

  /**
   * Eliminar proveedor (soft delete)
   */
  const deleteSupplierById = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await deleteSupplier(id);

      // Actualizar estado local marcando como inactivo
      setSuppliers(prev => prev.map(supplier => 
        supplier.id === id ? { ...supplier, isActive: false } : supplier
      ));

      // Si es el proveedor actual, limpiar si solo mostramos activos
      if (currentSupplier?.id === id && lastActiveOnlyFilter) {
        setCurrentSupplier(null);
      }

      // Actualizar lista de activos
      await loadActiveSuppliers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error eliminando proveedor';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentSupplier, lastActiveOnlyFilter]);

  /**
   * Reactivar proveedor
   */
  const reactivateSupplierById = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await reactivateSupplier(id);

      // Actualizar estado local
      setSuppliers(prev => prev.map(supplier => 
        supplier.id === id ? { ...supplier, isActive: true } : supplier
      ));

      // Actualizar lista de activos
      await loadActiveSuppliers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error reactivando proveedor';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Buscar proveedores con opciones
   */
  const searchSuppliersByOptions = useCallback(async (options: SupplierSearchOptions): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const results = await searchSuppliers(options);
      setSearchResults(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error buscando proveedores';
      setError(errorMessage);
      console.error('Error buscando proveedores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Buscar proveedor específico por RUT
   */
  const searchSupplierByRut = useCallback(async (rut: string): Promise<Supplier | null> => {
    return await loadSupplierByRut(rut);
  }, [loadSupplierByRut]);

  /**
   * Cargar proveedores activos para selectores
   */
  const loadActiveSuppliers = useCallback(async (): Promise<void> => {
    try {
      const active = await getActiveSuppliers();
      setActiveSuppliers(active);
    } catch (err) {
      console.error('Error cargando proveedores activos:', err);
      // No setear error para esta operación ya que no es crítica
    }
  }, []);

  /**
   * Validar datos de proveedor
   */
  const validateSupplier = useCallback((supplierData: Partial<Supplier>): ValidationResult => {
    return validateSupplierData(supplierData);
  }, []);

  /**
   * Validar RUT específicamente
   */
  const validateRut = useCallback((rut: string): { isValid: boolean; formatted: string; error?: string } => {
    return validateSupplierRut(rut);
  }, []);

  /**
   * Verificar si RUT es único
   */
  const checkRutUnique = useCallback(async (rut: string, excludeId?: string): Promise<boolean> => {
    try {
      return await isSupplierRutUnique(rut, excludeId);
    } catch (err) {
      console.error('Error verificando RUT único:', err);
      return false;
    }
  }, []);

  /**
   * Actualizar estadísticas de compras del proveedor
   */
  const updateSupplierStats = useCallback(async (supplierId: string): Promise<void> => {
    try {
      await updateSupplierPurchaseStats(supplierId);
      
      // Recargar datos si es necesario
      if (currentSupplier?.id === supplierId) {
        await loadSupplierById(supplierId);
      }
    } catch (err) {
      console.error('Error actualizando estadísticas de proveedor:', err);
      // No lanzar error para no interrumpir flujo principal
    }
  }, [currentSupplier, loadSupplierById]);

  /**
   * Limpiar error
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Limpiar proveedor actual
   */
  const clearCurrentSupplier = useCallback((): void => {
    setCurrentSupplier(null);
  }, []);

  /**
   * Limpiar resultados de búsqueda
   */
  const clearSearchResults = useCallback((): void => {
    setSearchResults([]);
  }, []);

  /**
   * Refrescar lista de proveedores
   */
  const refreshSuppliers = useCallback(async (): Promise<void> => {
    await loadSuppliers(lastActiveOnlyFilter);
  }, [loadSuppliers, lastActiveOnlyFilter]);

  // Cargar datos iniciales
  useEffect(() => {
    loadSuppliers(true);
    loadActiveSuppliers();
  }, [loadSuppliers, loadActiveSuppliers]);

  return {
    // Estado
    suppliers,
    activeSuppliers,
    currentSupplier,
    searchResults,
    loading,
    error,
    
    // Operaciones CRUD
    createNewSupplier,
    loadSuppliers,
    loadSupplierById,
    loadSupplierByRut,
    updateExistingSupplier,
    deleteSupplierById,
    reactivateSupplierById,
    
    // Búsqueda y filtrado
    searchSuppliersByOptions,
    searchSupplierByRut,
    loadActiveSuppliers,
    
    // Validación
    validateSupplier,
    validateRut,
    checkRutUnique,
    
    // Utilidades
    updateSupplierStats,
    
    // Control de estado
    clearError,
    clearCurrentSupplier,
    clearSearchResults,
    refreshSuppliers
  };
};