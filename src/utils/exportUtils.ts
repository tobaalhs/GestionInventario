import {
  ExportFormat,
  ExportDataType,
  ExportConfig,
  ColumnType,
  DeliveryMethod,
  ExportHistoryStatus
} from '../interfaces/ExportConfig';

/**
 * Obtener icono para formato de exportación
 */
export const getFormatIcon = (format: ExportFormat): string => {
  const icons: Record<ExportFormat, string> = {
    [ExportFormat.PDF]: '📄',
    [ExportFormat.EXCEL]: '📊',
    [ExportFormat.CSV]: '📝',
    [ExportFormat.JSON]: '🔗',
    [ExportFormat.XML]: '📋',
    [ExportFormat.ZIP]: '🗜️'
  };
  return icons[format] || '📄';
};

/**
 * Obtener icono para tipo de datos
 */
export const getDataTypeIcon = (dataType: ExportDataType): string => {
  const icons: Record<ExportDataType, string> = {
    [ExportDataType.MOVEMENT_HISTORY]: '📈',
    [ExportDataType.TRANSACTION_REPORTS]: '💼',
    [ExportDataType.SALES_REPORTS]: '💰',
    [ExportDataType.PURCHASE_REPORTS]: '🛒',
    [ExportDataType.INVENTORY_STATUS]: '📦',
    [ExportDataType.CUSTOMER_DATA]: '👥',
    [ExportDataType.SUPPLIER_DATA]: '🏭',
    [ExportDataType.USER_ACTIVITY]: '👤',
    [ExportDataType.FINANCIAL_SUMMARY]: '💹',
    [ExportDataType.CUSTOM_QUERY]: '🔍'
  };
  return icons[dataType] || '📊';
};

/**
 * Estimar tamaño de exportación
 */
export const estimateExportSize = (
  format: ExportFormat,
  columnCount: number,
  recordCount: number
): { size: number; time: number } => {
  // Bytes base por registro según formato
  const baseBytesPerRecord: Record<ExportFormat, number> = {
    [ExportFormat.PDF]: 250,
    [ExportFormat.EXCEL]: 180,
    [ExportFormat.CSV]: 60,
    [ExportFormat.JSON]: 100,
    [ExportFormat.XML]: 150,
    [ExportFormat.ZIP]: 120
  };

  // Multiplicador por columna
  const columnMultiplier = 0.8;
  
  // Calcular bytes por registro
  const bytesPerRecord = baseBytesPerRecord[format] + (columnCount * columnMultiplier);
  
  // Calcular tamaño total
  const totalSize = Math.round(recordCount * bytesPerRecord);
  
  // Estimar tiempo (registros por segundo según complejidad)
  const recordsPerSecond: Record<ExportFormat, number> = {
    [ExportFormat.PDF]: 500,    // Más lento por renderizado
    [ExportFormat.EXCEL]: 800,  // Medio por formateo
    [ExportFormat.CSV]: 2000,   // Más rápido
    [ExportFormat.JSON]: 1500,  // Rápido
    [ExportFormat.XML]: 1000,   // Medio
    [ExportFormat.ZIP]: 1200    // Medio por compresión
  };
  
  const estimatedTime = Math.max(
    Math.ceil(recordCount / recordsPerSecond[format]),
    3 // Mínimo 3 segundos
  );
  
  return {
    size: totalSize,
    time: estimatedTime
  };
};

/**
 * Obtener extensión de archivo para formato
 */
export const getFileExtension = (format: ExportFormat): string => {
  const extensions: Record<ExportFormat, string> = {
    [ExportFormat.PDF]: 'pdf',
    [ExportFormat.EXCEL]: 'xlsx',
    [ExportFormat.CSV]: 'csv',
    [ExportFormat.JSON]: 'json',
    [ExportFormat.XML]: 'xml',
    [ExportFormat.ZIP]: 'zip'
  };
  return extensions[format] || 'txt';
};

