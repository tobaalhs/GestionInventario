import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useReports } from '../../hooks/useReports';
import EmailModal from './emailModal';
import {
  TransactionReport,
  ReportType,
  ReportStatus,
  TransactionFilters,
  ReportGenerationRequest
} from '../../interfaces/Report';
import ReportModal from './ReportModal';

interface TransactionReportsProps {}

const TransactionReports: React.FC<TransactionReportsProps> = () => {
  const { currentUser } = useAuth();
  const {
    reports,
    recentReports,
    loading,
    generating,
    error,
    generationStatus,
    generateReport,
    loadReports,
    loadRecentReports,
    validateFilters,
    previewReportData,
    estimateReportSize,
    clearError
  } = useReports();

  // Estados del formulario de generación
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<TransactionReport | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Estados para carga dinámica de datos de transacciones
  const [loadingTransactionData, setLoadingTransactionData] = useState(false);
  const [selectedReportTransactionData, setSelectedReportTransactionData] = useState<any[]>([]);
  
  // ✅ Estado para controlar la descarga
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailReportSelected, setEmailReportSelected] = useState<TransactionReport | null>(null);

  
  // ✅ Estados del formulario (SIMPLIFICADOS)
  const [reportForm, setReportForm] = useState({
    type: ReportType.SALES,
    title: '',
    description: '',
    startDate: (() => {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      return date.toISOString().split('T')[0];
    })(),
    endDate: new Date().toISOString().split('T')[0],
    includeTypes: ['sale'] as ('sale' | 'purchase')[],
    // ❌ ELIMINADO: searchTerm
    // ✅ SIMPLIFICADO: Solo una opción para estadísticas
    includeDetailedData: true
  });

  const [estimatedSize, setEstimatedSize] = useState<{
    estimatedRecords: number;
    estimatedTime: number;
  }>({ estimatedRecords: 0, estimatedTime: 0 });

  const [previewData, setPreviewData] = useState<{
    recordCount: number;
    sampleData: any[];
  } | null>(null);

  useEffect(() => {
    loadRecentReports();
  }, [loadRecentReports]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Actualizar estimación cuando cambian los filtros
  useEffect(() => {
    if (reportForm.startDate && reportForm.endDate) {
      updateEstimation();
    }
  }, [reportForm.startDate, reportForm.endDate, reportForm.includeTypes]);

  // ✅ Hook mejorado para cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // ✅ Cerrar todos los dropdowns abiertos
      const dropdowns = document.querySelectorAll('[data-dropdown="true"]');
      let shouldClose = true;
      
      dropdowns.forEach(dropdown => {
        const parent = dropdown.closest('.download-selector');
        if (parent && parent.contains(event.target as Node)) {
          shouldClose = false;
        }
      });
      
      if (shouldClose) {
        // ✅ Forzar cierre de todos los dropdowns
        setDownloadingReportId(prev => prev); // Trigger re-render
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // ✅ Cerrar dropdowns con ESC
        setDownloadingReportId(prev => prev);
      }
    };

    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const updateEstimation = async () => {
    try {
      const filters: TransactionFilters = {
        startDate: new Date(reportForm.startDate),
        endDate: new Date(reportForm.endDate),
        includeTypes: reportForm.includeTypes
        // ❌ ELIMINADO: searchTerm
      };

      const estimation = await estimateReportSize(filters);
      setEstimatedSize(estimation);
    } catch (err) {
      console.error('Error estimando tamaño:', err);
    }
  };

  // ✅ Función para cargar datos de transacciones dinámicamente
  const loadTransactionDataForReport = async (report: TransactionReport) => {
    try {
      setLoadingTransactionData(true);
      console.log('🔄 Cargando datos de transacciones para:', report.title);
      
      // ✅ VERIFICACIÓN MÁS SEGURA para datos guardados
      const savedDataLength = report.transactionData?.length || 0;
      if (savedDataLength > 0) {
        console.log(`✅ Usando datos guardados: ${savedDataLength} registros`);
        setSelectedReportTransactionData(report.transactionData || []);
        return;
      }
      
      // ✅ Si no tiene datos guardados, cargar dinámicamente
      console.log('🔄 Cargando datos dinámicamente...');
      const { getTransactionData } = await import('../../services/reportService');
      const transactionData = await getTransactionData(report.filters);
      
      setSelectedReportTransactionData(transactionData);
      console.log(`✅ Datos dinámicos cargados: ${transactionData.length} registros`);
      
    } catch (error) {
      console.error('❌ Error cargando datos de transacciones:', error);
      setSelectedReportTransactionData([]);
    } finally {
      setLoadingTransactionData(false);
    }
  };

  // ✅ Función para manejar descarga con formato específico
  const handleDownloadReport = async (report: TransactionReport, format: 'excel' | 'pdf') => {
    try {
      setDownloadingReportId(report.id);
      
      if (format === 'excel') {
        const { downloadReport } = await import('../../services/downloadService');
        await downloadReport(report);
      } else if (format === 'pdf') {
        const { downloadReportAsPDF } = await import('../../services/downloadService');
        
        // Cargar datos si no los tiene
        let transactionData = report.transactionData || [];
        if (transactionData.length === 0 && report.filters) {
          const { getTransactionData } = await import('../../services/reportService');
          transactionData = await getTransactionData(report.filters);
        }
        
        const exportData = {
          reportInfo: {
            title: report.title,
            code: report.code,
            type: report.type,
            period: `${report.periodStart.toLocaleDateString('es-CL')} - ${report.periodEnd.toLocaleDateString('es-CL')}`,
            generatedAt: report.generatedAt.toLocaleString('es-CL'),
            generatedBy: report.generatedByName
          },
          summary: report.summary,
          transactions: transactionData,
          statistics: report.statistics
        };
        
        await downloadReportAsPDF(exportData);
      }
      
    } catch (error) {
      console.error('Error descargando reporte:', error);
      alert('Error al descargar el reporte: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setDownloadingReportId(null);
    }
  };

  // ✅ Componente selector de formato (MEJORADO)
  const DownloadFormatSelector: React.FC<{
    report: TransactionReport;
    isLoading: boolean;
  }> = ({ report, isLoading }) => {
    const [showOptions, setShowOptions] = useState(false);
    const [dropdownRef, setDropdownRef] = useState<HTMLDivElement | null>(null);

    const handleDownload = async (format: 'excel' | 'pdf') => {
      setShowOptions(false);
      await handleDownloadReport(report, format);
    };

    // ✅ Calcular posición del dropdown (MEJORADO)
    const getDropdownStyle = (): React.CSSProperties => {
      if (!dropdownRef) {
        return {
          position: 'absolute',
          top: '100%',
          left: 0,
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
          zIndex: 9999,
          minWidth: '150px',
          marginTop: '2px',
          animation: 'slideDown 0.2s ease-out'
        };
      }

      const rect = dropdownRef.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // ✅ Calcular espacio disponible
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = viewportWidth - rect.left;
      
      // ✅ Decidir posición vertical
      const shouldShowAbove = spaceBelow < 100 && spaceAbove > 100;
      
      // ✅ Decidir posición horizontal
      const shouldShowLeft = spaceRight < 150;

      return {
        position: 'fixed', // ✅ Cambio a fixed para mejor control
        [shouldShowAbove ? 'bottom' : 'top']: shouldShowAbove ? 
          `${viewportHeight - rect.top + 2}px` : 
          `${rect.bottom + 2}px`,
        [shouldShowLeft ? 'right' : 'left']: shouldShowLeft ? 
          `${viewportWidth - rect.right}px` : 
          `${rect.left}px`,
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
        zIndex: 10000, // ✅ Z-index aún más alto
        minWidth: '150px',
        animation: 'slideDown 0.2s ease-out'
      };
    };

    return (
      <div 
        className="download-selector" 
        style={{ position: 'relative', display: 'inline-block' }}
        ref={setDropdownRef}
      >
        <button 
          className="btn btn-sm btn-success"
          onClick={() => setShowOptions(!showOptions)}
          disabled={isLoading}
          title="Descargar reporte"
        >
          {isLoading ? '🔄' : '📥'} 
        </button>
        
        {showOptions && (
          <>
            {/* ✅ Overlay mejorado para cerrar el dropdown */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999, // ✅ Justo debajo del dropdown
                background: 'transparent',
                cursor: 'default'
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowOptions(false);
              }}
            />
            <div 
              className="download-options"
              data-dropdown="true"
              style={getDropdownStyle()}
              onClick={(e) => e.stopPropagation()} // ✅ Evitar que se cierre al hacer clic dentro
            >
          
            <button 
              className="download-option excel"
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'white',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.9em',
                color: '#16a085',
                borderRadius: '4px 4px 0 0'
              }}
              onClick={() => handleDownload('excel')}
              disabled={isLoading}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              📊 Excel (.xlsx)
            </button>
            <button 
              className="download-option pdf"
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'white',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.9em',
                color: '#e74c3c',
                borderRadius: '0 0 4px 4px'
              }}
              onClick={() => handleDownload('pdf')}
              disabled={isLoading}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              📄 PDF (.pdf)
            </button>
                      </div>
          </>
        )}
      </div>
    );
  };

  const handleGenerateReport = async () => {
    try {
      if (!currentUser) throw new Error('Usuario no autenticado');

      const filters: TransactionFilters = {
        startDate: new Date(reportForm.startDate),
        endDate: new Date(reportForm.endDate),
        includeTypes: reportForm.includeTypes
        // ❌ ELIMINADO: searchTerm
      };

      // Validar filtros
      const validation = validateFilters(filters);
      if (!validation.isValid) {
        alert(`Filtros inválidos: ${validation.errors.join(', ')}`);
        return;
      }

      const request: ReportGenerationRequest = {
        type: reportForm.type,
        title: reportForm.title || `Reporte ${getReportTypeLabel(reportForm.type)} - ${new Date().toLocaleDateString('es-CL')}`,
        description: reportForm.description,
        filters,
        exportConfig: {
          formats: ['pdf', 'excel'],
          // ✅ CLARIFICADO: No incluir gráficos automáticos (no son posibles con XLSX básico)
          includeCharts: false, // Los gráficos se crean manualmente en Excel
          includeStatistics: reportForm.includeDetailedData,
          includeRawData: true,
          groupData: true,
          applyFilters: true,
          passwordProtect: false,
          compressFiles: true
        }
      };

      await generateReport(request, currentUser.uid, currentUser.email || 'admin');
      setShowGenerateModal(false);
      setReportForm({
        type: ReportType.SALES,
        title: '',
        description: '',
        startDate: (() => {
          const date = new Date();
          date.setMonth(date.getMonth() - 1);
          return date.toISOString().split('T')[0];
        })(),
        endDate: new Date().toISOString().split('T')[0],
        includeTypes: ['sale'],
        includeDetailedData: true
      });
      
      // Recargar lista de reportes
      await loadRecentReports();
    } catch (err) {
      console.error('Error generando reporte:', err);
    }
  };

  const handlePreviewData = async () => {
    try {
      const filters: TransactionFilters = {
        startDate: new Date(reportForm.startDate),
        endDate: new Date(reportForm.endDate),
        includeTypes: reportForm.includeTypes
        // ❌ ELIMINADO: searchTerm
      };

      const preview = await previewReportData(filters);
      setPreviewData(preview);
    } catch (err) {
      console.error('Error previsualizando datos:', err);
    }
  };

  const getReportTypeLabel = (type: ReportType): string => {
    const labels: Record<ReportType, string> = {
      [ReportType.SALES]: 'Ventas',
      [ReportType.PURCHASES]: 'Compras',
      [ReportType.COMBINED]: 'Compras y Ventas',
      [ReportType.PROFIT_LOSS]: 'Ganancias y Pérdidas',
      [ReportType.INVENTORY_VALUE]: 'Valor del Inventario',
      [ReportType.CUSTOMER_ACTIVITY]: 'Actividad de Clientes',
      [ReportType.SUPPLIER_ACTIVITY]: 'Actividad de Proveedores',
      [ReportType.PRODUCT_PERFORMANCE]: 'Rendimiento de Productos',
      [ReportType.FINANCIAL_SUMMARY]: 'Resumen Financiero'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: ReportStatus): string => {
    switch (status) {
      case ReportStatus.COMPLETED: return 'success';
      case ReportStatus.GENERATING: return 'warning';
      case ReportStatus.FAILED: return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: ReportStatus): string => {
    switch (status) {
      case ReportStatus.COMPLETED: return 'Completado';
      case ReportStatus.GENERATING: return 'Generando';
      case ReportStatus.FAILED: return 'Error';
      case ReportStatus.PENDING: return 'Pendiente';
      default: return 'Desconocido';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // ✅ FORMULARIO SIMPLIFICADO
  const renderGenerateForm = () => (
    <div className="report-form">
      <div className="form-row">
        <div className="form-group">
          <label>Tipo de Reporte:</label>
          <select
            value={reportForm.type}
            onChange={(e) => {
              const newType = e.target.value as ReportType;
              setReportForm(prev => ({
                ...prev,
                type: newType,
                includeTypes: newType === ReportType.SALES ? ['sale'] :
                             newType === ReportType.PURCHASES ? ['purchase'] :
                             ['sale', 'purchase']
              }));
            }}
            className="filter-select"
          >
            <option value={ReportType.SALES}>📈 Reporte de Ventas</option>
            <option value={ReportType.PURCHASES}>📉 Reporte de Compras</option>
            <option value={ReportType.COMBINED}>📊 Reporte Combinado</option>
            <option value={ReportType.FINANCIAL_SUMMARY}>💰 Resumen Financiero</option>
          </select>
        </div>

        <div className="form-group">
          <label>Título del Reporte (opcional):</label>
          <input
            type="text"
            value={reportForm.title}
            onChange={(e) => setReportForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder={`Reporte ${getReportTypeLabel(reportForm.type)} - ${new Date().toLocaleDateString('es-CL')}`}
            className="filter-select"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Fecha desde:</label>
          <input
            type="date"
            value={reportForm.startDate}
            onChange={(e) => setReportForm(prev => ({ ...prev, startDate: e.target.value }))}
            className="filter-select"
            required
          />
        </div>

        <div className="form-group">
          <label>Fecha hasta:</label>
          <input
            type="date"
            value={reportForm.endDate}
            onChange={(e) => setReportForm(prev => ({ ...prev, endDate: e.target.value }))}
            className="filter-select"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Descripción (opcional):</label>
        <textarea
          value={reportForm.description}
          onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descripción del reporte..."
          rows={3}
          className="filter-select"
        />
      </div>

      {/* ✅ OPCIÓN SIMPLIFICADA Y CLARA */}
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={reportForm.includeDetailedData}
            onChange={(e) => setReportForm(prev => ({ ...prev, includeDetailedData: e.target.checked }))}
            style={{ width: 'auto' }}
          />
          <span>Incluir estadísticas detalladas y análisis completo</span>
        </label>
        <small style={{ color: '#6b7280', fontSize: '0.8em', marginLeft: '24px' }}>
          ✅ Incluye: estadísticas completas, tablas de análisis y datos detallados<br/>
          ⚠️ Nota: Los gráficos deben crearse manualmente en Excel después de la descarga
        </small>
      </div>

      {estimatedSize.estimatedRecords > 0 && (
        <div className="estimation-info">
          <div className="info-card" style={{
            padding: '16px',
            background: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '8px',
            margin: '15px 0'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#0c4a6e' }}>📊 Estimación del Reporte</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <p style={{ margin: '0' }}><strong>Registros estimados:</strong> {estimatedSize.estimatedRecords.toLocaleString()}</p>
              <p style={{ margin: '0' }}><strong>Tiempo estimado:</strong> {Math.ceil(estimatedSize.estimatedTime)} segundos</p>
            </div>
            {estimatedSize.estimatedRecords > 10000 && (
              <p style={{ margin: '10px 0 0 0', color: '#dc2626', fontWeight: '500' }}>
                ⚠️ Reporte muy grande, puede tardar varios minutos
              </p>
            )}
          </div>
        </div>
      )}

      {previewData && (
        <div className="preview-section">
          <h4>👀 Vista Previa de Datos</h4>
          <p><strong>Total de registros:</strong> {previewData.recordCount}</p>
          {previewData.sampleData.length > 0 && (
            <div className="preview-table">
              <h5>Muestra de datos:</h5>
              <div className="table-container">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Tipo</th>
                      <th>Fecha</th>
                      <th>Contraparte</th>
                      <th>Monto</th>
                      <th>Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.sampleData.slice(0, 5).map((transaction, index) => (
                      <tr key={index}>
                        <td><code>{transaction.code}</code></td>
                        <td>
                          <span className={`status-badge ${transaction.type === 'sale' ? 'success' : 'primary'}`}>
                            {transaction.type === 'sale' ? 'Venta' : 'Compra'}
                          </span>
                        </td>
                        <td>{new Date(transaction.date).toLocaleDateString('es-CL')}</td>
                        <td>{transaction.counterparty}</td>
                        <td>{formatCurrency(transaction.totalAmount)}</td>
                        <td>{transaction.itemsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.sampleData.length > 5 && (
                <p><em>... y {previewData.sampleData.length - 5} registros más</em></p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ✅ Renderizar datos de transacciones con carga dinámica
  const renderTransactionData = () => {
    if (loadingTransactionData) {
      return (
        <div className="loading-section">
          <h4>📊 Datos de Transacciones</h4>
          <div className="loading-spinner">🔄 Cargando datos de transacciones...</div>
        </div>
      );
    }

    // ✅ Mostrar datos cargados dinámicamente O datos guardados
    const dataToShow = selectedReportTransactionData.length > 0 
      ? selectedReportTransactionData 
      : selectedReport?.transactionData || [];

    if (dataToShow.length === 0) {
      return (
        <div className="no-data-section">
          <h4>📊 Datos de Transacciones</h4>
          <p>No hay datos de transacciones disponibles para este reporte.</p>
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => loadTransactionDataForReport(selectedReport!)}
            style={{ marginTop: '10px' }}
          >
            🔄 Cargar datos completos
          </button>
        </div>
      );
    }

    // ✅ CORRECCIÓN: Verificación más segura para evitar undefined
    const savedDataLength = selectedReport?.transactionData?.length || 0;
    const isFromSavedData = selectedReportTransactionData.length === 0 && savedDataLength > 0;
    const totalFromSummary = selectedReport?.summary?.totalTransactions || 0;
    const isPartialData = isFromSavedData && totalFromSummary > dataToShow.length;
    
    return (
      <div className="transaction-data-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h4>📊 Datos de Transacciones ({dataToShow.length})</h4>
          {isPartialData && (
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => loadTransactionDataForReport(selectedReport!)}
              title="Cargar todas las transacciones dinámicamente"
            >
              🔄 Ver todas ({totalFromSummary})
            </button>
          )}
        </div>
        
        {isPartialData && (
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#e7f3ff', 
            border: '1px solid #b3d7ff', 
            borderRadius: '4px', 
            marginBottom: '15px',
            fontSize: '0.9em'
          }}>
            📋 Mostrando muestra guardada ({dataToShow.length} de {totalFromSummary} transacciones). 
            <span style={{ color: '#0066cc', cursor: 'pointer' }} 
                  onClick={() => loadTransactionDataForReport(selectedReport!)}>
              Hacer clic para ver todas →
            </span>
          </div>
        )}
        
        <div className="table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Contraparte</th>
                <th>Monto</th>
                <th>Items</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {dataToShow.slice(0, 20).map((transaction, index) => (
                <tr key={index}>
                  <td><code>{transaction.code}</code></td>
                  <td>
                    <span className={`status-badge ${transaction.type === 'sale' ? 'success' : 'primary'}`}>
                      {transaction.type === 'sale' ? 'Venta' : 'Compra'}
                    </span>
                  </td>
                  <td>{transaction.transactionDate.toLocaleDateString('es-CL')}</td>
                  <td>{transaction.counterparty.name}</td>
                  <td>{formatCurrency(transaction.totalAmount)}</td>
                  <td>{transaction.items.length}</td>
                  <td>
                    <span className={`status-badge ${transaction.status === 'completed' ? 'success' : 'warning'}`}>
                      {transaction.status === 'completed' ? 'Completado' : transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dataToShow.length > 20 && (
            <p className="more-records">
              <em>... y {dataToShow.length - 20} transacciones más</em>
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderReportsList = () => (
    <div className="reports-list">
      <h3>📋 Reportes Generados Recientemente</h3>
      
      {recentReports.length === 0 ? (
        <div className="no-results">
          <div className="no-results-icon">📊</div>
          <h4>No hay reportes generados</h4>
          <p>Genera tu primer reporte para comenzar a ver el historial.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Período</th>
                <th>Estado</th>
                <th>Generado por</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <strong>{report.title}</strong>
                    {report.description && (
                      <small>{report.description.substring(0, 50)}...</small>
                    )}
                  </td>
                  <td>
                    <span className="status-badge secondary">
                      {getReportTypeLabel(report.type)}
                    </span>
                  </td>
                  <td>
                    <div className="date-range">
                      <div>{report.periodStart.toLocaleDateString('es-CL')}</div>
                      <small>al {report.periodEnd.toLocaleDateString('es-CL')}</small>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusColor(report.status)}`}>
                      {getStatusLabel(report.status)}
                    </span>
                  </td>
                  <td>
                    <div className="user-cell">
                      <div>{report.generatedByName}</div>
                      <small>{report.generatedAt.toLocaleDateString('es-CL')}</small>
                    </div>
                  </td>
                  <td>
                    {report.generatedAt.toLocaleDateString('es-CL')}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-sm btn-info"
                        onClick={async () => {
                          console.log('🔍 Abriendo detalles del reporte:', {
                            id: report.id,
                            title: report.title,
                            filters: report.filters
                          });
                          
                          setSelectedReport(report);
                          setShowDetailsModal(true);
                          
                          // Cargar datos de transacciones dinámicamente
                          await loadTransactionDataForReport(report);
                        }}
                        title="Ver detalles del reporte"
                      >
                        👁️
                      </button>
                      {report.status === ReportStatus.COMPLETED && (
                        <>
                          {/* ✅ SELECTOR DE FORMATO */}
                          <DownloadFormatSelector 
                            report={report}
                            isLoading={downloadingReportId === report.id}
                          />
                          
                          <button 
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              setEmailReportSelected(report);
                              setShowEmailModal(true);
                            }}
                            title="Enviar por email"
                          >
                            📧
                          </button>
                        </>
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

  const renderGenerationStatus = () => {
    if (!generationStatus) return null;

    return (
      <div className="generation-status">
        <div className="status-card">
          <div className="status-header">
            <h4>🔄 Generando Reporte</h4>
            <span className={`status-badge ${getStatusColor(generationStatus.status)}`}>
              {getStatusLabel(generationStatus.status)}
            </span>
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${generationStatus.progress}%` }}
            />
          </div>
          
          <div className="status-details">
            <p><strong>Paso actual:</strong> {generationStatus.currentStep}</p>
            <p><strong>Progreso:</strong> {generationStatus.progress}%</p>
            {generationStatus.estimatedTimeRemaining > 0 && (
              <p><strong>Tiempo estimado restante:</strong> {generationStatus.estimatedTimeRemaining} segundos</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="transaction-reports">
      {/* ✅ Estilos CSS para el dropdown (MEJORADOS) */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .info-card {
          border-radius: 8px;
          padding: 16px;
        }
        
        .download-selector {
          position: relative;
          display: inline-block;
        }
        
        .download-options {
          border: 1px solid #e0e0e0 !important;
          border-radius: 4px !important;
          background: white !important;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2) !important;
          overflow: hidden;
        }
        
        .download-option {
          display: block !important;
          width: 100% !important;
          padding: 10px 14px !important;
          border: none !important;
          background: white !important;
          text-align: left !important;
          cursor: pointer !important;
          font-size: 0.9em !important;
          transition: background-color 0.2s ease !important;
          border-bottom: 1px solid #f0f0f0 !important;
        }
        
        .download-option:last-child {
          border-bottom: none !important;
        }
        
        .download-option.excel {
          color: #16a085 !important;
        }
        
        .download-option.pdf {
          color: #e74c3c !important;
        }
        
        .download-option:hover:not(:disabled) {
          background-color: #f8f9fa !important;
        }
        
        .download-option:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }
        
        /* ✅ Asegurar que el dropdown esté por encima de todo */
        .download-options {
          z-index: 999999 !important; /* ✅ Z-index máximo */
          position: fixed !important;
        }
        
        /* ✅ Asegurar que el overlay también funcione */
        .download-overlay {
          z-index: 999998 !important;
          position: fixed !important;
        }
        
        /* ✅ Mejorar la animación del dropdown */
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        /* ✅ Efecto hover mejorado */
        .download-option:hover:not(:disabled) {
          background-color: #f1f3f4 !important;
          transform: translateX(2px);
          transition: all 0.15s ease !important;
        }
        
        /* ✅ Efecto de focus para accesibilidad */
        .download-option:focus {
          outline: 2px solid #4285f4 !important;
          outline-offset: -2px !important;
          background-color: #e8f0fe !important;
        }
      `}</style>

      <div className="section-header">
        <h2>💼 Reportes de Transacciones</h2>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowGenerateModal(true)}
            disabled={generating}
          >
            📊 Generar Nuevo Reporte
          </button>
        </div>
      </div>

      {error && (
        <div className="error-messages">
          <p className="error-message">{error}</p>
        </div>
      )}

      {renderGenerationStatus()}
      {renderReportsList()}

      {/* Modal para generar reporte */}
      {showGenerateModal && (
        <ReportModal
          title="📊 Generar Nuevo Reporte"
          onClose={() => setShowGenerateModal(false)}
          size="large"
        >
          {renderGenerateForm()}
          
          <div className="modal-actions">
            <button 
              className="btn btn-secondary"
              onClick={handlePreviewData}
              disabled={!reportForm.startDate || !reportForm.endDate}
            >
              👀 Vista Previa
            </button>
            
            <button 
              className="btn btn-primary"
              onClick={handleGenerateReport}
              disabled={generating || !reportForm.startDate || !reportForm.endDate}
            >
              {generating ? '🔄 Generando...' : '📊 Generar Reporte'}
            </button>
          </div>
        </ReportModal>
      )}

      {/* ✅ Modal para detalles del reporte (TAMAÑO XLARGE) */}
      {selectedReport && showDetailsModal && (
        <ReportModal
          title={`📋 Detalles: ${selectedReport.title}`}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedReport(null);
            setSelectedReportTransactionData([]); // Limpiar datos cargados
          }}
          size="xlarge"
        >
          <div className="report-details">
            <div className="detail-row">
              <div className="detail-group">
                <label>Código:</label>
                <p><code>{selectedReport.code}</code></p>
              </div>
              <div className="detail-group">
                <label>Tipo:</label>
                <p>{getReportTypeLabel(selectedReport.type)}</p>
              </div>
              <div className="detail-group">
                <label>Estado:</label>
                <p>
                  <span className={`status-badge ${getStatusColor(selectedReport.status)}`}>
                    {getStatusLabel(selectedReport.status)}
                  </span>
                </p>
              </div>
            </div>

            <div className="detail-row">
              <div className="detail-group">
                <label>Período:</label>
                <p>
                  {selectedReport.periodStart.toLocaleDateString('es-CL')} - 
                  {selectedReport.periodEnd.toLocaleDateString('es-CL')}
                </p>
              </div>
              <div className="detail-group">
                <label>Generado por:</label>
                <p>{selectedReport.generatedByName}</p>
              </div>
              <div className="detail-group">
                <label>Fecha de generación:</label>
                <p>{selectedReport.generatedAt.toLocaleString('es-CL')}</p>
              </div>
            </div>

            {selectedReport.description && (
              <div className="detail-row">
                <div className="detail-group full-width">
                  <label>Descripción:</label>
                  <p>{selectedReport.description}</p>
                </div>
              </div>
            )}

            {selectedReport.summary && (
              <div className="summary-section">
                <h4>📊 Resumen del Reporte</h4>
                <div className="summary-stats">
                  <div className="stat-item">
                    <label>Total de Transacciones:</label>
                    <span>{selectedReport.summary.totalTransactions.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <label>Monto Total:</label>
                    <span>{formatCurrency(selectedReport.summary.totalAmount)}</span>
                  </div>
                  <div className="stat-item">
                    <label>Total de Items:</label>
                    <span>{selectedReport.summary.totalItems.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <label>Cantidad Total:</label>
                    <span>{selectedReport.summary.totalQuantity.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <label>Promedio por Transacción:</label>
                    <span>{formatCurrency(selectedReport.summary.averageTransactionAmount)}</span>
                  </div>
                </div>

                {selectedReport.summary.salesSummary && (
                  <div className="subsummary">
                    <h5>📈 Resumen de Ventas</h5>
                    <p>
                      <strong>{selectedReport.summary.salesSummary.count}</strong> ventas por un total de 
                      <strong> {formatCurrency(selectedReport.summary.salesSummary.totalAmount)}</strong>
                    </p>
                  </div>
                )}

                {selectedReport.summary.purchasesSummary && (
                  <div className="subsummary">
                    <h5>📉 Resumen de Compras</h5>
                    <p>
                      <strong>{selectedReport.summary.purchasesSummary.count}</strong> compras por un total de 
                      <strong> {formatCurrency(selectedReport.summary.purchasesSummary.totalAmount)}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ✅ Sección de datos de transacciones */}
            {renderTransactionData()}

            {selectedReport.files && selectedReport.files.length > 0 && (
              <div className="files-section">
                <h4>📁 Archivos Generados</h4>
                {selectedReport.files.map((file, index) => (
                  <div key={index} className="file-item">
                    <span className="file-name">{file.fileName}</span>
                    <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => window.open(file.downloadUrl, '_blank')}
                    >
                      📥 Descargar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ReportModal>
      )}

      {showEmailModal && emailReportSelected && (
        <EmailModal
          report={emailReportSelected}
          onClose={() => {
            setShowEmailModal(false);
            setEmailReportSelected(null);
          }}
        />
      )}
    </div>
  );
};

export default TransactionReports;