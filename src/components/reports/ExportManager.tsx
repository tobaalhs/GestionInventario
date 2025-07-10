import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './ExportManager.css';
import { ExportColumn } from '../../interfaces/ExportConfig';
import {
  ExportConfig,
  ExportFormat,
  ExportDataType,
  ExportResult,
  ExportHistory,
  ColumnType,
  AggregationType,
  ExportHistoryFilters,
  ChartType, 
  DeliveryMethod,
  DeliveryStatus
} from '../../interfaces/ExportConfig';
import {
  processExport,
  createExportConfig,
  getExportConfigs,
  searchExportHistory
} from '../../services/exportService';
import { searchMovements } from '../../services/movementHistoryService';
import { getRecentReports } from '../../services/reportService';
import ReportModal from './ReportModal';


interface ExportManagerProps {}

const ExportManager: React.FC<ExportManagerProps> = () => {
  const { currentUser } = useAuth();
  
  // Estados principales
  const [exportConfigs, setExportConfigs] = useState<ExportConfig[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados de modales
  const [showCreateConfigModal, setShowCreateConfigModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ExportConfig | null>(null);
  const [selectedExport, setSelectedExport] = useState<ExportHistory | null>(null);
  
  // Estado del formulario de configuración
  const [configForm, setConfigForm] = useState({
    name: '',
    description: '',
    format: ExportFormat.EXCEL,
    dataType: ExportDataType.MOVEMENT_HISTORY,
    fileName: 'exportacion',
    includeTimestamp: true,
    // Configuración de contenido
    includeHeaders: true,
    includeStatistics: true,
    includeCharts: false,
    // Configuración de seguridad
    passwordProtect: false,
    password: '',
    // Configuración de entrega
    deliveryMethod: DeliveryMethod.DOWNLOAD,
    emailRecipients: '',
    // Configuración corporativa
    includeLogo: true,
    companyName: 'Mi Empresa',
    includeWatermark: false,
    watermarkText: 'CONFIDENCIAL'
  });

  // Estado del formulario de exportación
  const [exportForm, setExportForm] = useState({
    configId: '',
    startDate: (() => {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      return date.toISOString().split('T')[0];
    })(),
    endDate: new Date().toISOString().split('T')[0],
    additionalFilters: {}
  });

  // Estado de progreso de exportación
  const [exportProgress, setExportProgress] = useState<{
    isExporting: boolean;
    progress: number;
    currentStep: string;
    result?: ExportResult;
  }>({
    isExporting: false,
    progress: 0,
    currentStep: ''
  });

  useEffect(() => {
    loadExportConfigs();
    loadExportHistory();
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadExportConfigs = async () => {
    try {
      setLoading(true);
      const configs = await getExportConfigs();
      setExportConfigs(configs);
    } catch (err) {
      setError('Error cargando configuraciones de exportación');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadExportHistory = async () => {
    try {
      const filters: ExportHistoryFilters = {
        pageSize: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
      
      const result = await searchExportHistory(filters);
      setExportHistory(result.exports);
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  };

  const handleCreateConfig = async () => {
    try {
      if (!currentUser) throw new Error('Usuario no autenticado');

      setLoading(true);

      // Construir configuración completa
      const newConfig = buildExportConfig();
      await createExportConfig(newConfig);
      await loadExportConfigs();
      
      setShowCreateConfigModal(false);
      resetConfigForm();
      setSuccess('Configuración creada exitosamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando configuración');
    } finally {
      setLoading(false);
    }
  };

  const buildExportConfig = () => {
    if (!currentUser) throw new Error('Usuario no autenticado');

    // Construir columnas según el tipo de datos
    const columns = getColumnsForDataType(configForm.dataType);

    // Construir configuración de formato
    const formatSettings = getFormatSettings(configForm.format);

    // Construir configuración de seguridad
    const security = {
      requireAuthentication: true,
      allowedUsers: [currentUser.uid],
      allowedRoles: ['admin'],
      passwordProtect: configForm.passwordProtect,
      password: configForm.passwordProtect ? configForm.password : undefined,
      autoGeneratePassword: false,
      encrypt: false,
      encryptionAlgorithm: 'AES-256' as const,
      watermark: {
        enabled: configForm.includeWatermark,
        text: configForm.watermarkText,
        position: 'center' as const,
        opacity: 0.3,
        fontSize: 12,
        color: '#cccccc',
        rotation: 45,
        includeTimestamp: true,
        includeUserName: true
      },
      logAccess: true,
      logDownloads: true,
      expiresAfter: 24,
      deleteAfterExpiry: false,
      redactSensitiveData: false,
      sensitiveFields: [],
      replacementText: '[REDACTED]'
    };

    // Construir configuración de entrega
    const delivery = {
      method: configForm.deliveryMethod,
      download: {
        enabled: configForm.deliveryMethod === DeliveryMethod.DOWNLOAD,
        autoDownload: true,
        generateLink: true,
        linkExpiresAfter: 24,
        maxDownloads: 10,
        requirePassword: configForm.passwordProtect,
        notifyOnDownload: true
      },
      email: configForm.deliveryMethod === DeliveryMethod.EMAIL ? {
        enabled: true,
        recipients: configForm.emailRecipients.split(',').map(email => email.trim()),
        subject: `Exportación: ${configForm.name}`,
        body: 'Adjunto encontrarás la exportación solicitada.',
        attachAsFile: true,
        compressAttachment: true,
        includeInlineCharts: configForm.includeCharts,
        sendNotification: true,
        priority: 'normal' as const,
        deliveryConfirmation: true
      } : undefined
    };

    // Construir configuración de branding
    const branding = {
      enabled: configForm.includeLogo,
      includeLogo: configForm.includeLogo,
      logoPosition: 'header' as const,
      logoSize: { width: 100, height: 50 },
      companyName: configForm.companyName,
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      textColor: '#1f2937',
      backgroundColor: '#ffffff',
      headerFont: 'Arial, sans-serif',
      bodyFont: 'Arial, sans-serif',
      footerFont: 'Arial, sans-serif',
      headerHeight: 80,
      footerHeight: 60,
      includeTimestamp: true,
      includePageInfo: true,
      includeDisclaimer: true,
      disclaimerText: 'Este documento contiene información confidencial.',
      confidentialityNotice: 'CONFIDENCIAL - Solo para uso interno'
    };

    return {
      name: configForm.name,
      description: configForm.description,
      format: configForm.format,
      fileName: configForm.fileName,
      includeTimestamp: configForm.includeTimestamp,
      dataType: configForm.dataType,
      columns,
      filters: {},
      formatSettings,
      security,
      delivery,
      branding,
      createdBy: currentUser.uid,
      isTemplate: false,
      isActive: true
    };
  };

  const handleExportData = async () => {
    try {
      if (!currentUser || !selectedConfig) throw new Error('Configuración no seleccionada');

      setExportProgress({
        isExporting: true,
        progress: 0,
        currentStep: 'Preparando exportación...'
      });

      // Simular progreso
      const progressSteps = [
        { progress: 10, step: 'Validando configuración...' },
        { progress: 25, step: 'Obteniendo datos...' },
        { progress: 50, step: 'Procesando información...' },
        { progress: 75, step: 'Generando archivo...' },
        { progress: 90, step: 'Aplicando formato...' },
        { progress: 100, step: 'Completado' }
      ];

      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setExportProgress(prev => ({
          ...prev,
          progress: step.progress,
          currentStep: step.step
        }));
      }

      // Obtener datos según el tipo
      let data: any[] = [];
      
      switch (selectedConfig.dataType) {
        case ExportDataType.MOVEMENT_HISTORY:
          const movementResult = await searchMovements({
            startDate: new Date(exportForm.startDate),
            endDate: new Date(exportForm.endDate),
            pageSize: 10000
          });
          data = movementResult.movements;
          break;
          
        case ExportDataType.TRANSACTION_REPORTS:
          const reports = await getRecentReports(1000);
          data = reports.filter(report => 
            report.generatedAt >= new Date(exportForm.startDate) &&
            report.generatedAt <= new Date(exportForm.endDate)
          );
          break;
          
        default:
          data = [];
      }

      // Procesar exportación
      const result = await processExport(
        selectedConfig,
        data,
        currentUser.uid,
        currentUser.email || 'admin'
      );

      setExportProgress(prev => ({
        ...prev,
        result
      }));

      await loadExportHistory();
      setSuccess(`Exportación completada: ${result.fileName}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en exportación');
      setExportProgress(prev => ({ ...prev, isExporting: false }));
    }
  };

  const getColumnsForDataType = (dataType: ExportDataType): ExportColumn[] => {
  switch (dataType) {
    case ExportDataType.MOVEMENT_HISTORY:
      return [
        { 
          id: 'date', 
          name: 'Fecha', 
          header: 'Fecha', 
          type: ColumnType.DATETIME,    // ✅ Usar enum, no string
          required: true, 
          sortable: true, 
          groupable: false, 
          aggregable: false 
        },
        { 
          id: 'productCode', 
          name: 'Código', 
          header: 'Código Producto', 
          type: ColumnType.TEXT,        // ✅ Usar enum, no string
          required: true, 
          sortable: true, 
          groupable: true, 
          aggregable: false 
        },
        { 
          id: 'productName', 
          name: 'Producto', 
          header: 'Nombre Producto', 
          type: ColumnType.TEXT,        // ✅ Usar enum, no string
          required: true, 
          sortable: true, 
          groupable: true, 
          aggregable: false 
        },
        { 
          id: 'type', 
          name: 'Tipo', 
          header: 'Tipo Movimiento', 
          type: ColumnType.TEXT,        // ✅ Usar enum, no string
          required: true, 
          sortable: true, 
          groupable: true, 
          aggregable: false 
        },
        { 
          id: 'quantity', 
          name: 'Cantidad', 
          header: 'Cantidad', 
          type: ColumnType.NUMBER,      // ✅ Usar enum, no string
          required: true, 
          sortable: true, 
          groupable: false, 
          aggregable: true, 
          aggregationType: AggregationType.SUM  // ✅ Usar enum, no string
        },
        { 
          id: 'resultingStock', 
          name: 'Stock', 
          header: 'Stock Resultante', 
          type: ColumnType.NUMBER,      // ✅ Usar enum, no string
          required: true, 
          sortable: true, 
          groupable: false, 
          aggregable: false 
        },
        { 
          id: 'totalValue', 
          name: 'Valor', 
          header: 'Valor Total', 
          type: ColumnType.CURRENCY,    // ✅ Usar enum, no string
          required: false, 
          sortable: true, 
          groupable: false, 
          aggregable: true, 
          aggregationType: AggregationType.SUM  // ✅ Usar enum, no string
        },
        { 
          id: 'userName', 
          name: 'Usuario', 
          header: 'Usuario', 
          type: ColumnType.TEXT,        // ✅ Usar enum, no string
          required: true, 
          sortable: true, 
          groupable: true, 
          aggregable: false 
        }
      ];
      
    case ExportDataType.TRANSACTION_REPORTS:
      return [
        { 
          id: 'code', 
          name: 'Código', 
          header: 'Código Reporte', 
          type: ColumnType.TEXT,        // ✅ Usar enum, no string
          required: true, 
          sortable: true, 
          groupable: false, 
          aggregable: false 
        },
        { 
          id: 'title', 
          name: 'Título', 
          header: 'Título', 
          type: ColumnType.TEXT,        // ✅ Usar enum, no string
          required: true, 
          sortable: true, 
          groupable: false, 
          aggregable: false 
        },
        { 
          id: 'type', 
          name: 'Tipo', 
          header: 'Tipo Reporte', 
          type: ColumnType.TEXT,        // ✅ Usar enum, no string
          required: true, 
          sortable: true, 
          groupable: true, 
          aggregable: false 
        },
        { 
          id: 'status', 
          name: 'Estado', 
          header: 'Estado', 
          type: ColumnType.TEXT,        // ✅ Usar enum, no string
          required: true, 
          sortable: true, 
          groupable: true, 
          aggregable: false 
        },
        { 
          id: 'generatedAt', 
          name: 'Fecha', 
          header: 'Fecha Generación', 
          type: ColumnType.DATETIME,    // ✅ Usar enum, no string
          required: true, 
          sortable: true, 
          groupable: false, 
          aggregable: false 
        },
        { 
          id: 'generatedByName', 
          name: 'Usuario', 
          header: 'Generado Por', 
          type: ColumnType.TEXT,        // ✅ Usar enum, no string
          required: true, 
          sortable: true, 
          groupable: true, 
          aggregable: false 
        }
      ];
      
    default:
      return [];
  }
};

  const getFormatSettings = (format: ExportFormat) => {
  switch (format) {
    case ExportFormat.PDF:
      return {
        pdf: {
          pageSize: 'A4' as const,
          orientation: 'landscape' as const,
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
          includeHeader: true,
          includeFooter: true,
          includePageNumbers: true,
          includeToc: false,
          includeCharts: configForm.includeCharts,
          chartSettings: {
            includeCharts: configForm.includeCharts,
            chartTypes: [ChartType.BAR, ChartType.LINE, ChartType.PIE], // ✅ Usar enum ChartType
            chartSize: { width: 400, height: 300 },
            chartColors: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'],
            showDataLabels: true,
            showLegend: true,
            showGridLines: true
          },
          compression: true,
          quality: 'high' as const,
          bookmarks: false,
          allowPrint: true,
          allowCopy: true,
          allowEdit: false
        }
      };
      
    case ExportFormat.EXCEL:
      return {
        excel: {
          includeHeader: configForm.includeHeaders,
          includeFilters: true,
          includePivotTable: false,
          includeCharts: configForm.includeCharts,
          chartSettings: {
            includeCharts: configForm.includeCharts,
            chartTypes: [ChartType.COLUMN, ChartType.LINE, ChartType.PIE], // ✅ Usar enum ChartType
            chartSize: { width: 500, height: 300 },
            chartColors: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'],
            showDataLabels: true,
            showLegend: true,
            showGridLines: true
          },
          worksheetName: 'Datos',
          freezePanes: true,
          freezeRow: 1,
          freezeColumn: 0,
          columnWidthAuto: true,
          includeFormulas: false,
          protectWorksheet: configForm.passwordProtect,
          worksheetPassword: configForm.passwordProtect ? configForm.password : undefined,
          compression: true
        }
      };
      
    case ExportFormat.CSV:
      return {
        csv: {
          delimiter: ',' as const,
          textQualifier: '"' as const,
          encoding: 'UTF-8' as const,
          includeHeader: configForm.includeHeaders,
          dateFormat: 'DD/MM/YYYY',
          numberFormat: '#,##0.00',
          booleanFormat: 'true/false' as const,
          nullValue: '',
          escapeQuotes: true
        }
      };
      
    default:
      return {};
  }
};

  const resetConfigForm = () => {
    setConfigForm({
      name: '',
      description: '',
      format: ExportFormat.EXCEL,
      dataType: ExportDataType.MOVEMENT_HISTORY,
      fileName: 'exportacion',
      includeTimestamp: true,
      includeHeaders: true,
      includeStatistics: true,
      includeCharts: false,
      passwordProtect: false,
      password: '',
      deliveryMethod: DeliveryMethod.DOWNLOAD,
      emailRecipients: '',
      includeLogo: true,
      companyName: 'Mi Empresa',
      includeWatermark: false,
      watermarkText: 'CONFIDENCIAL'
    });
  };

  const getFormatLabel = (format: ExportFormat): string => {
    const labels = {
      [ExportFormat.PDF]: 'PDF',
      [ExportFormat.EXCEL]: 'Excel',
      [ExportFormat.CSV]: 'CSV',
      [ExportFormat.JSON]: 'JSON',
      [ExportFormat.XML]: 'XML',
      [ExportFormat.ZIP]: 'ZIP'
    };
    return labels[format];
  };

  const getDataTypeLabel = (dataType: ExportDataType): string => {
    const labels = {
      [ExportDataType.MOVEMENT_HISTORY]: 'Historial de Movimientos',
      [ExportDataType.TRANSACTION_REPORTS]: 'Reportes de Transacciones',
      [ExportDataType.SALES_REPORTS]: 'Reportes de Ventas',
      [ExportDataType.PURCHASE_REPORTS]: 'Reportes de Compras',
      [ExportDataType.INVENTORY_STATUS]: 'Estado del Inventario',
      [ExportDataType.CUSTOMER_DATA]: 'Datos de Clientes',
      [ExportDataType.SUPPLIER_DATA]: 'Datos de Proveedores',
      [ExportDataType.USER_ACTIVITY]: 'Actividad de Usuarios',
      [ExportDataType.FINANCIAL_SUMMARY]: 'Resumen Financiero',
      [ExportDataType.CUSTOM_QUERY]: 'Consulta Personalizada'
    };
    return labels[dataType];
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'danger';
      case 'expired': return 'warning';
      default: return 'secondary';
    }
  };

  const renderConfigForm = () => (
    <div className="config-form">
      <div className="form-section">
        <h4>📋 Información Básica</h4>
        <div className="form-row">
          <div className="form-group">
            <label>Nombre de la configuración:</label>
            <input
              type="text"
              value={configForm.name}
              onChange={(e) => setConfigForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Reporte mensual de movimientos"
              className="filter-select"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Nombre del archivo:</label>
            <input
              type="text"
              value={configForm.fileName}
              onChange={(e) => setConfigForm(prev => ({ ...prev, fileName: e.target.value }))}
              placeholder="exportacion"
              className="filter-select"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Descripción (opcional):</label>
          <textarea
            value={configForm.description}
            onChange={(e) => setConfigForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descripción de la configuración..."
            rows={3}
            className="filter-select"
          />
        </div>
      </div>

      <div className="form-section">
        <h4>📊 Configuración de Datos</h4>
        <div className="form-row">
          <div className="form-group">
            <label>Tipo de datos:</label>
            <select
              value={configForm.dataType}
              onChange={(e) => setConfigForm(prev => ({ ...prev, dataType: e.target.value as ExportDataType }))}
              className="filter-select"
              required
            >
              <option value={ExportDataType.MOVEMENT_HISTORY}>Historial de Movimientos</option>
              <option value={ExportDataType.TRANSACTION_REPORTS}>Reportes de Transacciones</option>
              <option value={ExportDataType.INVENTORY_STATUS}>Estado del Inventario</option>
            </select>
          </div>

          <div className="form-group">
            <label>Formato de exportación:</label>
            <select
              value={configForm.format}
              onChange={(e) => setConfigForm(prev => ({ ...prev, format: e.target.value as ExportFormat }))}
              className="filter-select"
              required
            >
              <option value={ExportFormat.EXCEL}>📊 Excel (.xlsx)</option>
              <option value={ExportFormat.PDF}>📄 PDF</option>
              <option value={ExportFormat.CSV}>📝 CSV</option>
              <option value={ExportFormat.JSON}>🔗 JSON</option>
            </select>
          </div>
        </div>

        <div className="form-options">
          <label>
            <input
              type="checkbox"
              checked={configForm.includeTimestamp}
              onChange={(e) => setConfigForm(prev => ({ ...prev, includeTimestamp: e.target.checked }))}
            />
            Incluir timestamp en el nombre del archivo
          </label>

          <label>
            <input
              type="checkbox"
              checked={configForm.includeHeaders}
              onChange={(e) => setConfigForm(prev => ({ ...prev, includeHeaders: e.target.checked }))}
            />
            Incluir encabezados de columnas
          </label>

          <label>
            <input
              type="checkbox"
              checked={configForm.includeStatistics}
              onChange={(e) => setConfigForm(prev => ({ ...prev, includeStatistics: e.target.checked }))}
            />
            Incluir estadísticas resumidas
          </label>

          <label>
            <input
              type="checkbox"
              checked={configForm.includeCharts}
              onChange={(e) => setConfigForm(prev => ({ ...prev, includeCharts: e.target.checked }))}
            />
            Incluir gráficos y visualizaciones
          </label>
        </div>
      </div>

      <div className="form-section">
        <h4>🔒 Seguridad</h4>
        <div className="form-options">
          <label>
            <input
              type="checkbox"
              checked={configForm.passwordProtect}
              onChange={(e) => setConfigForm(prev => ({ ...prev, passwordProtect: e.target.checked }))}
            />
            Proteger con contraseña
          </label>

          {configForm.passwordProtect && (
            <div className="form-group">
              <label>Contraseña:</label>
              <input
                type="password"
                value={configForm.password}
                onChange={(e) => setConfigForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Contraseña de protección"
                className="filter-select"
                required
              />
            </div>
          )}

          <label>
            <input
              type="checkbox"
              checked={configForm.includeWatermark}
              onChange={(e) => setConfigForm(prev => ({ ...prev, includeWatermark: e.target.checked }))}
            />
            Incluir marca de agua
          </label>

          {configForm.includeWatermark && (
            <div className="form-group">
              <label>Texto de marca de agua:</label>
              <input
                type="text"
                value={configForm.watermarkText}
                onChange={(e) => setConfigForm(prev => ({ ...prev, watermarkText: e.target.value }))}
                placeholder="CONFIDENCIAL"
                className="filter-select"
              />
            </div>
          )}
        </div>
      </div>

      <div className="form-section">
        <h4>📤 Entrega</h4>
        <div className="form-group">
          <label>Método de entrega:</label>
          <select
            value={configForm.deliveryMethod}
            onChange={(e) => setConfigForm(prev => ({ ...prev, deliveryMethod: e.target.value as DeliveryMethod }))}
            className="filter-select"
          >
            <option value={DeliveryMethod.DOWNLOAD}>📥 Descarga directa</option>
            <option value={DeliveryMethod.EMAIL}>📧 Envío por email</option>
          </select>
        </div>

        {configForm.deliveryMethod === DeliveryMethod.EMAIL && (
          <div className="form-group">
            <label>Destinatarios (separados por coma):</label>
            <input
              type="text"
              value={configForm.emailRecipients}
              onChange={(e) => setConfigForm(prev => ({ ...prev, emailRecipients: e.target.value }))}
              placeholder="admin@empresa.com, gerente@empresa.com"
              className="filter-select"
              required
            />
          </div>
        )}
      </div>

      <div className="form-section">
        <h4>🏢 Branding Corporativo</h4>
        <div className="form-row">
          <div className="form-group">
            <label>Nombre de la empresa:</label>
            <input
              type="text"
              value={configForm.companyName}
              onChange={(e) => setConfigForm(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder="Mi Empresa"
              className="filter-select"
            />
          </div>
        </div>

        <div className="form-options">
          <label>
            <input
              type="checkbox"
              checked={configForm.includeLogo}
              onChange={(e) => setConfigForm(prev => ({ ...prev, includeLogo: e.target.checked }))}
            />
            Incluir logo de la empresa
          </label>
        </div>
      </div>
    </div>
  );

  const renderExportProgress = () => {
    if (!exportProgress.isExporting && !exportProgress.result) return null;

    return (
      <div className="export-progress">
        <div className="progress-card">
          <div className="progress-header">
            <h4>
              {exportProgress.result ? '✅ Exportación Completada' : '🔄 Exportando Datos'}
            </h4>
          </div>
          
          {!exportProgress.result && (
            <>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${exportProgress.progress}%` }}
                />
              </div>
              
              <div className="progress-details">
                <p><strong>Paso actual:</strong> {exportProgress.currentStep}</p>
                <p><strong>Progreso:</strong> {exportProgress.progress}%</p>
              </div>
            </>
          )}

          {exportProgress.result && (
            <div className="result-details">
              <div className="result-item">
                <span>📁 Archivo:</span>
                <span>{exportProgress.result.fileName}</span>
              </div>
              <div className="result-item">
                <span>📊 Registros:</span>
                <span>{exportProgress.result.recordCount.toLocaleString()}</span>
              </div>
              <div className="result-item">
                <span>💾 Tamaño:</span>
                <span>{(exportProgress.result.fileSize / 1024).toFixed(1)} KB</span>
              </div>
              <div className="result-item">
                <span>⏱️ Tiempo:</span>
                <span>{(exportProgress.result.processingTime / 1000).toFixed(1)}s</span>
              </div>
              
              {exportProgress.result.downloadUrl && (
                <div className="result-actions">
                  <a 
                    href={exportProgress.result.downloadUrl}
                    download={exportProgress.result.fileName}
                    className="btn btn-primary"
                  >
                    📥 Descargar Archivo
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExportHistory = () => (
    <div className="export-history">
      <h3>📋 Historial de Exportaciones</h3>
      
      {exportHistory.length === 0 ? (
        <div className="no-results">
          <div className="no-results-icon">📊</div>
          <h4>No hay exportaciones</h4>
          <p>Aún no se han realizado exportaciones.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Configuración</th>
                <th>Formato</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Registros</th>
                <th>Tamaño</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {exportHistory.slice(0, 10).map((export_) => (
                <tr key={export_.id}>
                  <td>
                    <strong>{export_.result.fileName}</strong>
                  </td>
                  <td>{export_.configName}</td>
                  <td>
                    <span className="status-badge secondary">
                      {getFormatLabel(export_.format)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusColor(export_.status)}`}>
                      {export_.status === 'completed' ? 'Completado' : 'Error'}
                    </span>
                  </td>
                  <td>{export_.createdAt.toLocaleDateString('es-CL')}</td>
                  <td>{export_.recordCount.toLocaleString()}</td>
                  <td>{(export_.fileSize / 1024).toFixed(1)} KB</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-sm btn-info"
                        onClick={() => {
                          setSelectedExport(export_);
                          setShowHistoryModal(true);
                        }}
                        title="Ver detalles"
                      >
                        👁️
                      </button>
                      {export_.status === 'completed' && export_.result.downloadUrl && (
                        <a 
                          href={export_.result.downloadUrl}
                          download={export_.result.fileName}
                          className="btn btn-sm btn-success"
                          title="Descargar"
                        >
                          📥
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderConfigsList = () => (
    <div className="configs-list">
      <h3>⚙️ Configuraciones de Exportación</h3>
      
      {exportConfigs.length === 0 ? (
        <div className="no-results">
          <div className="no-results-icon">⚙️</div>
          <h4>No hay configuraciones</h4>
          <p>Crea tu primera configuración para comenzar.</p>
        </div>
      ) : (
        <div className="configs-grid">
          {exportConfigs.map((config) => (
            <div key={config.id} className="config-card">
              <div className="config-header">
                <h4>{config.name}</h4>
                <span className={`status-badge ${getFormatLabel(config.format).toLowerCase()}`}>
                  {getFormatLabel(config.format)}
                </span>
              </div>
              
              <div className="config-body">
                <p><strong>Tipo:</strong> {getDataTypeLabel(config.dataType)}</p>
                <p><strong>Archivo:</strong> {config.fileName}</p>
                {config.description && (
                  <p><strong>Descripción:</strong> {config.description}</p>
                )}
                <p><strong>Usado:</strong> {config.useCount} veces</p>
                {config.lastUsed && (
                  <p><strong>Último uso:</strong> {config.lastUsed.toLocaleDateString('es-CL')}</p>
                )}
              </div>
              
              <div className="config-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedConfig(config);
                    setShowExportModal(true);
                  }}
                >
                  📊 Usar Configuración
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="export-manager">
      <div className="section-header">
        <h2>📊 Gestor de Exportaciones</h2>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateConfigModal(true)}
            disabled={loading}
          >
            ⚙️ Nueva Configuración
          </button>
        </div>
      </div>

      {error && (
        <div className="error-messages">
          <p className="error-message">{error}</p>
        </div>
      )}

      {success && (
        <div className="success-messages">
          <p className="success-message">{success}</p>
        </div>
      )}

      {renderExportProgress()}
      {renderConfigsList()}
      {renderExportHistory()}

      {/* Modal para crear configuración */}
      {showCreateConfigModal && (
        <ReportModal
          title="⚙️ Crear Nueva Configuración"
          onClose={() => setShowCreateConfigModal(false)}
          size="large"
        >
          {renderConfigForm()}
          
          <div className="modal-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowCreateConfigModal(false)}
            >
              Cancelar
            </button>
            
            <button 
              className="btn btn-primary"
              onClick={handleCreateConfig}
              disabled={loading || !configForm.name || !configForm.fileName}
            >
              {loading ? '🔄 Creando...' : '⚙️ Crear Configuración'}
            </button>
          </div>
        </ReportModal>
      )}

      {/* Modal para exportar */}
      {selectedConfig && showExportModal && (
        <ReportModal
          title={`📊 Exportar: ${selectedConfig.name}`}
          onClose={() => setShowExportModal(false)}
        >
          <div className="export-form">
            <div className="config-preview">
              <h4>📋 Configuración Seleccionada</h4>
              <div className="config-details">
                <p><strong>Nombre:</strong> {selectedConfig.name}</p>
                <p><strong>Tipo:</strong> {getDataTypeLabel(selectedConfig.dataType)}</p>
                <p><strong>Formato:</strong> {getFormatLabel(selectedConfig.format)}</p>
                {selectedConfig.description && (
                  <p><strong>Descripción:</strong> {selectedConfig.description}</p>
                )}
              </div>
            </div>

            <div className="form-section">
              <h4>📅 Período de Datos</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Fecha desde:</label>
                  <input
                    type="date"
                    value={exportForm.startDate}
                    onChange={(e) => setExportForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="filter-select"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Fecha hasta:</label>
                  <input
                    type="date"
                    value={exportForm.endDate}
                    onChange={(e) => setExportForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="filter-select"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowExportModal(false)}
            >
              Cancelar
            </button>
            
            <button 
              className="btn btn-primary"
              onClick={handleExportData}
              disabled={exportProgress.isExporting || !exportForm.startDate || !exportForm.endDate}
            >
              {exportProgress.isExporting ? '🔄 Exportando...' : '📊 Iniciar Exportación'}
            </button>
          </div>
        </ReportModal>
      )}

      {/* Modal para detalles del historial */}
      {selectedExport && showHistoryModal && (
        <ReportModal
          title={`📋 Detalles: ${selectedExport.result.fileName}`}
          onClose={() => setShowHistoryModal(false)}
        >
          <div className="export-details">
            <div className="detail-row">
              <div className="detail-group">
                <label>Archivo:</label>
                <p>{selectedExport.result.fileName}</p>
              </div>
              <div className="detail-group">
                <label>Configuración:</label>
                <p>{selectedExport.configName}</p>
              </div>
              <div className="detail-group">
                <label>Estado:</label>
                <p>
                  <span className={`status-badge ${getStatusColor(selectedExport.status)}`}>
                    {selectedExport.status === 'completed' ? 'Completado' : 'Error'}
                  </span>
                </p>
              </div>
            </div>

            <div className="detail-row">
              <div className="detail-group">
                <label>Formato:</label>
                <p>{getFormatLabel(selectedExport.format)}</p>
              </div>
              <div className="detail-group">
                <label>Registros:</label>
                <p>{selectedExport.recordCount.toLocaleString()}</p>
              </div>
              <div className="detail-group">
                <label>Tamaño:</label>
                <p>{(selectedExport.fileSize / 1024).toFixed(1)} KB</p>
              </div>
            </div>

            <div className="detail-row">
              <div className="detail-group">
                <label>Fecha de Creación:</label>
                <p>{selectedExport.createdAt.toLocaleString('es-CL')}</p>
              </div>
              <div className="detail-group">
                <label>Tiempo de Procesamiento:</label>
                <p>{(selectedExport.result.processingTime / 1000).toFixed(1)} segundos</p>
              </div>
            </div>

            {selectedExport.result.downloadUrl && (
              <div className="detail-row">
                <div className="detail-group full-width">
                  <label>Descarga:</label>
                  <a 
                    href={selectedExport.result.downloadUrl}
                    download={selectedExport.result.fileName}
                    className="btn btn-primary"
                  >
                    📥 Descargar Archivo
                  </a>
                </div>
              </div>
            )}
          </div>
        </ReportModal>
      )}

    </div>
  );
};

export default ExportManager;