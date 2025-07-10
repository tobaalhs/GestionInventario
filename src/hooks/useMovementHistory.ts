import { useState, useEffect, useCallback } from 'react';
import {
  MovementRecord,
  MovementFilters,
  MovementSearchResult,
  MovementStatistics,
  MovementSummary,
  MovementSortField,
  MovementFilterValidation,
  MovementType
} from '../interfaces/Movement';
import {
  searchMovements,
  getMovementStatistics,
  getMovementSummary,
  validateMovementFilters,
  getMovementsByProduct,
  getMovementsByUser,
  getRecentMovements
} from '../services/movementHistoryService';

interface UseMovementHistoryReturn {
  // Estados de datos
  movements: MovementRecord[];
  statistics: MovementStatistics | null;
  summary: MovementSummary | null;
  
  // Estados de UI
  loading: boolean;
  error: string | null;
  
  // Información de paginación
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  
  // Filtros actuales
  currentFilters: MovementFilters;
  
  // Funciones principales
  loadMovements: (filters?: MovementFilters) => Promise<void>;
  loadStatistics: (filters?: MovementFilters) => Promise<void>;
  loadSummary: (startDate: Date, endDate: Date, compareWithPrevious?: boolean) => Promise<void>;
  
  // Funciones de búsqueda específica
  loadMovementsByProduct: (productId: string, limit?: number) => Promise<void>;
  loadMovementsByUser: (userId: string, limit?: number) => Promise<void>;
  loadRecentMovements: (limit?: number) => Promise<void>;
  
  // Funciones de filtrado
  updateFilters: (newFilters: Partial<MovementFilters>) => void;
  clearFilters: () => void;
  validateFilters: (filters: MovementFilters) => MovementFilterValidation;
  
  // Funciones de paginación
  goToPage: (page: number) => Promise<void>;
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  
  // Utilidades
  clearError: () => void;
  refreshMovements: () => Promise<void>;
  exportMovements: (format: 'excel' | 'pdf' | 'csv') => Promise<void>;
}

