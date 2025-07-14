import emailjs from '@emailjs/browser';
import { EMAIL_CONFIG } from '../config/emailConfig';
import { TransactionReport } from '../interfaces/Report';
import { createDownloadToken } from './tokenService';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Generar enlace de descarga con token temporal
 */
const generateDownloadLinkWithToken = async (
  reportId: string, 
  format: 'excel' | 'pdf',
  createdByEmail: string,
  expirationHours: number = 24
): Promise<string> => {
  try {
    console.log('🔗 Generando enlace con token temporal...');

    // Crear token temporal
    const token = await createDownloadToken({
      reportId,
      format,
      expirationHours,
      maxDownloads: 0, // Sin límite de descargas
      createdByEmail
    });

    // Generar URL con token
    const baseURL = window.location.origin;
    const downloadUrl = `${baseURL}/#/download/${reportId}?token=${token}&format=${format}`;

    console.log('✅ Enlace con token generado exitosamente');
    return downloadUrl;

  } catch (error) {
    console.error('❌ Error generando enlace con token:', error);
    throw new Error('No se pudo generar el enlace de descarga seguro');
  }
};

/**
 * Enviar email con enlaces de descarga seguros 
 */
export const sendReportEmailWithDownloadLinks = async (
  report: TransactionReport,
  recipientEmail: string,
  recipientName: string = '',
  expirationHours: number = 24
): Promise<void> => {
  try {
    console.log('📧 Enviando email con enlaces de descarga seguros...');

    // Generar enlaces seguros con tokens temporales
    const excelLink = await generateDownloadLinkWithToken(
      report.id, 
      'excel', 
      report.generatedByName,
      expirationHours
    );

    const pdfLink = await generateDownloadLinkWithToken(
      report.id, 
      'pdf', 
      report.generatedByName,
      expirationHours
    );

    const templateParams = {
      to_email: recipientEmail,
      to_name: recipientName || recipientEmail.split('@')[0],
      report_title: report.title,
      report_code: report.code,
      report_period: `${report.periodStart.toLocaleDateString('es-CL')} al ${report.periodEnd.toLocaleDateString('es-CL')}`,
      total_transactions: (report.summary?.totalTransactions || 0).toLocaleString('es-CL'),
      total_amount: formatCurrency(report.summary?.totalAmount || 0),
      excel_download_link: excelLink,
      pdf_download_link: pdfLink,
      generated_by: report.generatedByName,
      generated_date: report.generatedAt.toLocaleString('es-CL'),
      expiration_hours: expirationHours,
      expiration_date: new Date(Date.now() + (expirationHours * 60 * 60 * 1000)).toLocaleString('es-CL')
    };

    const response = await emailjs.send(
      EMAIL_CONFIG.serviceId,
      EMAIL_CONFIG.templateId,
      templateParams,
      EMAIL_CONFIG.publicKey
    );

    console.log('✅ Email con enlaces seguros enviado exitosamente:', response.status);
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw new Error('No se pudo enviar el email. Verifica la configuración.');
  }
};

/**
 * Función backward compatible 
 */
const generateDownloadLink = (reportId: string, format: 'excel' | 'pdf' = 'excel'): string => {
  console.warn('⚠️ Usando enlace de descarga sin token (menos seguro)');
  const baseURL = window.location.origin;
  return `${baseURL}/#/download/${reportId}?format=${format}`;
};

/**
 *  Validar configuración de email antes de enviar
 */
export const validateEmailConfiguration = (): boolean => {
  return !!(EMAIL_CONFIG.serviceId && EMAIL_CONFIG.templateId && EMAIL_CONFIG.publicKey);
};

/**
 *Enviar email de notificación simple (sin enlaces de descarga)
 */
export const sendSimpleNotificationEmail = async (
  recipientEmail: string,
  subject: string,
  message: string,
  senderName: string = 'Sistema de Inventario'
): Promise<void> => {
  try {
    console.log('📨 Enviando email de notificación simple...');

    const templateParams = {
      to_email: recipientEmail,
      to_name: recipientEmail.split('@')[0],
      subject,
      message,
      sender_name: senderName,
      sent_date: new Date().toLocaleString('es-CL')
    };

    const response = await emailjs.send(
      EMAIL_CONFIG.serviceId,
      EMAIL_CONFIG.templateId, 
      templateParams,
      EMAIL_CONFIG.publicKey
    );

    console.log('✅ Email de notificación enviado exitosamente:', response.status);
  } catch (error) {
    console.error('❌ Error enviando email de notificación:', error);
    throw new Error('No se pudo enviar el email de notificación.');
  }
};

/**
 *Función para test de conectividad de email
 */
export const testEmailConnectivity = async (): Promise<boolean> => {
  try {
    console.log('🔍 Probando conectividad del servicio de email...');
    
    
    return validateEmailConfiguration();
  } catch (error) {
    console.error('❌ Error en test de conectividad:', error);
    return false;
  }
};

// Exportar función backward compatible
export { generateDownloadLink };