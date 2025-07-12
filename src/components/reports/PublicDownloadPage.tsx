import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { validateDownloadToken, markTokenAsUsed } from '../../services/tokenService';
import { getReportById } from '../../services/reportService';
import { downloadReport, downloadReportAsPDF } from '../../services/downloadService';
import { TransactionReport } from '../../interfaces/Report';
import { DownloadToken } from '../../interfaces/DownloadToken';

const PublicDownloadPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const format = (searchParams.get('format') || 'excel') as 'excel' | 'pdf';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TransactionReport | null>(null);
  const [downloadToken, setDownloadToken] = useState<DownloadToken | null>(null);
  const [downloadCompleted, setDownloadCompleted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ✅ Usar useRef para evitar ejecuciones múltiples
  const downloadInitiated = useRef(false);

  useEffect(() => {
    // ✅ Verificar que tenemos los parámetros necesarios
    if (!reportId || !token) {
      setError('Enlace de descarga inválido. Faltan parámetros requeridos.');
      setLoading(false);
      return;
    }

    // ✅ Evitar ejecución múltiple con useRef
    if (downloadInitiated.current) {
      console.log('🔄 Descarga ya iniciada, ignorando useEffect adicional...');
      return;
    }

    downloadInitiated.current = true;
    handleSecureDownload();
  }, [reportId, token]); // ✅ Dependencias necesarias para que se ejecute cuando estén disponibles

  const handleSecureDownload = async () => {
    console.log('🔒 handleSecureDownload called - Estados actuales:', {
      isDownloading,
      downloadCompleted,
      downloadInitiated: downloadInitiated.current
    });
    
    // ✅ Verificar estado antes de proceder
    if (isDownloading || downloadCompleted) {
      console.log('🔄 Descarga ya en proceso o completada, ignorando...', {
        isDownloading,
        downloadCompleted
      });
      return;
    }

    try {
      console.log('🔒 Iniciando descarga segura con token...');
      setIsDownloading(true);
      setLoading(true);
      setError(null);

      // 1️⃣ Validar token
      console.log('🔍 Validando token de descarga...');
      const tokenValidation = await validateDownloadToken(token!, reportId!, format);

      if (!tokenValidation.isValid) {
        let userFriendlyError = 'Error de autenticación de descarga.';
        
        switch (tokenValidation.errorCode) {
          case 'EXPIRED':
            userFriendlyError = 'El enlace de descarga ha expirado. Solicita un nuevo enlace al administrador.';
            break;
          case 'NOT_FOUND':
            userFriendlyError = 'El enlace de descarga no es válido o ha sido revocado.';
            break;
          case 'MAX_DOWNLOADS_EXCEEDED':
            userFriendlyError = 'Se ha excedido el límite de descargas para este enlace.';
            break;
          case 'INVALID_FORMAT':
            userFriendlyError = 'El formato solicitado no coincide con el enlace proporcionado.';
            break;
          default:
            userFriendlyError = tokenValidation.error || 'Token de descarga no válido.';
        }
        
        setError(userFriendlyError);
        setLoading(false);
        setIsDownloading(false);
        return;
      }

      setDownloadToken(tokenValidation.token!);
      console.log('✅ Token válido, procediendo con descarga...');

      // 2️⃣ Obtener datos del reporte
      console.log('📊 Cargando datos del reporte...');
      const reportData = await getReportById(reportId!);
      
      if (!reportData) {
        setError('El reporte solicitado no existe o no está disponible.');
        setLoading(false);
        setIsDownloading(false);
        return;
      }

      setReport(reportData);
      console.log('✅ Datos del reporte cargados exitosamente');

      // 3️⃣ Marcar token como usado (antes de la descarga para tracking)
      try {
        await markTokenAsUsed(tokenValidation.token!.id, {
          ipAddress: await getClientIP(),
          userAgent: navigator.userAgent
        });
        console.log('📝 Token marcado como usado');
      } catch (trackingError) {
        console.warn('⚠️ Error en tracking de token:', trackingError);
        // No detener la descarga por error de tracking
      }

      // 4️⃣ Cargar datos dinámicos para AMBOS formatos
      console.log(`📥 Preparando datos para descarga ${format.toUpperCase()}...`);
      
      let transactionData = reportData.transactionData || [];
      if (transactionData.length === 0 && reportData.filters) {
        console.log('🔄 Cargando datos de transacciones dinámicamente...');
        try {
          const { getTransactionData } = await import('../../services/reportService');
          transactionData = await getTransactionData(reportData.filters);
          console.log(`✅ ${transactionData.length} transacciones cargadas para descarga`);
        } catch (loadError) {
          console.error('❌ Error cargando datos de transacciones:', loadError);
          if (!reportData.summary || reportData.summary.totalTransactions === 0) {
            throw new Error('No se pudieron cargar los datos de transacciones para la descarga.');
          }
        }
      }

      // ✅ Preparar datos completos para ambos formatos
      const exportData = {
        reportInfo: {
          title: reportData.title,
          code: reportData.code,
          type: reportData.type,
          period: `${reportData.periodStart.toLocaleDateString('es-CL')} - ${reportData.periodEnd.toLocaleDateString('es-CL')}`,
          generatedAt: reportData.generatedAt.toLocaleString('es-CL'),
          generatedBy: reportData.generatedByName,
          downloadType: 'Token Download'
        },
        summary: reportData.summary,
        transactions: transactionData,
        statistics: reportData.statistics
      };

      // ✅ Generar y descargar archivo según formato
      console.log(`🚀 Iniciando descarga de archivo ${format.toUpperCase()}...`);
      if (format === 'pdf') {
        await downloadReportAsPDF(exportData);
      } else {
        const { downloadReportWithToken } = await import('../../services/downloadService');
        await downloadReportWithToken({
          ...reportData,
          transactionData: transactionData
        });
      }

      console.log('✅ Descarga completada, actualizando estados...');
      setDownloadCompleted(true);
      setLoading(false);
      setIsDownloading(false);
      console.log('✅ Descarga completada exitosamente');

    } catch (err) {
      console.error('❌ Error en descarga segura:', err);
      
      let userError = 'Error al generar el archivo de descarga.';
      if (err instanceof Error) {
        userError += ` Detalles: ${err.message}`;
      }
      
      setError(userError);
      setLoading(false);
      setIsDownloading(false);
    }
  };

  // ✅ Función simplificada para reintento
  const handleRetryDownload = async () => {
    if (isDownloading) {
      console.log('🔄 Descarga ya en proceso...');
      return;
    }
    
    console.log('🔄 Iniciando reintento de descarga...');
    
    // ✅ Resetear TODOS los estados para permitir nueva descarga
    setIsDownloading(false);
    setDownloadCompleted(false);
    setError(null);
    setLoading(true);
    
    // ✅ Resetear flag de descarga iniciada
    downloadInitiated.current = false;
    
    // ✅ Pequeña pausa para asegurar que los estados se actualicen
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // ✅ Marcar como iniciado y ejecutar
    downloadInitiated.current = true;
    await handleSecureDownload();
  };

  // Función auxiliar para obtener IP del cliente (simulada)
  const getClientIP = async (): Promise<string> => {
    try {
      return 'unknown'; // Placeholder
    } catch {
      return 'unknown';
    }
  };

  const formatExpirationDate = (expiresAt: Date): string => {
    const now = new Date();
    const timeLeft = expiresAt.getTime() - now.getTime();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    
    if (hoursLeft < 1) {
      const minutesLeft = Math.floor(timeLeft / (1000 * 60));
      return `${minutesLeft} minutos`;
    }
    
    return `${hoursLeft} horas`;
  };

  const pageStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f8f9fa',
    padding: '20px'
  };

  const cardStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    width: '100%'
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔄</div>
          <h2 style={{ color: '#495057', marginBottom: '10px' }}>
            {isDownloading ? 'Descargando archivo...' : 'Preparando descarga segura...'}
          </h2>
          <p style={{ color: '#6c757d', marginBottom: '20px' }}>
            {isDownloading ? 
              'Generando y descargando archivo...' : 
              'Validando credenciales y cargando datos...'
            }
          </p>
          <div style={{ 
            width: '80%', 
            height: '6px', 
            backgroundColor: '#e9ecef', 
            borderRadius: '3px', 
            margin: '20px auto',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{ 
              width: '40%', 
              height: '100%', 
              backgroundColor: '#28a745',
              position: 'absolute',
              animation: 'loading 2s ease-in-out infinite'
            }}></div>
          </div>
          {token && (
            <p style={{ fontSize: '12px', color: '#aaa', marginTop: '15px' }}>
              Token: {token.substring(0, 8)}...
            </p>
          )}
        </div>
        
        <style>{`
          @keyframes loading {
            0% { left: -40%; }
            50% { left: 50%; }
            100% { left: 100%; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <h2 style={{ color: '#dc3545', marginBottom: '15px' }}>Error de Descarga</h2>
          <div style={{ 
            backgroundColor: '#f8d7da', 
            border: '1px solid #f5c6cb', 
            color: '#721c24',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            {error}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={handleRetryDownload}
              disabled={isDownloading}
              style={{
                padding: '12px 24px',
                backgroundColor: isDownloading ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isDownloading ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                opacity: isDownloading ? 0.6 : 1
              }}
            >
              🔄 Reintentar
            </button>
            <button 
              onClick={() => window.close()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (downloadCompleted && report && downloadToken) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ color: '#28a745', marginBottom: '15px' }}>¡Descarga Completada!</h2>
          
          <div style={{ 
            backgroundColor: '#d4edda', 
            border: '1px solid #c3e6cb', 
            color: '#155724',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '25px',
            textAlign: 'left'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>📊 {report.title}</h4>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Código:</strong> {report.code}
            </p>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Formato:</strong> {format.toUpperCase()}
            </p>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Período:</strong> {report.periodStart.toLocaleDateString('es-CL')} - {report.periodEnd.toLocaleDateString('es-CL')}
            </p>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Descargas restantes:</strong> {downloadToken.maxDownloads > 0 ? 
                Math.max(0, downloadToken.maxDownloads - downloadToken.downloadCount - 1) : 
                'Ilimitadas'
              }
            </p>
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Enlace expira en:</strong> {formatExpirationDate(downloadToken.expiresAt)}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => window.close()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Cerrar Ventana
            </button>
          </div>

          <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
            <p>🔒 Descarga segura verificada por token temporal</p>
          </div>
        </div>
      </div>
    );
  }

  // Estado por defecto (no debería llegar aquí)
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <h2 style={{ color: '#495057', marginBottom: '10px' }}>Procesando...</h2>
        <p style={{ color: '#6c757d' }}>Preparando tu descarga...</p>
      </div>
    </div>
  );
};

export default PublicDownloadPage;