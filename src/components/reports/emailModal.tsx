import React, { useState } from 'react';
import { TransactionReport } from '../../interfaces/Report';
import ReportModal from './ReportModal';

interface EmailModalProps {
  report: TransactionReport;
  onClose: () => void;
}

const EmailModal: React.FC<EmailModalProps> = ({ report, onClose }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email || !email.includes('@')) {
      alert('Por favor ingresa un email válido');
      return;
    }

    try {
      setSending(true);
      
      const { sendReportEmailWithDownloadLinks } = await import('../../services/emailService');
      await sendReportEmailWithDownloadLinks(report, email, name);
      
      alert('✅ Email enviado exitosamente con enlaces de descarga');
      onClose();
      
    } catch (error) {
      alert('Error enviando el email: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setSending(false);
    }
  };

  return (
    <ReportModal title="📧 Enviar Reporte por Email" onClose={onClose}>
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Email del destinatario:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ejemplo@empresa.com"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Nombre del destinatario (opcional):
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre completo"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ 
          background: '#e7f3ff', 
          padding: '15px', 
          borderRadius: '6px', 
          marginBottom: '20px',
          border: '1px solid #b3d7ff'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>📥 El email incluirá:</h4>
          <ul style={{ margin: '0', paddingLeft: '20px', color: '#004085' }}>
            <li>Resumen completo del reporte</li>
            <li><strong>Enlace directo para descargar Excel</strong></li>
            <li><strong>Enlace directo para descargar PDF</strong></li>
            <li>Estadísticas principales</li>
          </ul>
        </div>

        <div style={{ 
          background: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '6px', 
          marginBottom: '20px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>📋 Reporte a enviar:</h4>
          <p style={{ margin: '5px 0', color: '#6c757d' }}><strong>Título:</strong> {report.title}</p>
          <p style={{ margin: '5px 0', color: '#6c757d' }}><strong>Código:</strong> {report.code}</p>
          <p style={{ margin: '5px 0', color: '#6c757d' }}><strong>Transacciones:</strong> {report.summary?.totalTransactions || 0}</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            disabled={sending}
            style={{
              padding: '10px 20px',
              border: '1px solid #6c757d',
              background: 'white',
              color: '#6c757d',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSend}
            disabled={sending || !email}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: sending ? '#6c757d' : '#007bff',
              color: 'white',
              borderRadius: '4px',
              cursor: sending ? 'not-allowed' : 'pointer'
            }}
          >
            {sending ? '📧 Enviando...' : '📧 Enviar Email'}
          </button>
        </div>
      </div>
    </ReportModal>
  );
};

export default EmailModal;