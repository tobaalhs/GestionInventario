import { useState, useEffect, useCallback } from 'react';
import {
  TransactionReport,
  ReportType,
  ReportStatus,
  TransactionFilters,
  ReportGenerationRequest,
  ReportSearchFilters,
  ReportSearchResult,
  ReportFilterValidation,
  ReportGenerationStatus,
  ReportStatistics
} from '../interfaces/Report';
import {
  createReport,
  getReportById,
  searchReports,
  updateReportStatus,
  deleteReport,
  getRecentReports,
  validateReportFilters,
  getTransactionData,
  calculateReportSummary,
  generateReportStatistics
} from '../services/reportService';

interface UseReportsReturn {
  // Estados de datos
  reports: TransactionReport[];
  currentReport: TransactionReport | null;
  recentReports: TransactionReport[];
  
  // Estados de UI
  loading: boolean;
  generating: boolean;
  error: string | null;
  
  // Estados de generación
  generationStatus: ReportGenerationStatus | null;
  
  // Funciones principales
  generateReport: (request: ReportGenerationRequest, userId: string, userEmail: string) => Promise<string>;
  loadReport: (reportId: string) => Promise<void>;
  loadReports: (filters?: ReportSearchFilters) => Promise<void>;
  loadRecentReports: (limit?: number) => Promise<void>;
  
  // Funciones de búsqueda y filtrado
  searchReportsByFilters: (filters: ReportSearchFilters) => Promise<void>;
  validateFilters: (filters: TransactionFilters) => ReportFilterValidation;
  
  // Funciones de gestión
  updateStatus: (reportId: string, status: ReportStatus, error?: string) => Promise<void>;
  deleteReportById: (reportId: string) => Promise<void>;
  
  // Funciones de previsualización
  previewReportData: (filters: TransactionFilters) => Promise<{ recordCount: number; sampleData: any[] }>;
  estimateReportSize: (filters: TransactionFilters) => Promise<{ estimatedRecords: number; estimatedTime: number }>;
  
  // Utilidades
  clearError: () => void;
  clearCurrentReport: () => void;
  refreshReports: () => Promise<void>;
}

