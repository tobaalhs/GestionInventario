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
import {
  InventoryExportOptions,
  getInventoryData,
  exportInventoryToExcel,
  getAvailableCategories,
  getAvailableSuppliers
} from '../../services/inventoryExportService';
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

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<TransactionReport | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loadingTransactionData, setLoadingTransactionData] = useState(false);
  const [selectedReportTransactionData, setSelectedReportTransactionData] = useState<any[]>([]);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailReportSelected, setEmailReportSelected] = useState<TransactionReport | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadReportSelected, setDownloadReportSelected] = useState<TransactionReport | null>(null);
  
  // Estados para exportación de inventario
  const [showInventoryExportModal, setShowInventoryExportModal] = useState(false);
  const [inventoryExporting, setInventoryExporting] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [inventoryExportOptions, setInventoryExportOptions] = useState<InventoryExportOptions>({
    includeInactiveProducts: false,
    includeProductDetails: true,
    includeSummary: true,
    includeSuppliers: true,
    includeCategories: true,
    stockFilter: 'all'
  });

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
    loadInventoryExportData();
  }, [loadRecentReports]);

  const loadInventoryExportData = async () => {
    try {
      const [categories, suppliers] = await Promise.all([
        getAvailableCategories(),
        getAvailableSuppliers()
      ]);
      setAvailableCategories(categories);
      setAvailableSuppliers(suppliers);
    } catch (error) {
      console.error('Error cargando datos para exportación:', error);
    }
  };

  const handleInventoryExport = async () => {
    try {
      setInventoryExporting(true);
      console.log('📦 Iniciando exportación de inventario...');

      const inventoryData = await getInventoryData(inventoryExportOptions);
      await exportInventoryToExcel(inventoryData, inventoryExportOptions);

      setShowInventoryExportModal(false);
      alert('✅ Inventario exportado exitosamente');

    } catch (error) {
      console.error('❌ Error exportando inventario:', error);
      alert('Error al exportar inventario: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setInventoryExporting(false);
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

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
        includeTypes: reportForm.includeTypes
      };

      const estimation = await estimateReportSize(filters);
      setEstimatedSize(estimation);
    } catch (err) {
      console.error('Error estimando tamaño:', err);
    }
  };

  const loadTransactionDataForReport = async (report: TransactionReport) => {
    try {
      setLoadingTransactionData(true);
      console.log('🔄 Cargando datos de transacciones para:', report.title);
      
      const savedDataLength = report.transactionData?.length || 0;
      if (savedDataLength > 0) {
        console.log(`✅ Usando datos guardados: ${savedDataLength} registros`);
        setSelectedReportTransactionData(report.transactionData || []);
        return;
      }
      
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

  const handleDownloadReport = async (report: TransactionReport, format: 'excel' | 'pdf') => {
    try {
      setDownloadingReportId(report.id);
      
      if (format === 'excel') {
        const { downloadReport } = await import('../../services/downloadService');
        await downloadReport(report);
      } else if (format === 'pdf') {
        const { downloadReportAsPDF } = await import('../../services/downloadService');
        
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
      setShowDownloadModal(false);
      setDownloadReportSelected(null);
    }
  };

  const handleGenerateReport = async () => {
    try {
      if (!currentUser) throw new Error('Usuario no autenticado');

      const filters: TransactionFilters = {
        startDate: new Date(reportForm.startDate),
        endDate: new Date(reportForm.endDate),
        includeTypes: reportForm.includeTypes
      };

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
          includeCharts: false, 
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

  const renderDownloadModal = () => {
    if (!showDownloadModal || !downloadReportSelected) return null;

    return (
      <ReportModal
        title="📥 Descargar Reporte"
        onClose={() => {
          setShowDownloadModal(false);
          setDownloadReportSelected(null);
        }}
        size="medium"
      >
        <div className="download-options">
          <div className="report-info">
            <p><strong>Reporte:</strong> {downloadReportSelected.title}</p>
            <p><strong>Tipo:</strong> {getReportTypeLabel(downloadReportSelected.type)}</p>
            <p><strong>Período:</strong> {downloadReportSelected.periodStart.toLocaleDateString('es-CL')} - {downloadReportSelected.periodEnd.toLocaleDateString('es-CL')}</p>
            <p><strong>Transacciones:</strong> {downloadReportSelected.summary?.totalTransactions || 0}</p>
          </div>

          <div className="format-options">
            <h4>Selecciona el formato de descarga:</h4>
            <div className="format-descriptions">
              <div className="format-description">
                <h5>📊 Excel (.xlsx)</h5>
                <p>Ideal para análisis detallado, cálculos personalizados y manipulación de datos. Incluye múltiples hojas con estadísticas completas.</p>
              </div>
              <div className="format-description">
                <h5>📄 PDF (.pdf)</h5>
                <p>Perfecto para presentaciones, reportes ejecutivos y documentos para imprimir. Formato profesional listo para compartir.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setShowDownloadModal(false);
              setDownloadReportSelected(null);
            }}
          >
            Cancelar
          </button>
          <button 
            className="btn btn-success"
            onClick={() => handleDownloadReport(downloadReportSelected, 'excel')}
            disabled={downloadingReportId === downloadReportSelected.id}
          >
            {downloadingReportId === downloadReportSelected.id ? '🔄 Descargando...' : '📊 Descargar Excel'}
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => handleDownloadReport(downloadReportSelected, 'pdf')}
            disabled={downloadingReportId === downloadReportSelected.id}
          >
            {downloadingReportId === downloadReportSelected.id ? '🔄 Descargando...' : '📄 Descargar PDF'}
          </button>
        </div>
      </ReportModal>
    );
  };

  const renderInventoryExportModal = () => {
    if (!showInventoryExportModal) return null;

    return (
      <ReportModal
        title="📦 Exportar Inventario"
        onClose={() => setShowInventoryExportModal(false)}
        size="large"
      >
        <div className="inventory-export-form">
          <div className="form-section">
            <h4>📋 Contenido a Incluir</h4>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={inventoryExportOptions.includeProductDetails}
                  onChange={(e) => setInventoryExportOptions(prev => ({
                    ...prev,
                    includeProductDetails: e.target.checked
                  }))}
                />
                <span>Crear exportación completa de inventario con todos los campos de productos (nombre, precio, categoría, etc)</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={inventoryExportOptions.includeSummary}
                  onChange={(e) => setInventoryExportOptions(prev => ({
                    ...prev,
                    includeSummary: e.target.checked
                  }))}
                />
                <span>Agregar hoja de resumen con totales, promedios y estadísticas generales (total productos, total productos por categoría, valor total del inventario, etc)</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={inventoryExportOptions.includeCategories}
                  onChange={(e) => setInventoryExportOptions(prev => ({
                    ...prev,
                    includeCategories: e.target.checked
                  }))}
                />
                <span>Incluir análisis por categorías con estadísticas detalladas</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={inventoryExportOptions.includeSuppliers}
                  onChange={(e) => setInventoryExportOptions(prev => ({
                    ...prev,
                    includeSuppliers: e.target.checked
                  }))}
                />
                <span>Crear exportación de proveedores con información de contacto y productos asociados</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={inventoryExportOptions.includeInactiveProducts}
                  onChange={(e) => setInventoryExportOptions(prev => ({
                    ...prev,
                    includeInactiveProducts: e.target.checked
                  }))}
                />
                <span>Incluir productos inactivos/deshabilitados</span>
              </label>
            </div>
          </div>

          <div className="form-section">
            <h4>🔍 Filtros de Exportación</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label>Filtrar por Stock:</label>
                <select
                  value={inventoryExportOptions.stockFilter || 'all'}
                  onChange={(e) => setInventoryExportOptions(prev => ({
                    ...prev,
                    stockFilter: e.target.value as any
                  }))}
                  className="filter-select"
                >
                  <option value="all">Todos los productos</option>
                  <option value="in_stock">Solo con stock (más de 5 unidades)</option>
                  <option value="low_stock">Stock bajo (1-5 unidades)</option>
                  <option value="out_of_stock">Sin stock (0 unidades)</option>
                </select>
              </div>
            </div>

            {availableCategories.length > 0 && (
              <div className="form-group">
                <label>Filtrar por Categorías (opcional):</label>
                <div className="categories-filter">
                  {availableCategories.map(category => (
                    <label key={category} className="checkbox-label small">
                      <input
                        type="checkbox"
                        checked={inventoryExportOptions.categoryFilter?.includes(category) || false}
                        onChange={(e) => {
                          const currentFilters = inventoryExportOptions.categoryFilter || [];
                          const newFilters = e.target.checked
                            ? [...currentFilters, category]
                            : currentFilters.filter(c => c !== category);
                          
                          setInventoryExportOptions(prev => ({
                            ...prev,
                            categoryFilter: newFilters.length > 0 ? newFilters : undefined
                          }));
                        }}
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {availableSuppliers.length > 0 && (
              <div className="form-group">
                <label>Filtrar por Proveedores (opcional):</label>
                <div className="suppliers-filter">
                  {availableSuppliers.slice(0, 10).map(supplier => (
                    <label key={supplier.id} className="checkbox-label small">
                      <input
                        type="checkbox"
                        checked={inventoryExportOptions.supplierFilter?.includes(supplier.id) || false}
                        onChange={(e) => {
                          const currentFilters = inventoryExportOptions.supplierFilter || [];
                          const newFilters = e.target.checked
                            ? [...currentFilters, supplier.id]
                            : currentFilters.filter(s => s !== supplier.id);
                          
                          setInventoryExportOptions(prev => ({
                            ...prev,
                            supplierFilter: newFilters.length > 0 ? newFilters : undefined
                          }));
                        }}
                      />
                      <span>{supplier.name}</span>
                    </label>
                  ))}
                  {availableSuppliers.length > 10 && (
                    <small>... y {availableSuppliers.length - 10} proveedores más</small>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="export-info">
            <div className="info-card">
              <h4>📊 Información de Exportación</h4>
              <ul>
                <li>✅ El archivo se generará en formato Excel (.xlsx)</li>
                <li>📋 Cada sección seleccionada será una hoja separada</li>
                <li>📈 Las estadísticas se calcularán automáticamente</li>
                <li>🔍 Los filtros se aplicarán a todos los datos</li>
                <li>💾 El archivo se descargará automáticamente</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowInventoryExportModal(false)}
            disabled={inventoryExporting}
          >
            Cancelar
          </button>
          
          <button 
            className="btn btn-success"
            onClick={handleInventoryExport}
            disabled={inventoryExporting}
          >
            {inventoryExporting ? '🔄 Exportando...' : '📦 Exportar Inventario'}
          </button>
        </div>
      </ReportModal>
    );
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

  const renderTransactionData = () => {
    if (loadingTransactionData) {
      return (
        <div className="loading-section">
          <h4>📊 Datos de Transacciones</h4>
          <div className="loading-spinner">🔄 Cargando datos de transacciones...</div>
        </div>
      );
    }

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
                      {transaction.status === 'completed' ? 'Completado' : 
                       transaction.status === 'pending' ? 'Pendiente' :
                       transaction.status === 'cancelled' ? 'Cancelado' :
                       transaction.status}
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
                          
                          await loadTransactionDataForReport(report);
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
                              setDownloadReportSelected(report);
                              setShowDownloadModal(true);
                            }}
                            disabled={downloadingReportId === report.id}
                            title="Descargar reporte"
                          >
                            {downloadingReportId === report.id ? '🔄' : '📥'}
                          </button>
                          
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
      <div className="section-header">
        <h2>💼 Reportes de Transacciones</h2>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowInventoryExportModal(true)}
            disabled={inventoryExporting}
          >
            {inventoryExporting ? '🔄 Exportando...' : '📦 Exportar Inventario'}
          </button>
          
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

      {selectedReport && showDetailsModal && (
        <ReportModal
          title={`📋 Detalles: ${selectedReport.title}`}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedReport(null);
            setSelectedReportTransactionData([]);
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

      {renderDownloadModal()}
      {renderInventoryExportModal()}
    </div>
  );
};

export default TransactionReports;