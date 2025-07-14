import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
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
  ScheduledExportRun,
  ExportHistoryStatus
} from '../interfaces/ExportConfig';
import { TransactionReport } from '../interfaces/Report';
import { MovementRecord } from '../interfaces/Movement';

/**
 * Generar nombre de archivo para exportación
 */
export const generateFileName = (
  config: ExportConfig,
  includeTimestamp: boolean = true
): string => {
  let fileName = config.fileName || 'export';
  
  // Limpiar caracteres especiales
  fileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  if (includeTimestamp) {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '-')
      .split('T')[0] + '_' + 
      now.toTimeString().split(' ')[0].replace(/:/g, '-');
    fileName += `_${timestamp}`;
  }
  
  // Agregar extensión según formato
  const extensions: Record<ExportFormat, string> = {
    [ExportFormat.PDF]: '.pdf',
    [ExportFormat.EXCEL]: '.xlsx',
    [ExportFormat.CSV]: '.csv',
    [ExportFormat.JSON]: '.json',
    [ExportFormat.XML]: '.xml',
    [ExportFormat.ZIP]: '.zip'
  };
  
  return fileName + extensions[config.format];
};

/**
 * Validar configuración de exportación
 */
export const validateExportConfig = (config: ExportConfig): { 
  isValid: boolean; 
  errors: string[]; 
  warnings: string[] 
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validaciones básicas
  if (!config.name || config.name.trim() === '') {
    errors.push('El nombre de la configuración es obligatorio');
  }

  if (!config.fileName || config.fileName.trim() === '') {
    errors.push('El nombre del archivo es obligatorio');
  }

  if (config.columns.length === 0) {
    errors.push('Debe seleccionar al menos una columna para exportar');
  }

  // Validaciones específicas por formato
  switch (config.format) {
    case ExportFormat.PDF:
      if (config.formatSettings.pdf) {
        const pdfSettings = config.formatSettings.pdf;
        if (pdfSettings.margins) {
          const { top, right, bottom, left } = pdfSettings.margins;
          if (top < 0 || right < 0 || bottom < 0 || left < 0) {
            errors.push('Los márgenes del PDF no pueden ser negativos');
          }
          if (top + bottom >= 100 || left + right >= 100) {
            warnings.push('Los márgenes del PDF son muy grandes');
          }
        }
      }
      break;

    case ExportFormat.EXCEL:
      if (config.formatSettings.excel) {
        const excelSettings = config.formatSettings.excel;
        if (excelSettings.worksheetName && excelSettings.worksheetName.length > 31) {
          errors.push('El nombre de la hoja de Excel no puede exceder 31 caracteres');
        }
        if (excelSettings.freezeRow && excelSettings.freezeRow < 1) {
          errors.push('La fila de congelación debe ser mayor a 0');
        }
        if (excelSettings.freezeColumn && excelSettings.freezeColumn < 1) {
          errors.push('La columna de congelación debe ser mayor a 0');
        }
      }
      break;

    case ExportFormat.CSV:
      if (config.formatSettings.csv) {
        const csvSettings = config.formatSettings.csv;
        if (!csvSettings.delimiter) {
          errors.push('Debe especificar un delimitador para CSV');
        }
        if (!csvSettings.encoding) {
          errors.push('Debe especificar la codificación para CSV');
        }
      }
      break;
  }

  // Validaciones de seguridad
  if (config.security.passwordProtect && !config.security.password && !config.security.autoGeneratePassword) {
    errors.push('Debe especificar una contraseña o habilitar la generación automática');
  }

  if (config.security.password && config.security.password.length < 6) {
    warnings.push('Se recomienda usar contraseñas de al menos 6 caracteres');
  }

  if (config.security.expiresAfter && config.security.expiresAfter < 1) {
    errors.push('El tiempo de expiración debe ser mayor a 0 horas');
  }

  if (config.security.expiresAfter && config.security.expiresAfter > 8760) { // 1 año
    warnings.push('El tiempo de expiración es muy largo (más de 1 año)');
  }

  // Validaciones de entrega
  if (config.delivery.method === DeliveryMethod.EMAIL) {
    if (!config.delivery.email?.recipients || config.delivery.email.recipients.length === 0) {
      errors.push('Debe especificar al menos un destinatario para entrega por email');
    }

    if (config.delivery.email?.recipients) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      config.delivery.email.recipients.forEach((email, index) => {
        if (!emailRegex.test(email)) {
          errors.push(`Email inválido en destinatario ${index + 1}: ${email}`);
        }
      });
    }
  }

  if (config.delivery.method === DeliveryMethod.CLOUD_STORAGE) {
    if (!config.delivery.cloud?.provider) {
      errors.push('Debe especificar un proveedor de almacenamiento en la nube');
    }
    if (!config.delivery.cloud?.folderPath) {
      errors.push('Debe especificar la ruta de la carpeta en la nube');
    }
  }

  if (config.delivery.method === DeliveryMethod.FTP) {
    if (!config.delivery.ftp?.host) {
      errors.push('Debe especificar el host FTP');
    }
    if (!config.delivery.ftp?.username) {
      errors.push('Debe especificar el usuario FTP');
    }
    if (!config.delivery.ftp?.password) {
      errors.push('Debe especificar la contraseña FTP');
    }
  }

  if (config.delivery.method === DeliveryMethod.WEBHOOK) {
    if (!config.delivery.webhook?.url) {
      errors.push('Debe especificar la URL del webhook');
    }
    try {
      if (config.delivery.webhook?.url) {
        new URL(config.delivery.webhook.url);
      }
    } catch {
      errors.push('La URL del webhook no es válida');
    }
  }

  // Validaciones de columnas
  config.columns.forEach((column, index) => {
    if (!column.id || column.id.trim() === '') {
      errors.push(`Columna ${index + 1}: El ID es obligatorio`);
    }
    if (!column.name || column.name.trim() === '') {
      errors.push(`Columna ${index + 1}: El nombre es obligatorio`);
    }
    if (!column.header || column.header.trim() === '') {
      errors.push(`Columna ${index + 1}: El encabezado es obligatorio`);
    }
    if (column.width && column.width <= 0) {
      errors.push(`Columna ${index + 1}: El ancho debe ser mayor a 0`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Procesar exportación de datos
 */
export const processExport = async (
  config: ExportConfig,
  data: any[],
  userId: string,
  userEmail: string
): Promise<ExportResult> => {
  try {
    console.log('📤 Iniciando proceso de exportación...');
    
    const startTime = Date.now();
    
    // Validar configuración
    const validation = validateExportConfig(config);
    if (!validation.isValid) {
      throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
    }

    // Generar nombre de archivo
    const fileName = generateFileName(config, config.includeTimestamp);
    
    // Aplicar filtros a los datos si existen
    let filteredData = data;
    if (config.filters) {
      filteredData = applyFilters(data, config.filters);
    }

    // Procesar según el formato
    let fileContent: any;
    let fileSize: number = 0;
    
    switch (config.format) {
      case ExportFormat.PDF:
        fileContent = await generatePDF(filteredData, config);
        break;
      case ExportFormat.EXCEL:
        fileContent = await generateExcel(filteredData, config);
        break;
      case ExportFormat.CSV:
        fileContent = generateCSV(filteredData, config);
        break;
      case ExportFormat.JSON:
        fileContent = generateJSON(filteredData, config);
        break;
      case ExportFormat.XML:
        fileContent = generateXML(filteredData, config);
        break;
      case ExportFormat.ZIP:
        fileContent = await generateZIP(filteredData, config);
        break;
      default:
        throw new Error(`Formato no soportado: ${config.format}`);
    }

    // Calcular tamaño del archivo
    if (typeof fileContent === 'string') {
      fileSize = new Blob([fileContent]).size;
    } else if (fileContent instanceof Uint8Array) {
      fileSize = fileContent.length;
    }

    // Aplicar seguridad si es necesario
    if (config.security.passwordProtect) {
      fileContent = await applyPasswordProtection(fileContent, config.security);
    }

    if (config.security.encrypt) {
      fileContent = await encryptFile(fileContent, config.security);
    }

    // Aplicar marca de agua si está habilitada
    if (config.security.watermark.enabled) {
      fileContent = await applyWatermark(fileContent, config.security.watermark, userEmail);
    }

    // Generar URL de descarga (simulado)
    const downloadUrl = await generateDownloadUrl(fileName, fileContent);

    // Procesar entrega
    const deliveryResults = await processDelivery(config.delivery, fileName, fileContent, config);

    const processingTime = Date.now() - startTime;

    // Crear resultado
    const result: ExportResult = {
      id: generateExportId(),
      success: true,
      fileName,
      filePath: `/exports/${fileName}`,
      fileSize,
      downloadUrl,
      recordCount: filteredData.length,
      processingTime,
      generatedAt: new Date(),
      expiresAt: config.security.expiresAfter ? 
        new Date(Date.now() + config.security.expiresAfter * 60 * 60 * 1000) : 
        undefined,
      deliveryStatus: getOverallDeliveryStatus(deliveryResults),
      deliveryDetails: deliveryResults,
      warnings: validation.warnings,
      exportedBy: userEmail,
      configUsed: config.id
    };

    // Guardar en historial
    await saveToHistory(result, config, userId);

    console.log('✅ Exportación completada exitosamente');
    return result;

  } catch (error) {
    console.error('❌ Error en proceso de exportación:', error);
    
    const result: ExportResult = {
      id: generateExportId(),
      success: false,
      fileName: generateFileName(config),
      filePath: '',
      fileSize: 0,
      recordCount: data.length,
      processingTime: Date.now(),
      generatedAt: new Date(),
      deliveryStatus: DeliveryStatus.FAILED,
      deliveryDetails: [],
      error: error instanceof Error ? error.message : 'Error desconocido',
      warnings: [],
      exportedBy: userEmail,
      configUsed: config.id
    };

    return result;
  }
};

/**
 * Aplicar filtros a los datos
 */
const applyFilters = (data: any[], filters: any): any[] => {

  return data;
};

/**
 * Generar archivo PDF
 */
const generatePDF = async (data: any[], config: ExportConfig): Promise<Uint8Array> => {

  console.log('Generando PDF...');
  
  const pdfContent = `
    PDF Export Report
    Generated: ${new Date().toLocaleDateString()}
    Records: ${data.length}
    
    ${data.map((item, index) => `${index + 1}. ${JSON.stringify(item)}`).join('\n')}
  `;
  
  return new TextEncoder().encode(pdfContent);
};

/**
 * Generar archivo Excel
 */
const generateExcel = async (data: any[], config: ExportConfig): Promise<Uint8Array> => {

  console.log('📊 Generando Excel...');
  
  const excelContent = `
    Excel Export Report
    Generated: ${new Date().toLocaleDateString()}
    Records: ${data.length}
    
    ${config.columns.map(col => col.header).join('\t')}
    ${data.map(item => 
      config.columns.map(col => item[col.id] || '').join('\t')
    ).join('\n')}
  `;
  
  return new TextEncoder().encode(excelContent);
};

/**
 * Generar archivo CSV
 */
const generateCSV = (data: any[], config: ExportConfig): string => {
  console.log('📝 Generando CSV...');
  
  const csvSettings = config.formatSettings.csv;
  const delimiter = csvSettings?.delimiter || ',';
  const textQualifier = csvSettings?.textQualifier || '"';
  const includeHeader = csvSettings?.includeHeader !== false;
  
  let csv = '';
  
  // Agregar encabezados si está habilitado
  if (includeHeader) {
    const headers = config.columns.map(col => 
      `${textQualifier}${col.header}${textQualifier}`
    ).join(delimiter);
    csv += headers + '\n';
  }
  
  // Agregar datos
  data.forEach(item => {
    const row = config.columns.map(col => {
      const value = item[col.id] || '';
      const formattedValue = formatValueForCSV(value, col.type, csvSettings);
      return `${textQualifier}${formattedValue}${textQualifier}`;
    }).join(delimiter);
    csv += row + '\n';
  });
  
  return csv;
};

/**
 * Generar archivo JSON
 */
const generateJSON = (data: any[], config: ExportConfig): string => {
  console.log('🔗 Generando JSON...');
  
  const jsonSettings = config.formatSettings.json;
  
  // Filtrar columnas
  const filteredData = data.map(item => {
    const filteredItem: any = {};
    config.columns.forEach(col => {
      if (item.hasOwnProperty(col.id)) {
        filteredItem[col.id] = formatValueForJSON(item[col.id], col.type, jsonSettings);
      }
    });
    return filteredItem;
  });
  
  const jsonObject = {
    metadata: {
      generatedAt: new Date().toISOString(),
      recordCount: filteredData.length,
      exportConfig: config.name
    },
    data: filteredData
  };
  
  return jsonSettings?.prettyPrint ? 
    JSON.stringify(jsonObject, null, 2) : 
    JSON.stringify(jsonObject);
};

/**
 * Generar archivo XML
 */
const generateXML = (data: any[], config: ExportConfig): string => {
  console.log('📋 Generando XML...');
  
  const xmlSettings = config.formatSettings.xml;
  const rootElement = xmlSettings?.rootElement || 'export';
  const itemElement = xmlSettings?.itemElement || 'item';
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<${rootElement}>\n`;
  xml += `  <metadata>\n`;
  xml += `    <generatedAt>${new Date().toISOString()}</generatedAt>\n`;
  xml += `    <recordCount>${data.length}</recordCount>\n`;
  xml += `  </metadata>\n`;
  xml += `  <data>\n`;
  
  data.forEach((item, index) => {
    xml += `    <${itemElement} id="${index + 1}">\n`;
    config.columns.forEach(col => {
      const value = item[col.id] || '';
      const formattedValue = formatValueForXML(value, col.type);
      xml += `      <${col.id}>${formattedValue}</${col.id}>\n`;
    });
    xml += `    </${itemElement}>\n`;
  });
  
  xml += `  </data>\n`;
  xml += `</${rootElement}>`;
  
  return xml;
};

/**
 * Generar archivo ZIP
 */
const generateZIP = async (data: any[], config: ExportConfig): Promise<Uint8Array> => {

  console.log('🗜️ Generando ZIP...');
  
  const zipContent = `
    ZIP Archive Contents:
    - data.json (${data.length} records)
    - metadata.txt
    - export_config.json
  `;
  
  return new TextEncoder().encode(zipContent);
};

/**
 * Formatear valor para CSV
 */
const formatValueForCSV = (value: any, type: string, settings: any): string => {
  if (value === null || value === undefined) {
    return settings?.nullValue || '';
  }
  
  if (typeof value === 'string') {
    return settings?.escapeQuotes ? 
      value.replace(/"/g, '""') : 
      value;
  }
  
  if (value instanceof Date) {
    return settings?.dateFormat ? 
      formatDate(value, settings.dateFormat) : 
      value.toISOString();
  }
  
  if (typeof value === 'boolean') {
    const format = settings?.booleanFormat || 'true/false';
    switch (format) {
      case '1/0': return value ? '1' : '0';
      case 'yes/no': return value ? 'yes' : 'no';
      default: return value ? 'true' : 'false';
    }
  }
  
  return String(value);
};

/**
 * Formatear valor para JSON
 */
const formatValueForJSON = (value: any, type: string, settings: any): any => {
  if (value === null || value === undefined) {
    return settings?.includeNulls ? null : undefined;
  }
  
  if (value instanceof Date) {
    const format = settings?.dateFormat || 'iso';
    switch (format) {
      case 'unix': return Math.floor(value.getTime() / 1000);
      case 'custom': return settings.customDateFormat ? 
        formatDate(value, settings.customDateFormat) : 
        value.toISOString();
      default: return value.toISOString();
    }
  }
  
  if (typeof value === 'number' && settings?.numberPrecision) {
    return Number(value.toFixed(settings.numberPrecision));
  }
  
  return value;
};

/**
 * Formatear valor para XML
 */
const formatValueForXML = (value: any, type: string): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string') {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  return String(value);
};

/**
 * Formatear fecha
 */
const formatDate = (date: Date, format: string): string => {
  // Implementación básica de formateo de fechas
  // En una implementación real usarías librerías como date-fns o moment.js
  switch (format) {
    case 'YYYY-MM-DD':
      return date.toISOString().split('T')[0];
    case 'DD/MM/YYYY':
      return date.toLocaleDateString('es-CL');
    default:
      return date.toISOString();
  }
};

/**
 * Aplicar protección con contraseña
 */
const applyPasswordProtection = async (content: any, security: any): Promise<any> => {
  // Implementación simulada
  console.log('🔒 Aplicando protección con contraseña...');
  return content;
};

/**
 * Encriptar archivo
 */
const encryptFile = async (content: any, security: any): Promise<any> => {
  // Implementación simulada
  console.log('🔐 Encriptando archivo...');
  return content;
};

/**
 * Aplicar marca de agua
 */
const applyWatermark = async (content: any, watermark: any, userEmail: string): Promise<any> => {
  // Implementación simulada
  console.log('💧 Aplicando marca de agua...');
  return content;
};

/**
 * Generar URL de descarga
 */
const generateDownloadUrl = async (fileName: string, content: any): Promise<string> => {

  return `https://storage.example.com/exports/${fileName}`;
};

/**
 * Procesar entrega del archivo
 */
const processDelivery = async (
  delivery: any, 
  fileName: string, 
  content: any, 
  config: ExportConfig
): Promise<any[]> => {
  const results: any[] = [];
  
  if (delivery.method === DeliveryMethod.DOWNLOAD || delivery.method === DeliveryMethod.MULTIPLE) {
    results.push({
      method: DeliveryMethod.DOWNLOAD,
      success: true,
      details: 'Archivo preparado para descarga',
      url: await generateDownloadUrl(fileName, content),
      deliveredAt: new Date()
    });
  }
  
  if (delivery.method === DeliveryMethod.EMAIL || delivery.method === DeliveryMethod.MULTIPLE) {
    try {
      await sendEmail(delivery.email, fileName, content);
      results.push({
        method: DeliveryMethod.EMAIL,
        success: true,
        details: `Email enviado a ${delivery.email?.recipients.length} destinatarios`,
        deliveredAt: new Date()
      });
    } catch (error) {
      results.push({
        method: DeliveryMethod.EMAIL,
        success: false,
        error: error instanceof Error ? error.message : 'Error enviando email',
        deliveredAt: new Date()
      });
    }
  }
  
  return results;
};

/**
 * Enviar email con archivo adjunto
 */
const sendEmail = async (emailConfig: any, fileName: string, content: any): Promise<void> => {
  // Implementación simulada
  console.log('📧 Enviando email...');
  // Aquí implementarías el envío real de email usando un servicio como SendGrid, AWS SES, etc.
};

/**
 * Obtener estado general de entrega
 */
const getOverallDeliveryStatus = (results: any[]): DeliveryStatus => {
  if (results.length === 0) return DeliveryStatus.FAILED;
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  if (successful === total) return DeliveryStatus.COMPLETED;
  if (successful === 0) return DeliveryStatus.FAILED;
  return DeliveryStatus.PARTIAL;
};

/**
 * Generar ID de exportación
 */
const generateExportId = (): string => {
  return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Guardar en historial
 */
const saveToHistory = async (
  result: ExportResult, 
  config: ExportConfig, 
  userId: string
): Promise<void> => {
  try {
    const historyEntry: Omit<ExportHistory, 'id'> = {
      configId: config.id,
      configName: config.name,
      result,
      createdAt: new Date(),
      dataType: config.dataType,
      format: config.format,
      exportedBy: userId,
      fileSize: result.fileSize,
      recordCount: result.recordCount,
      status: result.success ? ExportHistoryStatus.COMPLETED : ExportHistoryStatus.FAILED,
      isExpired: false,
      isDeleted: false
    };

    await addDoc(collection(db, 'exportHistory'), {
      ...historyEntry,
      createdAt: Timestamp.fromDate(historyEntry.createdAt),
      result: {
        ...historyEntry.result,
        generatedAt: Timestamp.fromDate(historyEntry.result.generatedAt),
        expiresAt: historyEntry.result.expiresAt ? 
          Timestamp.fromDate(historyEntry.result.expiresAt) : null
      }
    });

    console.log('✅ Entrada guardada en historial de exportaciones');
  } catch (error) {
    console.error('❌ Error guardando en historial:', error);
  }
};

/**
 * Crear configuración de exportación
 */
export const createExportConfig = async (config: Omit<ExportConfig, 'id' | 'createdAt' | 'lastUsed' | 'useCount'>): Promise<string> => {
  try {
    const validation = validateExportConfig(config as ExportConfig);
    if (!validation.isValid) {
      throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
    }

    const docRef = await addDoc(collection(db, 'exportConfigs'), {
      ...config,
      createdAt: Timestamp.now(),
      useCount: 0,
      isActive: true
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creando configuración de exportación:', error);
    throw error;
  }
};

/**
 * Obtener configuraciones de exportación
 */
export const getExportConfigs = async (dataType?: ExportDataType): Promise<ExportConfig[]> => {
  try {
    let q = collection(db, 'exportConfigs');
    let queryConstraints: any[] = [where('isActive', '==', true)];

    if (dataType) {
      queryConstraints.push(where('dataType', '==', dataType));
    }

    queryConstraints.push(orderBy('lastUsed', 'desc'));

    const finalQuery = query(q, ...queryConstraints);
    const querySnapshot = await getDocs(finalQuery);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        lastUsed: data.lastUsed?.toDate()
      } as ExportConfig;
    });
  } catch (error) {
    console.error('Error obteniendo configuraciones:', error);
    throw error;
  }
};

/**
 * Buscar en historial de exportaciones
 */
export const searchExportHistory = async (filters: ExportHistoryFilters): Promise<ExportHistorySearchResult> => {
  try {
    let q = collection(db, 'exportHistory');
    let queryConstraints: any[] = [];

    // Aplicar filtros
    if (filters.startDate) {
      queryConstraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.startDate)));
    }

    if (filters.endDate) {
      queryConstraints.push(where('createdAt', '<=', Timestamp.fromDate(filters.endDate)));
    }

    if (filters.dataTypes && filters.dataTypes.length > 0) {
      queryConstraints.push(where('dataType', 'in', filters.dataTypes));
    }

    if (filters.formats && filters.formats.length > 0) {
      queryConstraints.push(where('format', 'in', filters.formats));
    }

    if (filters.exportedBy && filters.exportedBy.length > 0) {
      queryConstraints.push(where('exportedBy', 'in', filters.exportedBy));
    }

    if (filters.statuses && filters.statuses.length > 0) {
      queryConstraints.push(where('status', 'in', filters.statuses));
    }

    // Ordenamiento
    const sortField = filters.sortBy || 'createdAt';
    const sortDirection = filters.sortOrder || 'desc';
    queryConstraints.push(orderBy(sortField, sortDirection));

    // Paginación
    const pageSize = filters.pageSize || 20;
    queryConstraints.push(limit(pageSize));

    const finalQuery = query(q, ...queryConstraints);
    const querySnapshot = await getDocs(finalQuery);
    
    const exports: ExportHistory[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        result: {
          ...data.result,
          generatedAt: data.result.generatedAt.toDate(),
          expiresAt: data.result.expiresAt?.toDate()
        }
      } as ExportHistory;
    });

    // Aplicar filtros adicionales
    let filteredExports = exports;

    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filteredExports = exports.filter(exp => 
        exp.configName.toLowerCase().includes(searchTerm) ||
        exp.result.fileName.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.minFileSize) {
      filteredExports = filteredExports.filter(exp => exp.fileSize >= filters.minFileSize!);
    }

    if (filters.maxFileSize) {
      filteredExports = filteredExports.filter(exp => exp.fileSize <= filters.maxFileSize!);
    }

    if (filters.minRecordCount) {
      filteredExports = filteredExports.filter(exp => exp.recordCount >= filters.minRecordCount!);
    }

    if (filters.maxRecordCount) {
      filteredExports = filteredExports.filter(exp => exp.recordCount <= filters.maxRecordCount!);
    }

    // Calcular estadísticas
    const totalFileSize = filteredExports.reduce((sum, exp) => sum + exp.fileSize, 0);
    const totalRecordCount = filteredExports.reduce((sum, exp) => sum + exp.recordCount, 0);
    const successfulExports = filteredExports.filter(exp => exp.status === ExportHistoryStatus.COMPLETED).length;
    const successRate = filteredExports.length > 0 ? (successfulExports / filteredExports.length) * 100 : 0;

    // Encontrar formatos y tipos más usados
    const formatCounts = new Map<ExportFormat, number>();
    const dataTypeCounts = new Map<ExportDataType, number>();

    filteredExports.forEach(exp => {
      formatCounts.set(exp.format, (formatCounts.get(exp.format) || 0) + 1);
      dataTypeCounts.set(exp.dataType, (dataTypeCounts.get(exp.dataType) || 0) + 1);
    });

    const mostUsedFormat = Array.from(formatCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || ExportFormat.PDF;

    const mostUsedDataType = Array.from(dataTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || ExportDataType.TRANSACTION_REPORTS;

    // Paginación
    const totalCount = filteredExports.length;
    const currentPage = filters.page || 1;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNext = currentPage < totalPages;
    const hasPrevious = currentPage > 1;

    return {
      exports: filteredExports,
      totalCount,
      totalPages,
      currentPage,
      pageSize,
      hasNext,
      hasPrevious,
      totalFileSize,
      totalRecordCount,
      successRate,
      mostUsedFormat,
      mostUsedDataType
    };

  } catch (error) {
    console.error('Error buscando historial de exportaciones:', error);
    throw error;
  }
};