/**
 * Obtener MIME type para formato
 */
export const getMimeType = (format: ExportFormat): string => {
  const mimeTypes: Record<ExportFormat, string> = {
    [ExportFormat.PDF]: 'application/pdf',
    [ExportFormat.EXCEL]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    [ExportFormat.CSV]: 'text/csv',
    [ExportFormat.JSON]: 'application/json',
    [ExportFormat.XML]: 'application/xml',
    [ExportFormat.ZIP]: 'application/zip'
  };
  return mimeTypes[format] || 'application/octet-stream';
};

/**
 * Validar nombre de archivo
 */
export const validateFileName = (fileName: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!fileName || fileName.trim() === '') {
    errors.push('El nombre del archivo es obligatorio');
  }
  
  if (fileName.length > 100) {
    errors.push('El nombre del archivo no puede exceder 100 caracteres');
  }
  
  // Caracteres no permitidos en nombres de archivo
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(fileName)) {
    errors.push('El nombre del archivo contiene caracteres no permitidos');
  }
  
  // No puede empezar o terminar con espacios o puntos
  if (fileName.startsWith(' ') || fileName.endsWith(' ') || 
      fileName.startsWith('.') || fileName.endsWith('.')) {
    errors.push('El nombre del archivo no puede empezar o terminar con espacios o puntos');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Formatear tamaño de archivo
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const formattedSize = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  
  return `${formattedSize} ${sizes[i]}`;
};

/**
 * Formatear duración en segundos
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} seg`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}min ${remainingSeconds}seg` : `${minutes}min`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
};

/**
 * Generar nombre de archivo único
 */
export const generateUniqueFileName = (
  baseName: string,
  format: ExportFormat,
  includeTimestamp: boolean = true
): string => {
  let fileName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  if (includeTimestamp) {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '-')
      .split('T')[0] + '_' + 
      now.toTimeString().split(' ')[0].replace(/:/g, '-');
    fileName += `_${timestamp}`;
  }
  
  return `${fileName}.${getFileExtension(format)}`;
};

/**
 * Obtener configuración por defecto para formato
 */
export const getDefaultFormatSettings = (format: ExportFormat): any => {
  switch (format) {
    case ExportFormat.PDF:
      return {
        pageSize: 'A4',
        orientation: 'landscape',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        includeHeader: true,
        includeFooter: true,
        includePageNumbers: true,
        compression: true,
        quality: 'high'
      };
      
    case ExportFormat.EXCEL:
      return {
        includeHeader: true,
        includeFilters: true,
        worksheetName: 'Datos',
        freezePanes: true,
        freezeRow: 1,
        columnWidthAuto: true,
        compression: true
      };
      
    case ExportFormat.CSV:
      return {
        delimiter: ',',
        textQualifier: '"',
        encoding: 'UTF-8',
        includeHeader: true,
        dateFormat: 'DD/MM/YYYY',
        booleanFormat: 'true/false',
        escapeQuotes: true
      };
      
    case ExportFormat.JSON:
      return {
        prettyPrint: true,
        includeMetadata: true,
        dateFormat: 'iso',
        includeNulls: false,
        compression: false
      };
      
    case ExportFormat.XML:
      return {
        rootElement: 'export',
        itemElement: 'item',
        prettyPrint: true,
        encoding: 'UTF-8',
        includeMetadata: true
      };
      
    default:
      return {};
  }
};

/**
 * Validar configuración de columnas
 */
