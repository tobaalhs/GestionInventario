import { useState, useEffect, useCallback } from 'react';
import { 
  Customer, 
  CustomerFormData, 
  CustomerSearchOptions,
  CustomerSearchResult,
  CustomerFilters,
  CustomerMetrics,
  CustomerValidationResult
} from '../interfaces/Customer';
import { ValidationResult } from '../interfaces/Sale';
import { 
  getCustomers,
  getCustomerById,
  getCustomerByRut,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  validateCustomerData,
  validateCustomerRut,
  isCustomerRutUnique,
  getTopCustomers,
  searchCustomersByText
} from '../services/customerService';
import { useAuth } from '../contexts/AuthContext';

interface UseCustomersReturn {
  // Estados de datos
  customers: Customer[];
  currentCustomer: Customer | null;
  searchResults: CustomerSearchResult[];
  topCustomers: Customer[];
  metrics: CustomerMetrics | null;
  
  // Estados de UI
  loading: boolean;
  searching: boolean;
  submitting: boolean;
  error: string | null;
  
  // Funciones principales
  loadCustomers: (activeOnly?: boolean) => Promise<void>;
  loadCustomerById: (id: string) => Promise<Customer | null>;
  loadCustomerByRut: (rut: string) => Promise<Customer | null>;
  searchCustomersList: (options: CustomerSearchOptions) => Promise<CustomerSearchResult[]>;
  
  // Funciones CRUD
  createNewCustomer: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateExistingCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteExistingCustomer: (id: string) => Promise<void>;
  
  // Funciones de búsqueda específicas
  searchByText: (searchTerm: string, maxResults?: number) => Promise<void>;
  searchByRut: (rut: string) => Promise<Customer | null>;
  
  // Funciones de validación
  validateCustomer: (customerData: Partial<Customer>) => CustomerValidationResult;
  validateRut: (rut: string) => { isValid: boolean; formatted: string; error?: string };
  checkRutUnique: (rut: string, excludeId?: string) => Promise<boolean>;
  
  // Funciones de utilidad
  loadTopCustomers: (limit?: number) => Promise<void>;
  calculateMetrics: () => Promise<void>;
  clearError: () => void;
  clearSearchResults: () => void;
  setCurrentCustomer: (customer: Customer | null) => void;
}

