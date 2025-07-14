/**
 * Configuración principal para exportación de datos
 */
export interface ExportConfig {
  id: string;
  name: string;
  description?: string;
  
  // Configuración básica
  format: ExportFormat;
  fileName: string;
  includeTimestamp: boolean;
  
  // Configuración de contenido
  dataType: ExportDataType;
  columns: ExportColumn[];
  filters: any; // Filtros específicos según el tipo de datos
  
  // Configuración de formato
  formatSettings: FormatSettings;
  
  // Configuración de seguridad
  security: ExportSecurity;
  
  // Configuración de entrega
  delivery: ExportDelivery;
  
  // Configuración corporativa
  branding: ExportBranding;
  
  // Metadatos
  createdBy: string;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
  isTemplate: boolean;
  isActive: boolean;
}

/**
 * Formatos de exportación disponibles
 */
export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
  ZIP = 'zip' // Para múltiples archivos
}

/**
 * Tipos de datos que se pueden exportar
 */
export enum ExportDataType {
  MOVEMENT_HISTORY = 'movement_history',
  TRANSACTION_REPORTS = 'transaction_reports',
  SALES_REPORTS = 'sales_reports',
  PURCHASE_REPORTS = 'purchase_reports',
  INVENTORY_STATUS = 'inventory_status',
  CUSTOMER_DATA = 'customer_data',
  SUPPLIER_DATA = 'supplier_data',
  USER_ACTIVITY = 'user_activity',
  FINANCIAL_SUMMARY = 'financial_summary',
  CUSTOM_QUERY = 'custom_query'
}

/**
 * Definición de columna para exportación
 */
export interface ExportColumn {
  id: string;
  name: string;
  header: string;
  type: ColumnType;
  width?: number; // Para Excel/PDF
  format?: string; // Formato específico (fecha, moneda, etc.)
  required: boolean;
  sortable: boolean;
  groupable: boolean;
  aggregable: boolean;
  aggregationType?: AggregationType;
  customFormatter?: string; // Nombre de función de formateo personalizada
}

/**
 * Tipos de columnas
 */
export enum ColumnType {
  TEXT = 'text',
  NUMBER = 'number',
  CURRENCY = 'currency',
  DATE = 'date',
  DATETIME = 'datetime',
  BOOLEAN = 'boolean',
  EMAIL = 'email',
  URL = 'url',
  PHONE = 'phone',
  IMAGE = 'image',
  ENUM = 'enum',
  JSON = 'json'
}

/**
 * Tipos de agregación para columnas numéricas
 */
export enum AggregationType {
  SUM = 'sum',
  AVERAGE = 'average',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  DISTINCT_COUNT = 'distinct_count'
}

/**
 * Configuración específica por formato
 */
export interface FormatSettings {
  pdf?: PDFSettings;
  excel?: ExcelSettings;
  csv?: CSVSettings;
  json?: JSONSettings;
  xml?: XMLSettings;
}

/**
 * Configuración para PDF
 */
export interface PDFSettings {
  pageSize: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  includeHeader: boolean;
  includeFooter: boolean;
  includePageNumbers: boolean;
  includeToc: boolean; // Tabla de contenidos
  includeCharts: boolean;
  chartSettings: ChartSettings;
  compression: boolean;
  quality: 'low' | 'medium' | 'high';
  bookmarks: boolean;
  allowPrint: boolean;
  allowCopy: boolean;
  allowEdit: boolean;
}

/**
 * Configuración para Excel
 */
export interface ExcelSettings {
  includeHeader: boolean;
  includeFilters: boolean;
  includePivotTable: boolean;
  includeCharts: boolean;
  chartSettings: ChartSettings;
  worksheetName: string;
  freezePanes: boolean;
  freezeRow: number;
  freezeColumn: number;
  columnWidthAuto: boolean;
  includeFormulas: boolean;
  protectWorksheet: boolean;
  worksheetPassword?: string;
  compression: boolean;
}

/**
 * Configuración para CSV
 */
export interface CSVSettings {
  delimiter: ',' | ';' | '\t' | '|';
  textQualifier: '"' | "'" | '';
  encoding: 'UTF-8' | 'ISO-8859-1' | 'Windows-1252';
  includeHeader: boolean;
  dateFormat: string;
  numberFormat: string;
  booleanFormat: 'true/false' | '1/0' | 'yes/no';
  nullValue: string;
  escapeQuotes: boolean;
}

/**
 * Configuración para JSON
 */
export interface JSONSettings {
  prettyPrint: boolean;
  includeMetadata: boolean;
  dateFormat: 'iso' | 'unix' | 'custom';
  customDateFormat?: string;
  includeNulls: boolean;
  numberPrecision?: number;
  rootElement?: string;
  compression: boolean;
}

/**
 * Configuración para XML
 */
export interface XMLSettings {
  rootElement: string;
  itemElement: string;
  includeSchema: boolean;
  prettyPrint: boolean;
  encoding: 'UTF-8' | 'ISO-8859-1';
  includeMetadata: boolean;
  dateFormat: string;
  namespaces: XMLNamespace[];
}

/**
 * Namespace XML
 */
export interface XMLNamespace {
  prefix: string;
  uri: string;
}

/**
 * Configuración de gráficos
 */
export interface ChartSettings {
  includeCharts: boolean;
  chartTypes: ChartType[];
  chartSize: {
    width: number;
    height: number;
  };
  chartColors: string[];
  showDataLabels: boolean;
  showLegend: boolean;
  showGridLines: boolean;
  title?: string;
  subtitle?: string;
}

/**
 * Tipos de gráficos disponibles
 */
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  COLUMN = 'column',
  PIE = 'pie',
  DOUGHNUT = 'doughnut',
  AREA = 'area',
  SCATTER = 'scatter',
  HISTOGRAM = 'histogram'
}

/**
 * Configuración de seguridad
 */
export interface ExportSecurity {
  requireAuthentication: boolean;
  allowedUsers: string[]; // IDs de usuarios permitidos
  allowedRoles: string[]; // Roles permitidos
  
  // Protección de archivos
  passwordProtect: boolean;
  password?: string;
  autoGeneratePassword: boolean;
  
  // Encriptación
  encrypt: boolean;
  encryptionAlgorithm: 'AES-256' | 'AES-128';
  
  // Marca de agua
  watermark: WatermarkConfig;
  
  // Auditoría
  logAccess: boolean;
  logDownloads: boolean;
  
  // Expiración
  expiresAfter: number; // horas
  deleteAfterExpiry: boolean;
  
  // Restricciones de contenido
  redactSensitiveData: boolean;
  sensitiveFields: string[];
  replacementText: string;
}

/**
 * Configuración de marca de agua
 */
export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number; // 0-1
  fontSize: number;
  color: string;
  rotation: number; // grados
  includeTimestamp: boolean;
  includeUserName: boolean;
}

/**
 * Configuración de entrega
 */
export interface ExportDelivery {
  method: DeliveryMethod;
  
  // Email
  email?: EmailDelivery;
  
  // Descarga directa
  download?: DownloadDelivery;
  
  // Cloud storage
  cloud?: CloudDelivery;
  
  // FTP
  ftp?: FTPDelivery;
  
  // Webhook
  webhook?: WebhookDelivery;
}

/**
 * Métodos de entrega
 */
export enum DeliveryMethod {
  DOWNLOAD = 'download',
  EMAIL = 'email',
  CLOUD_STORAGE = 'cloud_storage',
  FTP = 'ftp',
  WEBHOOK = 'webhook',
  MULTIPLE = 'multiple'
}

/**
 * Configuración de entrega por email
 */
export interface EmailDelivery {
  enabled: boolean;
  recipients: string[];
  ccRecipients?: string[];
  bccRecipients?: string[];
  subject: string;
  body: string;
  attachAsFile: boolean;
  compressAttachment: boolean;
  includeInlineCharts: boolean;
  sendNotification: boolean;
  customTemplate?: string;
  priority: 'low' | 'normal' | 'high';
  deliveryConfirmation: boolean;
}

/**
 * Configuración de descarga directa
 */
export interface DownloadDelivery {
  enabled: boolean;
  autoDownload: boolean;
  generateLink: boolean;
  linkExpiresAfter: number; // horas
  maxDownloads: number;
  requirePassword: boolean;
  notifyOnDownload: boolean;
}

/**
 * Configuración de almacenamiento en la nube
 */
export interface CloudDelivery {
  enabled: boolean;
  provider: 'aws_s3' | 'google_drive' | 'dropbox' | 'onedrive';
  bucketName?: string;
  folderPath: string;
  makePublic: boolean;
  generateSharableLink: boolean;
  linkExpiresAfter?: number; // horas
  notifyOnUpload: boolean;
  credentials: CloudCredentials;
}

/**
 * Credenciales de cloud storage
 */
export interface CloudCredentials {
  accessKey?: string;
  secretKey?: string;
  region?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

/**
 * Configuración FTP
 */
export interface FTPDelivery {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string;
  path: string;
  passive: boolean;
  secure: boolean; // FTPS
  notifyOnUpload: boolean;
}

/**
 * Configuración de webhook
 */
export interface WebhookDelivery {
  enabled: boolean;
  url: string;
  method: 'POST' | 'PUT';
  headers: Record<string, string>;
  includeFileData: boolean;
  includeMetadata: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
  timeoutSeconds: number;
}

/**
 * Configuración de branding corporativo
 */
export interface ExportBranding {
  enabled: boolean;
  
  // Logo
  includeLogo: boolean;
  logoUrl?: string;
  logoPosition: 'header' | 'footer' | 'watermark';
  logoSize: {
    width: number;
    height: number;
  };
  
  // Información de la empresa
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  
  // Colores corporativos
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  
  // Fuentes
  headerFont: string;
  bodyFont: string;
  footerFont: string;
  
  // Header personalizado
  customHeader?: string;
  headerHeight: number;
  
  // Footer personalizado
  customFooter?: string;
  footerHeight: number;
  includeTimestamp: boolean;
  includePageInfo: boolean;
  
  // Disclaimers
  includeDisclaimer: boolean;
  disclaimerText?: string;
  confidentialityNotice?: string;
}

/**
 * Resultado de exportación
 */
export interface ExportResult {
  id: string;
  success: boolean;
  
  // Archivo generado
  fileName: string;
  filePath: string;
  fileSize: number; // bytes
  downloadUrl?: string;
  
  // Estadísticas
  recordCount: number;
  processingTime: number; // milisegundos
  
  // Metadatos
  generatedAt: Date;
  expiresAt?: Date;
  
  // Entrega
  deliveryStatus: DeliveryStatus;
  deliveryDetails: DeliveryResult[];
  
  // Error handling
  error?: string;
  warnings: string[];
  
  // Auditoría
  exportedBy: string;
  configUsed: string; // ID de la configuración utilizada
}

/**
 * Estado de entrega
 */
export enum DeliveryStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial'
}

/**
 * Resultado de entrega por método
 */
export interface DeliveryResult {
  method: DeliveryMethod;
  success: boolean;
  details?: string;
  url?: string;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
}

/**
 * Historial de exportaciones
 */
export interface ExportHistory {
  id: string;
  configId: string;
  configName: string;
  result: ExportResult;
  createdAt: Date;
  
  // Para filtrado
  dataType: ExportDataType;
  format: ExportFormat;
  exportedBy: string;
  fileSize: number;
  recordCount: number;
  
  // Estado actual
  status: ExportHistoryStatus;
  isExpired: boolean;
  isDeleted: boolean;
}

/**
 * Estados del historial de exportación
 */
export enum ExportHistoryStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  DELETED = 'deleted',
  ARCHIVED = 'archived'
}

/**
 * Configuración de exportación programada
 */
export interface ScheduledExport {
  id: string;
  name: string;
  description?: string;
  
  // Configuración de exportación
  configId: string;
  config: ExportConfig;
  
  // Programación
  schedule: ExportSchedule;
  
  // Estado
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  
  // Metadatos
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Configuración de horario para exportaciones programadas
 */
export interface ExportSchedule {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval: number; // cada X frecuencias
  
  // Para ejecución única
  runAt?: Date;
  
  // Para ejecuciones recurrentes
  startDate: Date;
  endDate?: Date;
  
  // Para semanal
  daysOfWeek?: number[]; // 0=Domingo, 1=Lunes, etc.
  
  // Para mensual
  dayOfMonth?: number;
  lastDayOfMonth?: boolean;
  
  // Hora de ejecución
  timeOfDay: {
    hour: number; // 0-23
    minute: number; // 0-59
  };
  
  // Zona horaria
  timezone: string;
  
  // Configuración adicional
  skipWeekends: boolean;
  skipHolidays: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
}

/**
 * Estado de ejecución de exportación programada
 */
export interface ScheduledExportRun {
  id: string;
  scheduledExportId: string;
  scheduledFor: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: ExportResult;
  error?: string;
  retryCount: number;
}

/**
 * Filtros para buscar en el historial de exportaciones
 */
export interface ExportHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  dataTypes?: ExportDataType[];
  formats?: ExportFormat[];
  exportedBy?: string[];
  configIds?: string[];
  statuses?: ExportHistoryStatus[];
  minFileSize?: number;
  maxFileSize?: number;
  minRecordCount?: number;
  maxRecordCount?: number;
  searchTerm?: string;
  sortBy?: 'createdAt' | 'fileSize' | 'recordCount' | 'configName';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Resultado de búsqueda en historial
 */
export interface ExportHistorySearchResult {
  exports: ExportHistory[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
  
  // Estadísticas del período
  totalFileSize: number;
  totalRecordCount: number;
  successRate: number;
  mostUsedFormat: ExportFormat;
  mostUsedDataType: ExportDataType;
}

export default ExportConfig;