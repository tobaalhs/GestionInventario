import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useReports } from '../../hooks/useReports';
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
  
  // Estados del formulario
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
    searchTerm: '',
    includeStatistics: true,
    includeCharts: true
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

  const updateEstimation = async () => {
    try {
      const filters: TransactionFilters = {
        startDate: new Date(reportForm.startDate),
        endDate: new Date(reportForm.endDate),
        includeTypes: reportForm.includeTypes,
        searchTerm: reportForm.searchTerm
      };

      const estimation = await estimateReportSize(filters);
      setEstimatedSize(estimation);
    } catch (err) {
      console.error('Error estimando tamaño:', err);
    }
  };

  const handleGenerateReport = async () => {
    try {
      if (!currentUser) throw new Error('Usuario no autenticado');

      const filters: TransactionFilters = {
        startDate: new Date(reportForm.startDate),
        endDate: new Date(reportForm.endDate),
        includeTypes: reportForm.includeTypes,
        searchTerm: reportForm.searchTerm
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
          includeCharts: reportForm.includeCharts,
          includeStatistics: reportForm.includeStatistics,
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
        searchTerm: '',
        includeStatistics: true,
        includeCharts: true
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
        includeTypes: reportForm.includeTypes,
        searchTerm: reportForm.searchTerm
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

        <div className="form-group">
          <label>Buscar término (opcional):</label>
          <input
            type="text"
            value={reportForm.searchTerm}
            onChange={(e) => setReportForm(prev => ({ ...prev, searchTerm: e.target.value }))}
            placeholder="Cliente, producto, código..."
            className="filter-select"
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

      <div className="form-row">
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={reportForm.includeStatistics}
              onChange={(e) => setReportForm(prev => ({ ...prev, includeStatistics: e.target.checked }))}
            />
            Incluir estadísticas detalladas
          </label>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={reportForm.includeCharts}
              onChange={(e) => setReportForm(prev => ({ ...prev, includeCharts: e.target.checked }))}
            />
            Incluir gráficos
          </label>
        </div>
      </div>

      {estimatedSize.estimatedRecords > 0 && (
        <div className="estimation-info">
          <div className="info-card">
            <h4>📊 Estimación del Reporte</h4>
            <p><strong>Registros estimados:</strong> {estimatedSize.estimatedRecords.toLocaleString()}</p>
            <p><strong>Tiempo estimado:</strong> {Math.ceil(estimatedSize.estimatedTime)} segundos</p>
            {estimatedSize.estimatedRecords > 10000 && (
              <p className="warning-text">⚠️ Reporte muy grande, puede tardar varios minutos</p>
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
              {previewData.sampleData.length > 5 && (
                <p><em>... y {previewData.sampleData.length - 5} registros más</em></p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

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
                        onClick={() => {
                          setSelectedReport(report);
                          setShowDetailsModal(true);
                        }}
                        title="Ver detalles del reporte"
                      >
                        👁️
                      </button>
                      {report.status === ReportStatus.COMPLETED && (
                        <>
                          <button 
                            className="btn btn-sm btn-success"
                            onClick={() => {
                              // Implementar descarga
                              alert('Descarga en desarrollo');
                            }}
                            title="Descargar reporte"
                          >
                            📥
                          </button>
                          <button 
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              // Implementar envío por email
                              alert('Envío por email en desarrollo');
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

      {/* Modal para detalles del reporte */}
      {selectedReport && showDetailsModal && (
        <ReportModal
          title={`📋 Detalles: ${selectedReport.title}`}
          onClose={() => setShowDetailsModal(false)}
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
    </div>
  );
};

export default TransactionReports;