export const useCustomers = (): UseCustomersReturn => {
  const { currentUser } = useAuth();
  
  // Estados principales
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [topCustomers, setTopCustomers] = useState<Customer[]>([]);
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null);
  
  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar todos los clientes
  const loadCustomers = useCallback(async (activeOnly: boolean = true) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('👥 Cargando clientes...', activeOnly ? '(solo activos)' : '(todos)');
      const customersData = await getCustomers(activeOnly);
      
      setCustomers(customersData);
      console.log(`✅ ${customersData.length} clientes cargados`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando clientes';
      setError(errorMessage);
      console.error('❌ Error cargando clientes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar cliente por ID
  const loadCustomerById = useCallback(async (id: string): Promise<Customer | null> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Cargando cliente por ID:', id);
      const customer = await getCustomerById(id);
      
      if (customer) {
        setCurrentCustomer(customer);
        console.log('✅ Cliente cargado:', customer.name);
      } else {
        console.log('❌ Cliente no encontrado');
      }
      
      return customer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando cliente';
      setError(errorMessage);
      console.error('❌ Error cargando cliente:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar cliente por RUT
  const loadCustomerByRut = useCallback(async (rut: string): Promise<Customer | null> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Buscando cliente por RUT:', rut);
      const customer = await getCustomerByRut(rut);
      
      if (customer) {
        setCurrentCustomer(customer);
        console.log('✅ Cliente encontrado:', customer.name);
      } else {
        console.log('❌ Cliente no encontrado con RUT:', rut);
      }
      
      return customer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error buscando cliente';
      setError(errorMessage);
      console.error('❌ Error buscando cliente:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar clientes con opciones
  const searchCustomersList = useCallback(async (options: CustomerSearchOptions): Promise<CustomerSearchResult[]> => {
    try {
      setSearching(true);
      setError(null);
      
      console.log('🔍 Buscando clientes con opciones:', options);
      const results = await searchCustomers(options);
      
      setSearchResults(results);
      console.log(`✅ ${results.length} clientes encontrados`);
      
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error buscando clientes';
      setError(errorMessage);
      console.error('❌ Error buscando clientes:', err);
      return [];
    } finally {
      setSearching(false);
    }
  }, []);

  // Crear nuevo cliente
  const createNewCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
      setSubmitting(true);
      setError(null);
      
      console.log('👤 Creando nuevo cliente:', customerData.name);
      const customerId = await createCustomer(customerData);
      
      // Recargar la lista de clientes
      await loadCustomers();
      
      console.log('✅ Cliente creado con ID:', customerId);
      return customerId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creando cliente';
      setError(errorMessage);
      console.error('❌ Error creando cliente:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [loadCustomers]);

  // Actualizar cliente existente
  const updateExistingCustomer = useCallback(async (id: string, updates: Partial<Customer>): Promise<void> => {
    try {
      setSubmitting(true);
      setError(null);
      
      console.log('✏️ Actualizando cliente:', id);
      await updateCustomer(id, updates);
      
      // Recargar la lista de clientes
      await loadCustomers();
      
      // Si es el cliente actual, actualizarlo también
      if (currentCustomer && currentCustomer.id === id) {
        const updatedCustomer = await getCustomerById(id);
        setCurrentCustomer(updatedCustomer);
      }
      
      console.log('✅ Cliente actualizado exitosamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando cliente';
      setError(errorMessage);
      console.error('❌ Error actualizando cliente:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [loadCustomers, currentCustomer]);

  // Eliminar cliente (soft delete)
  const deleteExistingCustomer = useCallback(async (id: string): Promise<void> => {
    try {
      setSubmitting(true);
      setError(null);
      
      console.log('🗑️ Eliminando cliente:', id);
      await deleteCustomer(id);
      
      // Recargar la lista de clientes
      await loadCustomers();
      
      // Si es el cliente actual, limpiarlo
      if (currentCustomer && currentCustomer.id === id) {
        setCurrentCustomer(null);
      }
      
      console.log('✅ Cliente eliminado exitosamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error eliminando cliente';
      setError(errorMessage);
      console.error('❌ Error eliminando cliente:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [loadCustomers, currentCustomer]);

  // Buscar por texto libre
  const searchByText = useCallback(async (searchTerm: string, maxResults: number = 10): Promise<void> => {
    try {
      setSearching(true);
      setError(null);
      
      console.log('🔍 Buscando clientes por texto:', searchTerm);
      const results = await searchCustomersByText(searchTerm, maxResults);
      
      setSearchResults(results);
      console.log(`✅ ${results.length} clientes encontrados por texto`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error buscando clientes';
      setError(errorMessage);
      console.error('❌ Error buscando clientes por texto:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  // Buscar por RUT específico
  const searchByRut = useCallback(async (rut: string): Promise<Customer | null> => {
    return await loadCustomerByRut(rut);
  }, [loadCustomerByRut]);

  // Validar datos de cliente
  const validateCustomer = useCallback((customerData: Partial<Customer>): CustomerValidationResult => {
    const result = validateCustomerData(customerData);
    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
      suggestions: []
    };
  }, []);

  // Validar RUT
  const validateRut = useCallback((rut: string) => {
    return validateCustomerRut(rut);
  }, []);

  // Verificar que el RUT sea único
  const checkRutUnique = useCallback(async (rut: string, excludeId?: string): Promise<boolean> => {
    try {
      return await isCustomerRutUnique(rut, excludeId);
    } catch (error) {
      console.error('Error verificando RUT único:', error);
      return false;
    }
  }, []);

  // Cargar top clientes
  const loadTopCustomers = useCallback(async (limit: number = 10): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🏆 Cargando top clientes...');
      const topCustomersData = await getTopCustomers(limit);
      
      setTopCustomers(topCustomersData);
      console.log(`✅ Top ${topCustomersData.length} clientes cargados`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando top clientes';
      setError(errorMessage);
      console.error('❌ Error cargando top clientes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calcular métricas
  const calculateMetrics = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Calculando métricas de clientes...');
      
      // Obtener todos los clientes
      const allCustomers = await getCustomers(false); // Incluir inactivos
      const activeCustomers = allCustomers.filter(c => c.isActive);
      const inactiveCustomers = allCustomers.filter(c => !c.isActive);
      
      // Calcular nuevos clientes este mes
      const thisMonth = new Date();
      thisMonth.setDate(1); // Primer día del mes
      const newCustomersThisMonth = allCustomers.filter(c => 
        c.createdAt >= thisMonth
      ).length;
      
      // Top clientes por monto
      const topByAmount = [...activeCustomers]
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10)
        .map(c => ({
          customerId: c.id,
          customerName: c.name,
          totalSales: c.totalPurchases,
          totalAmount: c.totalAmount,
          percentage: 0 // Se calculará después
        }));
      
      // Top clientes por compras
      const topByPurchases = [...activeCustomers]
        .sort((a, b) => b.totalPurchases - a.totalPurchases)
        .slice(0, 10)
        .map(c => ({
          customerId: c.id,
          customerName: c.name,
          totalSales: c.totalPurchases,
          totalAmount: c.totalAmount,
          percentage: 0
        }));
      
      // Calcular valor promedio por cliente
      const totalAmount = activeCustomers.reduce((sum, c) => sum + c.totalAmount, 0);
      const averageCustomerValue = activeCustomers.length > 0 ? totalAmount / activeCustomers.length : 0;
      
      // Clientes con actividad reciente (último mes)
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const customersWithRecentActivity = activeCustomers.filter(c => 
        c.lastPurchaseDate && c.lastPurchaseDate >= lastMonth
      ).length;
      
      // Calcular retención (clientes que han comprado en los últimos 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const activeInLastSixMonths = activeCustomers.filter(c => 
        c.lastPurchaseDate && c.lastPurchaseDate >= sixMonthsAgo
      ).length;
      const customerRetentionRate = activeCustomers.length > 0 ? 
        (activeInLastSixMonths / activeCustomers.length) * 100 : 0;
      
      const metricsData: CustomerMetrics = {
        totalCustomers: allCustomers.length,
        activeCustomers: activeCustomers.length,
        inactiveCustomers: inactiveCustomers.length,
        newCustomersThisMonth,
        topCustomersByAmount: topByAmount,
        topCustomersByPurchases: topByPurchases,
        averageCustomerValue,
        customerRetentionRate,
        customersWithRecentActivity
      };
      
      setMetrics(metricsData);
      console.log('✅ Métricas calculadas');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error calculando métricas';
      setError(errorMessage);
      console.error('❌ Error calculando métricas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Limpiar error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Limpiar resultados de búsqueda
  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  // Efectos
  useEffect(() => {
    // Cargar clientes al montar el componente
    if (currentUser) {
      loadCustomers();
    }
  }, [currentUser, loadCustomers]);

  return {
    // Estados de datos
    customers,
    currentCustomer,
    searchResults,
    topCustomers,
    metrics,
    
    // Estados de UI
    loading,
    searching,
    submitting,
    error,
    
    // Funciones principales
    loadCustomers,
    loadCustomerById,
    loadCustomerByRut,
    searchCustomersList,
    
    // Funciones CRUD
    createNewCustomer,
    updateExistingCustomer,
    deleteExistingCustomer,
    
    // Funciones de búsqueda específicas
    searchByText,
    searchByRut,
    
    // Funciones de validación
    validateCustomer,
    validateRut,
    checkRutUnique,
    
    // Funciones de utilidad
    loadTopCustomers,
    calculateMetrics,
    clearError,
    clearSearchResults,
    setCurrentCustomer
  };
};