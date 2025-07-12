import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { TransactionReport, TransactionData } from '../interfaces/Report';
import { getTransactionData } from './reportService';

// Extender jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * ✅ Función principal para descargar reportes (CORREGIDA CON MEJOR MANEJO DE ERRORES)
 */
export const downloadReport = async (report: TransactionReport) => {
  try {
    console.log('📥 Iniciando descarga de reporte:', report.id);

    // ✅ Cargar datos de transacciones dinámicamente si no los tiene
    let transactionData = report.transactionData || [];
    
    if (transactionData.length === 0 && report.filters) {
      console.log('🔄 Cargando datos de transacciones para descarga...');
      
      try {
        const { getTransactionData } = await import('./reportService');
        transactionData = await getTransactionData(report.filters);
        console.log(`✅ ${transactionData.length} transacciones cargadas para descarga`);
      } catch (loadError) {
        console.error('❌ Error cargando datos de transacciones:', loadError);
        
        // Si falla cargar los datos, pero tenemos resumen, continuar con solo el resumen
        if (report.summary && report.summary.totalTransactions > 0) {
          console.warn('⚠️ Continuando descarga solo con resumen');
        } else {
          throw new Error('No se pudieron cargar los datos de transacciones para la descarga.\n\nError: ' + (loadError instanceof Error ? loadError.message : 'Error desconocido'));
        }
      }
    }

    // Validar que tengamos datos para exportar
    if (transactionData.length === 0 && (!report.summary || report.summary.totalTransactions === 0)) {
      throw new Error('Este reporte no contiene datos para exportar.\n\nPosibles causas:\n- No hay transacciones en el período seleccionado\n- El reporte se generó con errores\n- Los filtros son muy restrictivos');
    }

    // Preparar datos para descarga
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

    console.log('📊 Datos preparados para descarga:', {
      transactionsCount: exportData.transactions.length,
      hasSummary: !!exportData.summary,
      hasStatistics: !!exportData.statistics
    });

    // Proceder con la descarga en Excel
    await downloadReportAsExcel(exportData);
    
  } catch (error) {
    console.error('❌ Error descargando reporte:', error);
    
    // Mostrar error específico al usuario
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al descargar el reporte';
    alert(errorMessage);
    throw error; // Re-lanzar para que el botón maneje el estado
  }
};

/**
 * ✅ Función para formatear moneda chilena
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * ✅ Función para formatear números con separadores
 */
const formatNumber = (num: number): string => {
  return num.toLocaleString('es-CL');
};

/**
 * ✅ Descargar reporte como Excel (CORREGIDA)
 */
