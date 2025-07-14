import React, { useEffect } from 'react';
import './ReportModal.css';

interface ReportModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  showCloseButton?: boolean;
  downloadOptions?: {
    onDownloadPDF?: () => Promise<void>;
    onDownloadExcel?: () => Promise<void>;
  };
}

const ReportModal: React.FC<ReportModalProps> = ({
  title,
  onClose,
  children,
  size = 'medium',
  showCloseButton = true,
  downloadOptions
}) => {
  // Cerrar modal con ESC
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'modal-small';
      case 'medium': return 'modal-medium';
      case 'large': return 'modal-large';
      case 'xlarge': return 'modal-xlarge';
      default: return 'modal-medium';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-container ${getSizeClass()}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          {showCloseButton && (
            <button 
              className="modal-close-btn"
              onClick={onClose}
              type="button"
              aria-label="Cerrar modal"
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="modal-body">
          {children}
        </div>

        {downloadOptions && (
          <div className="modal-actions">
            <button 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            {downloadOptions.onDownloadPDF && (
              <button 
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    await downloadOptions.onDownloadPDF?.();
                  } finally {
                    onClose();
                  }
                }}
              >
                Descargar PDF
              </button>
            )}
            {downloadOptions.onDownloadExcel && (
              <button 
                className="btn btn-success"
                onClick={async () => {
                  try {
                    await downloadOptions.onDownloadExcel?.();
                  } finally {
                    onClose();
                  }
                }}
              >
                Descargar Excel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportModal;