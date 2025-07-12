/**
 * Interface para tokens de descarga temporal
 */
export interface DownloadToken {
  id: string;
  token: string;
  reportId: string;
  reportTitle: string;
  format: 'excel' | 'pdf';
  createdAt: Date;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  createdByEmail: string;
  downloadCount: number;
  maxDownloads: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Configuración para generar tokens de descarga
 */
export interface TokenGenerationConfig {
  reportId: string;
  format: 'excel' | 'pdf';
  expirationHours?: number; // Por defecto 24 horas
  maxDownloads?: number; // Por defecto ilimitado (0)
  createdByEmail: string;
}

/**
 * Resultado de validación de token
 */
export interface TokenValidationResult {
  isValid: boolean;
  token?: DownloadToken;
  error?: string;
  errorCode?: 'EXPIRED' | 'USED' | 'NOT_FOUND' | 'MAX_DOWNLOADS_EXCEEDED' | 'INVALID_FORMAT';
}

/**
 * Configuración de descarga con token
 */
export interface TokenDownloadConfig {
  token: string;
  reportId: string;
  format?: 'excel' | 'pdf';
  trackUsage?: boolean;
  ipAddress?: string;
  userAgent?: string;
}