export const useReports = (): UseReportsReturn => {
  // Estados principales
  const [reports, setReports] = useState<TransactionReport[]>([]);
  const [currentReport, setCurrentReport] = useState<TransactionReport | null>(null);
  const [recentReports, setRecentReports] = useState<TransactionReport[]>([]);
  
  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de generación
  const [generationStatus, setGenerationStatus] = useState<ReportGenerationStatus | null>(null);
  
  // Estados internos para gestión
  const [lastSearchFilters, setLastSearchFilters] = useState<ReportSearchFilters | undefined>(undefined);

  /**
   * Generar un nuevo reporte
   */
  const generateReport = useCallback(async (
    request: ReportGenerationRequest,
    userId: string,
    userEmail: string
  ): Promise<string> => {
    try {
      setGenerating(true);
      setError(null);
      
      // Validar filtros antes de generar
      const validation = validateReportFilters(request.filters);
      if (!validation.isValid) {
        throw new Error(`Filtros inválidos: ${validation.errors.join(', ')}`);
      }

      // Inicializar estado de generación
      const reportId = `temp_${Date.now()}`;
      setGenerationStatus({
        reportId,
        status: ReportStatus.GENERATING,
        progress: 0,
        currentStep: 'Validando filtros...',
        estimatedTimeRemaining: validation.estimatedProcessingTime,
        startedAt: new Date()
      });

      // Simular progreso de generación
      updateGenerationProgress(10, 'Obteniendo datos de transacciones...');
      
      console.log('📊 Iniciando generación de reporte:', request.type);

      // Generar el reporte
      const createdReportId = await createReport(request, userId, userEmail);
      
      updateGenerationProgress(100, 'Reporte completado');
      
      // Actualizar estado de generación
      setGenerationStatus(prev => prev ? {
        ...prev,
        reportId: createdReportId,
        status: ReportStatus.COMPLETED,
        progress: 100,
        currentStep: 'Completado',
        estimatedTimeRemaining: 0,
        completedAt: new Date()
      } : null);

      // Recargar reportes
      await loadRecentReports();

      console.log('✅ Reporte generado exitosamente:', createdReportId);
      return createdReportId;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error generando reporte';
      setError(errorMessage);
      
      // Actualizar estado de generación con error
      setGenerationStatus(prev => prev ? {
        ...prev,
        status: ReportStatus.FAILED,
        currentStep: 'Error',
        error: errorMessage,
        completedAt: new Date()
      } : null);
      
      console.error('❌ Error generando reporte:', err);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  /**
   * Función auxiliar para actualizar progreso de generación
   */
  const updateGenerationProgress = (progress: number, step: string) => {
    setGenerationStatus(prev => prev ? {
      ...prev,
      progress,
      currentStep: step,
      estimatedTimeRemaining: Math.max(0, prev.estimatedTimeRemaining - 1)
    } : null);
  };

  /**
   * Cargar un reporte específico por ID
   */
  const loadReport = useCallback(async (reportId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('📋 Cargando reporte:', reportId);
      const report = await getReportById(reportId);
      
      if (!report) {
        throw new Error('Reporte no encontrado');
      }

      setCurrentReport(report);
      console.log('✅ Reporte cargado exitosamente');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando reporte';
      setError(errorMessage);
      console.error('❌ Error cargando reporte:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar reportes con filtros
   */
  const loadReports = useCallback(async (filters?: ReportSearchFilters): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setLastSearchFilters(filters);

      console.log('📊 Cargando reportes con filtros:', filters);
      const searchResult = await searchReports(filters || {});
      
      setReports(searchResult.reports);
      console.log(`✅ ${searchResult.reports.length} reportes cargados`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando reportes';
      setError(errorMessage);
      console.error('❌ Error cargando reportes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar reportes recientes
   */
  const loadRecentReports = useCallback(async (limit: number = 10): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('📈 Cargando reportes recientes...');
      const reports = await getRecentReports(limit);
      
      setRecentReports(reports);
      console.log(`✅ ${reports.length} reportes recientes cargados`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando reportes recientes';
      setError(errorMessage);
      console.error('❌ Error cargando reportes recientes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Buscar reportes por filtros específicos
   */
  const searchReportsByFilters = useCallback(async (filters: ReportSearchFilters): Promise<void> => {
    await loadReports(filters);
  }, [loadReports]);

  /**
   * Validar filtros de reporte
   */
  const validateFilters = useCallback((filters: TransactionFilters): ReportFilterValidation => {
    return validateReportFilters(filters);
  }, []);

  /**
   * Actualizar estado de un reporte
   */
  const updateStatus = useCallback(async (
    reportId: string, 
    status: ReportStatus, 
    error?: string
  ): Promise<void> => {
    try {
      await updateReportStatus(reportId, status, error);
      
      // Actualizar en el estado local
      setReports(prev => prev.map(report => 
        report.id === reportId ? { ...report, status } : report
      ));

      if (currentReport?.id === reportId) {
        setCurrentReport(prev => prev ? { ...prev, status } : null);
      }

      console.log('✅ Estado del reporte actualizado');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando estado';
      setError(errorMessage);
      throw err;
    }
  }, [currentReport]);

  /**
   * Eliminar un reporte
   */
  const deleteReportById = useCallback(async (reportId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await deleteReport(reportId);

      // Remover del estado local
      setReports(prev => prev.filter(report => report.id !== reportId));
      setRecentReports(prev => prev.filter(report => report.id !== reportId));

      if (currentReport?.id === reportId) {
        setCurrentReport(null);
      }

      console.log('✅ Reporte eliminado exitosamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error eliminando reporte';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentReport]);

  /**
   * Previsualizar datos del reporte sin generarlo completamente
   */
  const previewReportData = useCallback(async (filters: TransactionFilters): Promise<{ 
    recordCount: number; 
    sampleData: any[] 
  }> => {
    try {
      setLoading(true);
      setError(null);

      console.log('👀 Previsualizando datos del reporte...');
      
      // Obtener una muestra de datos
      const transactionData = await getTransactionData({
        ...filters,
        // Limitar para previsualización
        includeTypes: filters.includeTypes.slice(0, 1) // Solo un tipo por velocidad
      });

      const sampleData = transactionData.slice(0, 10); // Solo primeros 10 registros
      
      console.log('✅ Previsualización completada');
      return {
        recordCount: transactionData.length,
        sampleData: sampleData.map(transaction => ({
          id: transaction.id,
          code: transaction.code,
          type: transaction.type,
          date: transaction.transactionDate,
          counterparty: transaction.counterparty.name,
          totalAmount: transaction.totalAmount,
          itemsCount: transaction.items.length
        }))
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error previsualizando datos';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Estimar tamaño y tiempo de generación del reporte
   */
  const estimateReportSize = useCallback(async (filters: TransactionFilters): Promise<{ 
    estimatedRecords: number; 
    estimatedTime: number 
  }> => {
    try {
      const validation = validateReportFilters(filters);
      
      return {
        estimatedRecords: validation.estimatedRecords,
        estimatedTime: validation.estimatedProcessingTime
      };
    } catch (err) {
      console.error('Error estimando tamaño del reporte:', err);
      return {
        estimatedRecords: 0,
        estimatedTime: 0
      };
    }
  }, []);

  /**
   * Limpiar error
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Limpiar reporte actual
   */
  const clearCurrentReport = useCallback((): void => {
    setCurrentReport(null);
  }, []);

  /**
   * Refrescar lista de reportes
   */
  const refreshReports = useCallback(async (): Promise<void> => {
    if (lastSearchFilters) {
      await loadReports(lastSearchFilters);
    } else {
      await loadRecentReports();
    }
  }, [loadReports, loadRecentReports, lastSearchFilters]);

  // Cargar reportes recientes al montar el componente
  useEffect(() => {
    loadRecentReports();
  }, [loadRecentReports]);

  // Limpiar estado de generación después de un tiempo
  useEffect(() => {
    if (generationStatus?.status === ReportStatus.COMPLETED || generationStatus?.status === ReportStatus.FAILED) {
      const timer = setTimeout(() => {
        setGenerationStatus(null);
      }, 5000); // Limpiar después de 5 segundos

      return () => clearTimeout(timer);
    }
  }, [generationStatus]);

  return {
    // Estados de datos
    reports,
    currentReport,
    recentReports,
    
    // Estados de UI
    loading,
    generating,
    error,
    
    // Estados de generación
    generationStatus,
    
    // Funciones principales
    generateReport,
    loadReport,
    loadReports,
    loadRecentReports,
    
    // Funciones de búsqueda y filtrado
    searchReportsByFilters,
    validateFilters,
    
    // Funciones de gestión
    updateStatus,
    deleteReportById,
    
    // Funciones de previsualización
    previewReportData,
    estimateReportSize,
    
    // Utilidades
    clearError,
    clearCurrentReport,
    refreshReports
  };
};