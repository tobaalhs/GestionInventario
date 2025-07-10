import { useState, useEffect, useCallback } from 'react';
import {
  ExportConfig,
  ExportFormat,
  ExportDataType,
  ExportResult,
  ExportHistory,
  ExportHistoryFilters,
  ExportHistorySearchResult,
  DeliveryStatus,
  DeliveryMethod,
  ScheduledExport,
  ExportHistoryStatus
} from '../interfaces/ExportConfig';
import {
  processExport,
  createExportConfig,
  getExportConfigs,
  searchExportHistory,
  validateExportConfig,
  generateFileName
} from '../services/exportService';

interface UseExportReturn {
  // Estados de datos
  configs: ExportConfig[];
  history: ExportHistory[];
  currentExport: ExportResult | null;
  scheduledExports: ScheduledExport[];
  
  // Estados de UI
  loading: boolean;
  exporting: boolean;
  error: string | null;
  success: string | null;
  
  // Estados de progreso
  exportProgress: {
    isExporting: boolean;
    progress: number;
    currentStep: string;
    estimatedTimeRemaining: number;
  };
  
  // Información de paginación para historial
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  
  // Funciones principales
  createConfig: (config: Omit<ExportConfig, 'id' | 'createdAt' | 'lastUsed' | 'useCount'>) => Promise<string>;
  loadConfigs: (dataType?: ExportDataType) => Promise<void>;
  updateConfig: (configId: string, updates: Partial<ExportConfig>) => Promise<void>;
  deleteConfig: (configId: string) => Promise<void>;
  
  // Funciones de exportación
  startExport: (config: ExportConfig, data: any[], userId: string, userEmail: string) => Promise<ExportResult>;
  cancelExport: () => void;
  
  // Funciones de historial
  loadHistory: (filters?: ExportHistoryFilters) => Promise<void>;
  searchHistory: (filters: ExportHistoryFilters) => Promise<void>;
  clearHistory: (beforeDate?: Date) => Promise<void>;
  
  // Funciones de validación
  validateConfig: (config: ExportConfig) => { isValid: boolean; errors: string[]; warnings: string[] };
  previewFileName: (config: ExportConfig) => string;
  estimateExportSize: (config: ExportConfig, recordCount: number) => { estimatedSize: number; estimatedTime: number };
  