export const validateColumns = (columns: any[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!columns || columns.length === 0) {
    errors.push('Debe seleccionar al menos una columna');
  }
  
  const columnIds = new Set();
  columns.forEach((column, index) => {
    if (!column.id) {
      errors.push(`Columna ${index + 1}: ID es obligatorio`);
    } else if (columnIds.has(column.id)) {
      errors.push(`Columna ${index + 1}: ID duplicado`);
    } else {
      columnIds.add(column.id);
    }
    
    if (!column.name) {
      errors.push(`Columna ${index + 1}: Nombre es obligatorio`);
    }
    
    if (!column.header) {
      errors.push(`Columna ${index + 1}: Encabezado es obligatorio`);
    }
    
    if (!column.type) {
      errors.push(`Columna ${index + 1}: Tipo es obligatorio`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Obtener label para tipo de columna
 */
export const getColumnTypeLabel = (type: ColumnType): string => {
  const labels: Record<ColumnType, string> = {
    [ColumnType.TEXT]: 'Texto',
    [ColumnType.NUMBER]: 'Número',
    [ColumnType.CURRENCY]: 'Moneda',
    [ColumnType.DATE]: 'Fecha',
    [ColumnType.DATETIME]: 'Fecha y Hora',
    [ColumnType.BOOLEAN]: 'Booleano',
    [ColumnType.EMAIL]: 'Email',
    [ColumnType.URL]: 'URL',
    [ColumnType.PHONE]: 'Teléfono',
    [ColumnType.IMAGE]: 'Imagen',
    [ColumnType.ENUM]: 'Enumeración',
    [ColumnType.JSON]: 'JSON'
  };
  return labels[type] || type;
};

/**
 * Obtener configuraciones de entrega por defecto
 */
export const getDefaultDeliverySettings = (method: DeliveryMethod): any => {
  switch (method) {
    case DeliveryMethod.DOWNLOAD:
      return {
        enabled: true,
        autoDownload: true,
        generateLink: true,
        linkExpiresAfter: 24,
        maxDownloads: 10,
        requirePassword: false,
        notifyOnDownload: false
      };
      
    case DeliveryMethod.EMAIL:
      return {
        enabled: true,
        recipients: [],
        subject: 'Exportación de datos',
        body: 'Adjunto encontrarás la exportación solicitada.',
        attachAsFile: true,
        compressAttachment: true,
        sendNotification: true,
        priority: 'normal'
      };
      
    case DeliveryMethod.CLOUD_STORAGE:
      return {
        enabled: true,
        provider: 'aws_s3',
        folderPath: '/exports',
        makePublic: false,
        generateSharableLink: true,
        linkExpiresAfter: 72,
        notifyOnUpload: true
      };
      
    default:
      return {};
  }
};

/**
 * Generar configuración de branding por defecto
 */
export const getDefaultBrandingSettings = (): any => {
  return {
    enabled: true,
    includeLogo: false,
    logoPosition: 'header',
    logoSize: { width: 100, height: 50 },
    companyName: 'Mi Empresa',
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
    includeDisclaimer: false,
    disclaimerText: 'Este documento contiene información confidencial.'
  };
};

/**
 * Validar configuración de seguridad
 */
export const validateSecuritySettings = (security: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (security.passwordProtect && !security.password && !security.autoGeneratePassword) {
    errors.push('Debe especificar una contraseña o habilitar la generación automática');
  }
  
  if (security.password && security.password.length < 6) {
    errors.push('La contraseña debe tener al menos 6 caracteres');
  }
  
  if (security.expiresAfter && (security.expiresAfter < 1 || security.expiresAfter > 8760)) {
    errors.push('El tiempo de expiración debe estar entre 1 hora y 1 año');
  }
  
  if (security.watermark?.enabled && !security.watermark?.text) {
    errors.push('Debe especificar el texto de la marca de agua');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Calcular complejidad de exportación
 */
export const calculateExportComplexity = (config: ExportConfig, recordCount: number): 'low' | 'medium' | 'high' => {
  let complexityScore = 0;
  
  // Base por formato
  const formatComplexity: Record<ExportFormat, number> = {
    [ExportFormat.CSV]: 1,
    [ExportFormat.JSON]: 2,
    [ExportFormat.EXCEL]: 3,
    [ExportFormat.XML]: 3,
    [ExportFormat.PDF]: 4,
    [ExportFormat.ZIP]: 2
  };
  
  complexityScore += formatComplexity[config.format];
  
  // Por cantidad de registros
  if (recordCount > 10000) complexityScore += 3;
  else if (recordCount > 1000) complexityScore += 2;
  else if (recordCount > 100) complexityScore += 1;
  
  // Por cantidad de columnas
  if (config.columns.length > 20) complexityScore += 2;
  else if (config.columns.length > 10) complexityScore += 1;
  
  // Por características adicionales
  if (config.formatSettings?.pdf?.includeCharts || config.formatSettings?.excel?.includeCharts) {
    complexityScore += 2;
  }
  
  if (config.security.passwordProtect || config.security.encrypt) {
    complexityScore += 1;
  }
  
  if (config.security.watermark?.enabled) {
    complexityScore += 1;
  }
  
  if (config.delivery.method === DeliveryMethod.MULTIPLE) {
    complexityScore += 1;
  }
  
  // Determinar nivel
  if (complexityScore <= 4) return 'low';
  if (complexityScore <= 8) return 'medium';
  return 'high';
};

/**
 * Obtener recomendaciones para mejorar rendimiento
 */
export const getPerformanceRecommendations = (
  config: ExportConfig, 
  recordCount: number
): string[] => {
  const recommendations: string[] = [];
  
  if (recordCount > 10000) {
    recommendations.push('Considera dividir la exportación en múltiples archivos más pequeños');
    
    if (config.format === ExportFormat.PDF) {
      recommendations.push('Para grandes volúmenes de datos, CSV o Excel son más eficientes que PDF');
    }
  }
  
  if (config.columns.length > 20) {
    recommendations.push('Considera reducir el número de columnas para mejorar el rendimiento');
  }
  
  if (config.formatSettings?.pdf?.includeCharts && recordCount > 5000) {
    recommendations.push('Los gráficos en PDF pueden ralentizar la exportación con muchos datos');
  }
  
  if (config.security.encrypt && recordCount > 5000) {
    recommendations.push('La encriptación puede aumentar significativamente el tiempo de procesamiento');
  }
  
  if (config.delivery.method === DeliveryMethod.EMAIL && recordCount > 1000) {
    recommendations.push('Para archivos grandes, considera usar descarga directa en lugar de email');
  }
  
  return recommendations;
};

/**
 * Convertir configuración a descripción legible
 */
export const configToDescription = (config: ExportConfig): string => {
  const parts: string[] = [];
  
  parts.push(`Formato: ${getFileExtension(config.format).toUpperCase()}`);
  parts.push(`Columnas: ${config.columns.length}`);
  
  if (config.security.passwordProtect) {
    parts.push('Protegido con contraseña');
  }
  
  if (config.security.watermark?.enabled) {
    parts.push('Con marca de agua');
  }
  
  const deliveryLabels: Record<DeliveryMethod, string> = {
    [DeliveryMethod.DOWNLOAD]: 'Descarga',
    [DeliveryMethod.EMAIL]: 'Email',
    [DeliveryMethod.CLOUD_STORAGE]: 'Nube',
    [DeliveryMethod.FTP]: 'FTP',
    [DeliveryMethod.WEBHOOK]: 'Webhook',
    [DeliveryMethod.MULTIPLE]: 'Múltiple'
  };
  
  parts.push(`Entrega: ${deliveryLabels[config.delivery.method]}`);
  
  return parts.join(' | ');
};

export default {
  getFormatIcon,
  getDataTypeIcon,
  estimateExportSize,
  getFileExtension,
  getMimeType,
  validateFileName,
  formatFileSize,
  formatDuration,
  generateUniqueFileName,
  getDefaultFormatSettings,
  validateColumns,
  getColumnTypeLabel,
  getDefaultDeliverySettings,
  getDefaultBrandingSettings,
  validateSecuritySettings,
  calculateExportComplexity,
  getPerformanceRecommendations,
  configToDescription
};