export const downloadReportAsExcel = async (exportData: any) => {
  try {
    const workbook = XLSX.utils.book_new();

    // ✅ HOJA 1: Información del Reporte
    const reportInfoData = [
      ['INFORMACIÓN DEL REPORTE'],
      [''],
      ['Título:', exportData.reportInfo.title],
      ['Código:', exportData.reportInfo.code],
      ['Tipo:', exportData.reportInfo.type],
      ['Período:', exportData.reportInfo.period],
      ['Generado el:', exportData.reportInfo.generatedAt],
      ['Generado por:', exportData.reportInfo.generatedBy]
    ];

    const reportInfoSheet = XLSX.utils.aoa_to_sheet(reportInfoData);
    XLSX.utils.book_append_sheet(workbook, reportInfoSheet, 'Información');

    // ✅ HOJA 2: Resumen
    if (exportData.summary) {
      const summaryData = [
        ['RESUMEN DEL REPORTE'],
        [''],
        ['Total de Transacciones:', formatNumber(exportData.summary.totalTransactions)],
        ['Monto Total:', formatCurrency(exportData.summary.totalAmount)],
        ['Total de Items:', formatNumber(exportData.summary.totalItems)],
        ['Cantidad Total:', formatNumber(exportData.summary.totalQuantity)],
        ['Promedio por Transacción:', formatCurrency(exportData.summary.averageTransactionAmount)],
        [''],
        ['RESUMEN DE VENTAS'],
        ['Cantidad de Ventas:', exportData.summary.salesSummary ? formatNumber(exportData.summary.salesSummary.count) : '0'],
        ['Monto Total Ventas:', exportData.summary.salesSummary ? formatCurrency(exportData.summary.salesSummary.totalAmount) : formatCurrency(0)],
        [''],
        ['RESUMEN DE COMPRAS'],
        ['Cantidad de Compras:', exportData.summary.purchasesSummary ? formatNumber(exportData.summary.purchasesSummary.count) : '0'],
        ['Monto Total Compras:', exportData.summary.purchasesSummary ? formatCurrency(exportData.summary.purchasesSummary.totalAmount) : formatCurrency(0)]
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
    }

    // ✅ HOJA 3: Transacciones
    if (exportData.transactions && exportData.transactions.length > 0) {
      const transactionHeaders = [
        'Código',
        'Tipo',
        'Fecha',
        'Contraparte',
        'RUT',
        'Monto Total',
        'Cantidad Items',
        'Estado',
        'Usuario',
        'Comentarios'
      ];

      const transactionRows = exportData.transactions.map((transaction: TransactionData) => [
        transaction.code,
        transaction.type === 'sale' ? 'Venta' : 'Compra',
        transaction.transactionDate.toLocaleDateString('es-CL'),
        transaction.counterparty.name,
        transaction.counterparty.rut,
        formatCurrency(transaction.totalAmount),
        formatNumber(transaction.items.length),
        transaction.status === 'completed' ? 'Completado' : transaction.status,
        transaction.user.name,
        transaction.comments || ''
      ]);

      const transactionData = [transactionHeaders, ...transactionRows];
      const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
      XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transacciones');
    }

    // ✅ HOJA 4: Estadísticas (si existen)
    if (exportData.statistics) {
      const statisticsData = [['ESTADÍSTICAS DEL REPORTE'], ['']];

      // Top Clientes
      if (exportData.statistics.topCustomers && exportData.statistics.topCustomers.length > 0) {
        statisticsData.push(['TOP CLIENTES'], ['']);
        statisticsData.push(['Cliente', 'RUT', 'Transacciones', 'Monto Total', 'Promedio', 'Porcentaje']);
        
        exportData.statistics.topCustomers.forEach((customer: any) => {
          statisticsData.push([
            customer.customerName,
            customer.customerRut,
            customer.transactionCount.toString(),
            customer.totalAmount.toString(), // ✅ Convertido a string
            customer.averageOrderValue.toString(), // ✅ Convertido a string
            `${customer.percentage.toFixed(2)}%`
          ]);
        });
        statisticsData.push(['']);
      }

      // Top Proveedores
      if (exportData.statistics.topSuppliers && exportData.statistics.topSuppliers.length > 0) {
        statisticsData.push(['TOP PROVEEDORES'], ['']);
        statisticsData.push(['Proveedor', 'RUT', 'Transacciones', 'Monto Total', 'Promedio', 'Porcentaje']);
        
        exportData.statistics.topSuppliers.forEach((supplier: any) => {
          statisticsData.push([
            supplier.supplierName,
            supplier.supplierRut,
            supplier.transactionCount.toString(),
            supplier.totalAmount.toString(), // ✅ Convertido a string
            supplier.averageOrderValue.toString(), // ✅ Convertido a string
            `${supplier.percentage.toFixed(2)}%`
          ]);
        });
        statisticsData.push(['']);
      }

      // Top Productos
      if (exportData.statistics.topProducts && exportData.statistics.topProducts.length > 0) {
        statisticsData.push(['TOP PRODUCTOS'], ['']);
        statisticsData.push(['Código', 'Producto', 'Categoría', 'Ventas', 'Compras', 'Monto Ventas', 'Monto Compras']);
        
        exportData.statistics.topProducts.forEach((product: any) => {
          statisticsData.push([
            product.productCode,
            product.productName,
            product.category,
            product.salesCount.toString(),
            product.purchasesCount.toString(),
            product.totalSalesAmount.toString(), // ✅ Convertido a string
            product.totalPurchasesAmount.toString() // ✅ Convertido a string
          ]);
        });
      }

      const statisticsSheet = XLSX.utils.aoa_to_sheet(statisticsData);
      XLSX.utils.book_append_sheet(workbook, statisticsSheet, 'Estadísticas');
    }

    // ✅ Generar y descargar archivo
    const fileName = `${exportData.reportInfo.code}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    console.log('✅ Reporte descargado exitosamente:', fileName);

  } catch (error) {
    console.error('❌ Error generando archivo Excel:', error);
    throw new Error('Error al generar el archivo Excel. Por favor, inténtalo de nuevo.');
  }
};

/**
 * ✅ Descargar reporte como PDF (OPCIONAL)
 */
export const downloadReportAsPDF = async (exportData: any) => {
  try {
    const doc = new jsPDF();
    
    // Título del reporte
    doc.setFontSize(16);
    doc.text(exportData.reportInfo.title, 20, 20);
    
    // Información básica
    doc.setFontSize(12);
    doc.text(`Código: ${exportData.reportInfo.code}`, 20, 35);
    doc.text(`Período: ${exportData.reportInfo.period}`, 20, 45);
    doc.text(`Generado: ${exportData.reportInfo.generatedAt}`, 20, 55);

    let yPosition = 70;

    // Resumen
    if (exportData.summary) {
      doc.setFontSize(14);
      doc.text('Resumen', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.text(`Total Transacciones: ${formatNumber(exportData.summary.totalTransactions)}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Monto Total: ${formatCurrency(exportData.summary.totalAmount)}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Promedio: ${formatCurrency(exportData.summary.averageTransactionAmount)}`, 20, yPosition);
      yPosition += 15;
    }

    // Tabla de transacciones (primeras 20)
    if (exportData.transactions && exportData.transactions.length > 0) {
      doc.setFontSize(14);
      doc.text('Transacciones', 20, yPosition);
      yPosition += 10;

      const tableData = exportData.transactions.slice(0, 20).map((transaction: TransactionData) => [
        transaction.code,
        transaction.type === 'sale' ? 'Venta' : 'Compra',
        transaction.transactionDate.toLocaleDateString('es-CL'),
        transaction.counterparty.name.substring(0, 20),
        formatCurrency(transaction.totalAmount)
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['Código', 'Tipo', 'Fecha', 'Contraparte', 'Monto']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });
    }

    // Descargar PDF
    const fileName = `${exportData.reportInfo.code}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    console.log('✅ PDF descargado exitosamente:', fileName);

  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    throw new Error('Error al generar el archivo PDF. Por favor, inténtalo de nuevo.');
  }
};

/**
 * ✅ Función de validación de datos para exportación
 */
export const validateReportDataForExport = (report: TransactionReport): boolean => {
  console.log('🔍 Validando datos para exportación:', {
    id: report.id,
    hasTransactionData: !!report.transactionData,
    transactionDataLength: report.transactionData?.length || 0,
    hasSummary: !!report.summary,
    hasStatistics: !!report.statistics,
    hasFilters: !!report.filters
  });

  // ✅ Verificaciones más flexibles
  const hasData = (
    (report.transactionData && report.transactionData.length > 0) ||
    (report.summary && report.summary.totalTransactions > 0) ||
    (report.statistics && Object.keys(report.statistics).length > 0) ||
    (report.filters) // Si tiene filtros, se pueden cargar los datos dinámicamente
  );

  if (!hasData) {
    console.warn('❌ Reporte sin datos válidos para exportar');
    return false;
  }

  return true;
};

/**
 * ✅ Función para exportar datos específicos (para uso futuro)
 */
export const exportCustomData = async (
  data: any[], 
  headers: string[], 
  fileName: string,
  format: 'excel' | 'csv' = 'excel'
) => {
  try {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

    const fileExtension = format === 'excel' ? '.xlsx' : '.csv';
    const fullFileName = `${fileName}_${new Date().toISOString().split('T')[0]}${fileExtension}`;

    if (format === 'excel') {
      XLSX.writeFile(workbook, fullFileName);
    } else {
      XLSX.writeFile(workbook, fullFileName, { bookType: 'csv' });
    }

    console.log(`✅ Archivo ${format} descargado:`, fullFileName);

  } catch (error) {
    console.error(`❌ Error exportando como ${format}:`, error);
    throw error;
  }
};