  // Funciones de programación
  scheduleExport: (schedule: Omit<ScheduledExport, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  loadScheduledExports: () => Promise<void>;
  updateScheduledExport: (scheduleId: string, updates: Partial<ScheduledExport>) => Promise<void>;
  deleteScheduledExport: (scheduleId: string) => Promise<void>;
  
  // Funciones de descarga y entrega
  downloadExport: (exportId: string) => Promise<void>;
  resendExport: (exportId: string, deliveryMethod: DeliveryMethod) => Promise<void>;
  
  // Utilidades
  clearError: () => void;
  clearSuccess: () => void;
  refreshConfigs: () => Promise<void>;
  refreshHistory: () => Promise<void>;
}

export const useExport = (): UseExportReturn => {
  // Estados principales
  const [configs, setConfigs] = useState<ExportConfig[]>([]);
  const [history, setHistory] = useState<ExportHistory[]>([]);
  const [currentExport, setCurrentExport] = useState<ExportResult | null>(null);
  const [scheduledExports, setScheduledExports] = useState<ScheduledExport[]>([]);
  
  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados de progreso
  const [exportProgress, setExportProgress] = useState({
    isExporting: false,
    progress: 0,
    currentStep: '',
    estimatedTimeRemaining: 0
  });
  
  // Estados de paginación
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  
  // Estados internos
  const [currentHistoryFilters, setCurrentHistoryFilters] = useState<ExportHistoryFilters>({
    pageSize: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  /**
   * Crear nueva configuración de exportación
   */
  const createConfig = useCallback(async (
    config: Omit<ExportConfig, 'id' | 'createdAt' | 'lastUsed' | 'useCount'>
  ): Promise<string> => {
    try {
      setLoading(true);
      setError(null);

      console.log('⚙️ Creando configuración de exportación...', config.name);
      
      const configId = await createExportConfig(config);
      
      // Recargar configuraciones
      await loadConfigs();
      
      setSuccess(`Configuración "${config.name}" creada exitosamente`);
      console.log('✅ Configuración creada:', configId);
      
      return configId;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error creando configuración';
      setError(errorMessage);
      console.error('❌ Error creando configuración:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar configuraciones de exportación
   */
  const loadConfigs = useCallback(async (dataType?: ExportDataType): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('📋 Cargando configuraciones de exportación...');
      
      const loadedConfigs = await getExportConfigs(dataType);
      setConfigs(loadedConfigs);
      
      console.log(`✅ ${loadedConfigs.length} configuraciones cargadas`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando configuraciones';
      setError(errorMessage);
      console.error('❌ Error cargando configuraciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualizar configuración existente
   */
  const updateConfig = useCallback(async (
    configId: string, 
    updates: Partial<ExportConfig>
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Actualizando configuración:', configId);
      
      // Aquí implementarías la función updateExportConfig en el servicio
      // await updateExportConfig(configId, updates);
      
      // Por ahora solo actualizar localmente
      setConfigs(prev => prev.map(config => 
        config.id === configId ? { ...config, ...updates } : config
      ));
      
      setSuccess('Configuración actualizada exitosamente');
      console.log('✅ Configuración actualizada');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando configuración';
      setError(errorMessage);
      console.error('❌ Error actualizando configuración:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Eliminar configuración
   */
  const deleteConfig = useCallback(async (configId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🗑️ Eliminando configuración:', configId);
      
      // Aquí implementarías la función deleteExportConfig en el servicio
      // await deleteExportConfig(configId);
      
      // Por ahora solo eliminar localmente
      setConfigs(prev => prev.filter(config => config.id !== configId));
      
      setSuccess('Configuración eliminada exitosamente');
      console.log('✅ Configuración eliminada');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error eliminando configuración';
      setError(errorMessage);
      console.error('❌ Error eliminando configuración:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Iniciar proceso de exportación
   */
  const startExport = useCallback(async (
    config: ExportConfig,
    data: any[],
    userId: string,
    userEmail: string
  ): Promise<ExportResult> => {
    try {
      setExporting(true);
      setError(null);
      setCurrentExport(null);

      // Inicializar progreso
      setExportProgress({
        isExporting: true,
        progress: 0,
        currentStep: 'Iniciando exportación...',
        estimatedTimeRemaining: 30
      });

      console.log('📤 Iniciando exportación...', config.name);

      // Simular progreso de exportación
      const progressSteps = [
        { progress: 10, step: 'Validando configuración...', time: 25 },
        { progress: 25, step: 'Preparando datos...', time: 20 },
        { progress: 50, step: 'Aplicando formato...', time: 15 },
        { progress: 75, step: 'Generando archivo...', time: 10 },
        { progress: 90, step: 'Procesando entrega...', time: 5 },
        { progress: 100, step: 'Completado', time: 0 }
      ];

      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setExportProgress(prev => ({
          ...prev,
          progress: step.progress,
          currentStep: step.step,
          estimatedTimeRemaining: step.time
        }));
      }

      // Procesar exportación real
      const result = await processExport(config, data, userId, userEmail);
      
      setCurrentExport(result);
      setExportProgress(prev => ({ ...prev, isExporting: false }));
      
      // Recargar historial
      await loadHistory();
      
      if (result.success) {
        setSuccess(`Exportación completada: ${result.fileName}`);
      } else {
        setError(result.error || 'Error en la exportación');
      }
      
      console.log('✅ Exportación completada:', result.fileName);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error en la exportación';
      setError(errorMessage);
      setExportProgress(prev => ({ ...prev, isExporting: false }));
      console.error('❌ Error en exportación:', err);
      throw err;
    } finally {
      setExporting(false);
    }
  }, []);

  /**
   * Cancelar exportación en curso
   */
  const cancelExport = useCallback((): void => {
    setExporting(false);
    setExportProgress({
      isExporting: false,
      progress: 0,
      currentStep: 'Cancelado',
      estimatedTimeRemaining: 0
    });
    setError('Exportación cancelada por el usuario');
    console.log('🚫 Exportación cancelada');
  }, []);

  /**
   * Cargar historial de exportaciones
   */
  const loadHistory = useCallback(async (filters?: ExportHistoryFilters): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const filtersToUse = filters || currentHistoryFilters;
      setCurrentHistoryFilters(filtersToUse);

      console.log('📋 Cargando historial de exportaciones...');
      
      const result: ExportHistorySearchResult = await searchExportHistory(filtersToUse);
      
      setHistory(result.exports);
      setTotalCount(result.totalCount);
      setCurrentPage(result.currentPage);
      setTotalPages(result.totalPages);
      setHasNext(result.hasNext);
      setHasPrevious(result.hasPrevious);
      
      console.log(`✅ ${result.exports.length} exportaciones cargadas`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando historial';
      setError(errorMessage);
      console.error('❌ Error cargando historial:', err);
    } finally {
      setLoading(false);
    }
  }, [currentHistoryFilters]);

  /**
   * Buscar en historial con filtros específicos
   */
  const searchHistory = useCallback(async (filters: ExportHistoryFilters): Promise<void> => {
    await loadHistory(filters);
  }, [loadHistory]);

  /**
   * Limpiar historial anterior a una fecha
   */
  const clearHistory = useCallback(async (beforeDate?: Date): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const cutoffDate = beforeDate || (() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 3); // 3 meses por defecto
        return date;
      })();

      console.log('🧹 Limpiando historial anterior a:', cutoffDate);
      
      // Aquí implementarías la función clearExportHistory en el servicio
      // await clearExportHistory(cutoffDate);
      
      // Por ahora solo filtrar localmente
      setHistory(prev => prev.filter(exp => exp.createdAt >= cutoffDate));
      
      setSuccess('Historial limpiado exitosamente');
      console.log('✅ Historial limpiado');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error limpiando historial';
      setError(errorMessage);
      console.error('❌ Error limpiando historial:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Validar configuración de exportación
   */
  const validateConfig = useCallback((config: ExportConfig) => {
    return validateExportConfig(config);
  }, []);

  /**
   * Previsualizar nombre de archivo
   */
  const previewFileName = useCallback((config: ExportConfig): string => {
    return generateFileName(config, config.includeTimestamp);
  }, []);

  /**
   * Estimar tamaño y tiempo de exportación
   */
  const estimateExportSize = useCallback((
    config: ExportConfig, 
    recordCount: number
  ): { estimatedSize: number; estimatedTime: number } => {
    // Estimaciones aproximadas basadas en formato y cantidad de registros
    let bytesPerRecord = 100; // Base
    
    switch (config.format) {
      case ExportFormat.PDF:
        bytesPerRecord = 200;
        break;
      case ExportFormat.EXCEL:
        bytesPerRecord = 150;
        break;
      case ExportFormat.CSV:
        bytesPerRecord = 80;
        break;
      case ExportFormat.JSON:
        bytesPerRecord = 120;
        break;
      case ExportFormat.XML:
        bytesPerRecord = 180;
        break;
    }
    
    // Ajustar por número de columnas
    bytesPerRecord *= config.columns.length * 0.1;
    
    // Ajustar por opciones adicionales
    if (config.formatSettings.pdf?.includeCharts || config.formatSettings.excel?.includeCharts) {
      bytesPerRecord *= 1.5;
    }
    
    if (config.security.encrypt) {
      bytesPerRecord *= 1.2;
    }
    
    const estimatedSize = Math.round(recordCount * bytesPerRecord);
    const estimatedTime = Math.max(Math.round(recordCount / 1000), 5); // Mínimo 5 segundos
    
    return { estimatedSize, estimatedTime };
  }, []);

  /**
   * Programar exportación automática
   */
  const scheduleExport = useCallback(async (
    schedule: Omit<ScheduledExport, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    try {
      setLoading(true);
      setError(null);

      console.log('⏰ Programando exportación automática...', schedule.name);
      
      // Aquí implementarías la función createScheduledExport en el servicio
      // const scheduleId = await createScheduledExport(schedule);
      
      // Por ahora simular ID
      const scheduleId = `schedule_${Date.now()}`;
      
      const newSchedule: ScheduledExport = {
        ...schedule,
        id: scheduleId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setScheduledExports(prev => [...prev, newSchedule]);
      
      setSuccess(`Exportación programada "${schedule.name}" creada exitosamente`);
      console.log('✅ Exportación programada:', scheduleId);
      
      return scheduleId;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error programando exportación';
      setError(errorMessage);
      console.error('❌ Error programando exportación:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cargar exportaciones programadas
   */
  const loadScheduledExports = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('⏰ Cargando exportaciones programadas...');
      
      // Aquí implementarías la función getScheduledExports en el servicio
      // const scheduled = await getScheduledExports();
      
      // Por ahora usar datos simulados
      setScheduledExports([]);
      
      console.log('✅ Exportaciones programadas cargadas');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error cargando exportaciones programadas';
      setError(errorMessage);
      console.error('❌ Error cargando exportaciones programadas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualizar exportación programada
   */
  const updateScheduledExport = useCallback(async (
    scheduleId: string, 
    updates: Partial<ScheduledExport>
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Actualizando exportación programada:', scheduleId);
      
      // Aquí implementarías la función updateScheduledExport en el servicio
      // await updateScheduledExport(scheduleId, updates);
      
      setScheduledExports(prev => prev.map(schedule => 
        schedule.id === scheduleId ? { ...schedule, ...updates, updatedAt: new Date() } : schedule
      ));
      
      setSuccess('Exportación programada actualizada exitosamente');
      console.log('✅ Exportación programada actualizada');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error actualizando exportación programada';
      setError(errorMessage);
      console.error('❌ Error actualizando exportación programada:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Eliminar exportación programada
   */
  const deleteScheduledExport = useCallback(async (scheduleId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🗑️ Eliminando exportación programada:', scheduleId);
      
      // Aquí implementarías la función deleteScheduledExport en el servicio
      // await deleteScheduledExport(scheduleId);
      
      setScheduledExports(prev => prev.filter(schedule => schedule.id !== scheduleId));
      
      setSuccess('Exportación programada eliminada exitosamente');
      console.log('✅ Exportación programada eliminada');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error eliminando exportación programada';
      setError(errorMessage);
      console.error('❌ Error eliminando exportación programada:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Descargar exportación
   */
  const downloadExport = useCallback(async (exportId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const exportItem = history.find(exp => exp.id === exportId);
      if (!exportItem || !exportItem.result.downloadUrl) {
        throw new Error('Exportación no encontrada o sin URL de descarga');
      }

      console.log('📥 Descargando exportación:', exportItem.result.fileName);
      
      // Abrir enlace de descarga
      window.open(exportItem.result.downloadUrl, '_blank');
      
      console.log('✅ Descarga iniciada');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error descargando exportación';
      setError(errorMessage);
      console.error('❌ Error descargando exportación:', err);
    } finally {
      setLoading(false);
    }
  }, [history]);

  /**
   * Reenviar exportación por otro método
   */
  const resendExport = useCallback(async (
    exportId: string, 
    deliveryMethod: DeliveryMethod
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('📤 Reenviando exportación:', exportId, 'por', deliveryMethod);
      
      // Aquí implementarías la función resendExport en el servicio
      // await resendExport(exportId, deliveryMethod);
      
      setSuccess(`Exportación reenviada por ${deliveryMethod}`);
      console.log('✅ Exportación reenviada');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error reenviando exportación';
      setError(errorMessage);
      console.error('❌ Error reenviando exportación:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Limpiar error
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Limpiar mensaje de éxito
   */
  const clearSuccess = useCallback((): void => {
    setSuccess(null);
  }, []);

  /**
   * Refrescar configuraciones
   */
  const refreshConfigs = useCallback(async (): Promise<void> => {
    await loadConfigs();
  }, [loadConfigs]);

  /**
   * Refrescar historial
   */
  const refreshHistory = useCallback(async (): Promise<void> => {
    await loadHistory(currentHistoryFilters);
  }, [loadHistory, currentHistoryFilters]);

  // Cargar datos iniciales
  useEffect(() => {
    loadConfigs();
    loadHistory();
    loadScheduledExports();
  }, []);

  // Limpiar mensajes automáticamente
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Limpiar progreso después de completar
  useEffect(() => {
    if (!exportProgress.isExporting && exportProgress.progress === 100) {
      const timer = setTimeout(() => {
        setExportProgress({
          isExporting: false,
          progress: 0,
          currentStep: '',
          estimatedTimeRemaining: 0
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [exportProgress]);

  return {
    // Estados de datos
    configs,
    history,
    currentExport,
    scheduledExports,
    
    // Estados de UI
    loading,
    exporting,
    error,
    success,
    
    // Estados de progreso
    exportProgress,
    
    // Información de paginación
    totalCount,
    currentPage,
    totalPages,
    hasNext,
    hasPrevious,
    
    // Funciones principales
    createConfig,
    loadConfigs,
    updateConfig,
    deleteConfig,
    
    // Funciones de exportación
    startExport,
    cancelExport,
    
    // Funciones de historial
    loadHistory,
    searchHistory,
    clearHistory,
    
    // Funciones de validación
    validateConfig,
    previewFileName,
    estimateExportSize,
    
    // Funciones de programación
    scheduleExport,
    loadScheduledExports,
    updateScheduledExport,
    deleteScheduledExport,
    
    // Funciones de descarga y entrega
    downloadExport,
    resendExport,
    
    // Utilidades
    clearError,
    clearSuccess,
    refreshConfigs,
    refreshHistory
  };
};