export const useMovementHistory = (): UseMovementHistoryReturn => {
  // Estados principales
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [statistics, setStatistics] = useState<MovementStatistics | null>(null);
  const [summary, setSummary] = useState<MovementSummary | null>(null);
  
  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de paginación
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  
  // Estados de filtros
  const [currentFilters, setCurrentFilters] = useState<MovementFilters>({
    startDate: (() => {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      return date;
    })(),
    endDate: new Date(),
    movementType: 'all',
    sortBy: MovementSortField.DATE,
    sortOrder: 'desc',
    pageSize: 50,
    page: 1
  });

  /**
   * Cargar movimientos con filtros
   */
  const loadMovements = useCallback(async (filters?: MovementFilters): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const filtersToUse = filters || currentFilters;
      
      console.log('📈 Cargando movimientos...', filtersToUse);
      
      const result: MovementSearchResult = await searchMovements(filtersToUse);
      
      setMovements(result.movements);
      setTotalCount(result.totalCount);
      setCurrentPage(result.currentPage);
      setTotalPages(result.totalPages);
      setHasNext(result.hasNext);
      setHasPrevious(result.hasPrevious);
      
      // Actualizar filtros actuales si se proporcionaron nuevos
      if (filters) {
        setCurrentFilters({ ...filtersToUse, ...filters });
      }
      
      console.log(`✅ ${result.movements.length} movimientos cargados`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando movimientos';
      setError(errorMessage);
      console.error('❌ Error cargando movimientos:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFilters]);

  /**
   * Cargar estadísticas de movimientos
   */
  const loadStatistics = useCallback(async (filters?: MovementFilters): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const filtersToUse = filters || currentFilters;
      
      console.log('📊 Cargando estadísticas de movimientos...');
      
      const stats = await getMovementStatistics(filtersToUse);
      setStatistics(stats);
      
      console.log('✅ Estadísticas cargadas');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando estadísticas';
      setError(errorMessage);
      console.error('❌ Error cargando estadísticas:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFilters]);

  /**
   * Cargar resumen de movimientos
   */
  const loadSummary = useCallback(async (
    startDate: Date, 
    endDate: Date, 
    compareWithPrevious: boolean = true
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('📋 Cargando resumen de movimientos...');
      
      const summaryData = await getMovementSummary(startDate, endDate, compareWithPrevious);
      setSummary(summaryData);
      
      console.log('✅ Resumen cargado');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando resumen';
      setError(errorMessage);
      console.error('❌ Error cargando resumen:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar movimientos por producto específico
   */
  const loadMovementsByProduct = useCallback(async (productId: string, limit?: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('📦 Cargando movimientos por producto:', productId);
      
      const productMovements = await getMovementsByProduct(productId, limit);
      setMovements(productMovements);
      setTotalCount(productMovements.length);
      setCurrentPage(1);
      setTotalPages(1);
      setHasNext(false);
      setHasPrevious(false);
      
      console.log(`✅ ${productMovements.length} movimientos del producto cargados`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando movimientos del producto';
      setError(errorMessage);
      console.error('❌ Error cargando movimientos del producto:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar movimientos por usuario específico
   */
  const loadMovementsByUser = useCallback(async (userId: string, limit?: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('👤 Cargando movimientos por usuario:', userId);
      
      const userMovements = await getMovementsByUser(userId, limit);
      setMovements(userMovements);
      setTotalCount(userMovements.length);
      setCurrentPage(1);
      setTotalPages(1);
      setHasNext(false);
      setHasPrevious(false);
      
      console.log(`✅ ${userMovements.length} movimientos del usuario cargados`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando movimientos del usuario';
      setError(errorMessage);
      console.error('❌ Error cargando movimientos del usuario:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar movimientos recientes
   */
  const loadRecentMovements = useCallback(async (limit: number = 50): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🕒 Cargando movimientos recientes...');
      
      const recentMovements = await getRecentMovements(limit);
      setMovements(recentMovements);
      setTotalCount(recentMovements.length);
      setCurrentPage(1);
      setTotalPages(1);
      setHasNext(false);
      setHasPrevious(false);
      
      console.log(`✅ ${recentMovements.length} movimientos recientes cargados`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando movimientos recientes';
      setError(errorMessage);
      console.error('❌ Error cargando movimientos recientes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualizar filtros
   */
  const updateFilters = useCallback((newFilters: Partial<MovementFilters>): void => {
    const updatedFilters = { 
      ...currentFilters, 
      ...newFilters,
      page: newFilters.page || 1 // Reset a página 1 cuando se cambian filtros
    };
    setCurrentFilters(updatedFilters);
  }, [currentFilters]);

  /**
   * Limpiar filtros
   */
  const clearFilters = useCallback((): void => {
    const defaultFilters: MovementFilters = {
      startDate: (() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date;
      })(),
      endDate: new Date(),
      movementType: 'all',
      sortBy: MovementSortField.DATE,
      sortOrder: 'desc',
      pageSize: 50,
      page: 1
    };
    setCurrentFilters(defaultFilters);
  }, []);

  /**
   * Validar filtros
   */
  const validateFilters = useCallback((filters: MovementFilters): MovementFilterValidation => {
    return validateMovementFilters(filters);
  }, []);

  /**
   * Ir a página específica
   */
  const goToPage = useCallback(async (page: number): Promise<void> => {
    if (page < 1 || page > totalPages) return;
    
    const newFilters = { ...currentFilters, page };
    await loadMovements(newFilters);
  }, [currentFilters, totalPages, loadMovements]);

  /**
   * Ir a página siguiente
   */
  const nextPage = useCallback(async (): Promise<void> => {
    if (!hasNext) return;
    await goToPage(currentPage + 1);
  }, [hasNext, currentPage, goToPage]);

  /**
   * Ir a página anterior
   */
  const previousPage = useCallback(async (): Promise<void> => {
    if (!hasPrevious) return;
    await goToPage(currentPage - 1);
  }, [hasPrevious, currentPage, goToPage]);

  /**
   * Limpiar error
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Refrescar movimientos
   */
  const refreshMovements = useCallback(async (): Promise<void> => {
    await loadMovements(currentFilters);
  }, [loadMovements, currentFilters]);

  /**
   * Exportar movimientos
   */
  const exportMovements = useCallback(async (format: 'excel' | 'pdf' | 'csv'): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log(`📊 Exportando movimientos a ${format.toUpperCase()}...`);
      
      // Esta función sería implementada usando el servicio de exportación
      // Por ahora solo simula la funcionalidad
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const fileName = `movimientos_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
      
      // Simular descarga
      const blob = new Blob([`Datos exportados en formato ${format}`], { 
        type: format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
             format === 'pdf' ? 'application/pdf' : 'text/csv'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`✅ Movimientos exportados como ${fileName}`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error exportando movimientos';
      setError(errorMessage);
      console.error('❌ Error exportando movimientos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar movimientos iniciales al montar el componente
  useEffect(() => {
    loadMovements();
  }, []);

  // Recargar cuando cambien los filtros
  useEffect(() => {
    if (currentFilters.startDate && currentFilters.endDate) {
      loadMovements(currentFilters);
    }
  }, [currentFilters.startDate, currentFilters.endDate, currentFilters.movementType]);

  // Limpiar error automáticamente después de 5 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    // Estados de datos
    movements,
    statistics,
    summary,
    
    // Estados de UI
    loading,
    error,
    
    // Información de paginación
    totalCount,
    currentPage,
    totalPages,
    hasNext,
    hasPrevious,
    
    // Filtros actuales
    currentFilters,
    
    // Funciones principales
    loadMovements,
    loadStatistics,
    loadSummary,
    
    // Funciones de búsqueda específica
    loadMovementsByProduct,
    loadMovementsByUser,
    loadRecentMovements,
    
    // Funciones de filtrado
    updateFilters,
    clearFilters,
    validateFilters,
    
    // Funciones de paginación
    goToPage,
    nextPage,
    previousPage,
    
    // Utilidades
    clearError,
    refreshMovements,
    exportMovements
  };
};