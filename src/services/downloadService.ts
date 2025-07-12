import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable'; // ✅ Importación explícita de autoTable
import { TransactionReport, TransactionData } from '../interfaces/Report';
import { getTransactionData } from './reportService';

// ✅ Extender jsPDF para incluir autoTable (MEJORADO)
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

/**
 * ✅ Función principal para descargar reportes (MEJORADA CON SOPORTE DE TOKENS)
 */
export const downloadReport = async (report: TransactionReport, isTokenDownload: boolean = false) => {
  try {
    console.log('📥 Iniciando descarga de reporte:', { 
      reportId: report.id, 
      isTokenDownload,
      hasTransactionData: !!report.transactionData,
      transactionCount: report.transactionData?.length || 0
    });

    // ✅ Cargar datos de transacciones dinámicamente SOLO si no los tiene
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
        generatedBy: report.generatedByName,
        downloadType: isTokenDownload ? 'Token Download' : 'Authenticated Download' // ✅ Nuevo campo
      },
      summary: report.summary,
      transactions: transactionData,
      statistics: report.statistics
    };

    console.log('📊 Datos preparados para descarga:', {
      transactionsCount: exportData.transactions.length,
      hasSummary: !!exportData.summary,
      hasStatistics: !!exportData.statistics,
      downloadType: exportData.reportInfo.downloadType
    });

    // Proceder con la descarga en Excel
    await downloadReportAsExcel(exportData);
    
  } catch (error) {
    console.error('❌ Error descargando reporte:', error);
    
    // Mostrar error específico al usuario
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al descargar el reporte';
    
    // Solo mostrar alert si no es descarga por token (para evitar popups en descarga automática)
    if (!isTokenDownload) {
      alert(errorMessage);
    }
    
    throw error; // Re-lanzar para que el botón maneje el estado
  }
};

/**
 * ✅ NUEVA: Función específica para descarga con token que NO vuelve a cargar datos
 */
export const downloadReportWithToken = async (report: TransactionReport) => {
  try {
    console.log('🔒 Iniciando descarga con token (datos pre-cargados)...', {
      hasTransactionData: !!report.transactionData,
      transactionCount: report.transactionData?.length || 0,
      reportKeys: Object.keys(report),
      reportData: report
    });

    // ✅ USAR DATOS YA CARGADOS - NO volver a cargar
    const transactionData = report.transactionData || [];
    
    console.log('📊 Datos de transacciones para Excel:', {
      transactionsCount: transactionData.length,
      firstTransaction: transactionData[0],
      hasSummary: !!report.summary,
      hasStatistics: !!report.statistics
    });

    // ✅ IMPORTANTE: Si no hay transactionData pero hay filtros, usar downloadReport normal
    if (transactionData.length === 0 && report.filters) {
      console.log('⚠️ No hay transactionData, usando downloadReport para cargar datos...');
      return await downloadReport(report, true);
    }

    // Validar que tengamos datos para exportar
    if (transactionData.length === 0 && (!report.summary || report.summary.totalTransactions === 0)) {
      throw new Error('Este reporte no contiene datos para exportar.');
    }

    // ✅ Preparar datos para descarga DIRECTAMENTE
    const exportData = {
      reportInfo: {
        title: report.title,
        code: report.code,
        type: report.type,
        period: `${report.periodStart.toLocaleDateString('es-CL')} - ${report.periodEnd.toLocaleDateString('es-CL')}`,
        generatedAt: report.generatedAt.toLocaleString('es-CL'),
        generatedBy: report.generatedByName,
        downloadType: 'Token Download'
      },
      summary: report.summary,
      transactions: transactionData, // ✅ Usar datos ya cargados
      statistics: report.statistics
    };

    console.log('✅ ExportData preparado para Excel:', {
      transactionsCount: exportData.transactions.length,
      hasSummary: !!exportData.summary,
      hasStatistics: !!exportData.statistics,
      downloadType: exportData.reportInfo.downloadType,
      firstTransactionInExport: exportData.transactions[0]
    });

    // ✅ Descargar directamente
    await downloadReportAsExcel(exportData);
    
    console.log('✅ Descarga con token completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en descarga con token:', error);
    throw error;
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
 * ✅ Descargar reporte como Excel (CORREGIDA Y MEJORADA)
 */
export const downloadReportAsExcel = async (exportData: any) => {
  try {
    console.log('📊 Iniciando generación de Excel con datos:', {
      transactionsCount: exportData.transactions?.length || 0,
      hasSummary: !!exportData.summary,
      hasStatistics: !!exportData.statistics
    });

    const workbook = XLSX.utils.book_new();

    // ✅ HOJA 1: Información del Reporte (MEJORADA)
    const reportInfoData = [
      ['INFORMACIÓN DEL REPORTE'],
      [''],
      ['Título:', exportData.reportInfo.title],
      ['Código:', exportData.reportInfo.code],
      ['Tipo:', exportData.reportInfo.type],
      ['Período:', exportData.reportInfo.period],
      ['Generado el:', exportData.reportInfo.generatedAt],
      ['Generado por:', exportData.reportInfo.generatedBy],
      ['Tipo de descarga:', exportData.reportInfo.downloadType || 'Standard'], // ✅ Nuevo campo
      ['Descargado el:', new Date().toLocaleString('es-CL')] // ✅ Timestamp de descarga
    ];

    const reportInfoSheet = XLSX.utils.aoa_to_sheet(reportInfoData);
    
    // ✅ Aplicar formato a la hoja de información (CORREGIDO)
    if (!reportInfoSheet['!cols']) {
      reportInfoSheet['!cols'] = [];
    }
    const infoCols = reportInfoSheet['!cols'];
    if (infoCols) {
      infoCols[0] = { wch: 20 }; // Ancho de primera columna
      infoCols[1] = { wch: 40 }; // Ancho de segunda columna
    }
    
    XLSX.utils.book_append_sheet(workbook, reportInfoSheet, 'Información');

    // ✅ HOJA 2: Resumen (MEJORADA)
    if (exportData.summary) {
      const summaryData = [
        ['RESUMEN DEL REPORTE'],
        [''],
        ['📊 DATOS GENERALES'],
        ['Total de Transacciones:', formatNumber(exportData.summary.totalTransactions)],
        ['Monto Total:', formatCurrency(exportData.summary.totalAmount)],
        ['Total de Items:', formatNumber(exportData.summary.totalItems)],
        ['Cantidad Total:', formatNumber(exportData.summary.totalQuantity)],
        ['Promedio por Transacción:', formatCurrency(exportData.summary.averageTransactionAmount)],
        [''],
        ['📈 RESUMEN DE VENTAS'],
        ['Cantidad de Ventas:', exportData.summary.salesSummary ? formatNumber(exportData.summary.salesSummary.count) : '0'],
        ['Monto Total Ventas:', exportData.summary.salesSummary ? formatCurrency(exportData.summary.salesSummary.totalAmount) : formatCurrency(0)],
        ['Promedio Ventas:', exportData.summary.salesSummary && exportData.summary.salesSummary.count > 0 ? 
          formatCurrency(exportData.summary.salesSummary.averageAmount) : formatCurrency(0)],
        [''],
        ['📉 RESUMEN DE COMPRAS'],
        ['Cantidad de Compras:', exportData.summary.purchasesSummary ? formatNumber(exportData.summary.purchasesSummary.count) : '0'],
        ['Monto Total Compras:', exportData.summary.purchasesSummary ? formatCurrency(exportData.summary.purchasesSummary.totalAmount) : formatCurrency(0)],
        ['Promedio Compras:', exportData.summary.purchasesSummary && exportData.summary.purchasesSummary.count > 0 ? 
          formatCurrency(exportData.summary.purchasesSummary.averageAmount) : formatCurrency(0)]
      ];

      // ✅ Agregar información de tendencias si existe
      if (exportData.summary.trends) {
        summaryData.push(['']);
        summaryData.push(['📊 TENDENCIAS']);
        summaryData.push(['Promedio Diario:', formatCurrency(exportData.summary.trends.dailyAverage)]);
        summaryData.push(['Promedio Semanal:', formatCurrency(exportData.summary.trends.weeklyAverage)]);
        summaryData.push(['Promedio Mensual:', formatCurrency(exportData.summary.trends.monthlyAverage)]);
        summaryData.push(['Tasa de Crecimiento:', `${exportData.summary.trends.growthRate.toFixed(2)}%`]);
      }

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      
      // ✅ Aplicar formato (CORREGIDO)
      if (!summarySheet['!cols']) {
        summarySheet['!cols'] = [];
      }
      const summaryCols = summarySheet['!cols'];
      if (summaryCols) {
        summaryCols[0] = { wch: 25 };
        summaryCols[1] = { wch: 20 };
      }
      
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
    }

    // ✅ HOJA 3: Transacciones (MEJORADA - SIEMPRE SE INCLUYE SI HAY DATOS)
    if (exportData.transactions && exportData.transactions.length > 0) {
      console.log('📄 Generando hoja de Transacciones con', exportData.transactions.length, 'registros');
      
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
        'Método de Pago',
        'Comentarios'
      ];

      const transactionRows = exportData.transactions.map((transaction: TransactionData) => [
        transaction.code,
        transaction.type === 'sale' ? 'Venta' : 'Compra',
        transaction.transactionDate.toLocaleDateString('es-CL'),
        transaction.counterparty.name,
        transaction.counterparty.rut,
        transaction.totalAmount, // ✅ Número para Excel
        transaction.items.length,
        transaction.status === 'completed' ? 'Completado' : transaction.status,
        transaction.user.name,
        transaction.paymentMethod || 'N/A',
        transaction.comments || ''
      ]);

      const transactionData = [transactionHeaders, ...transactionRows];
      const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
      
      // ✅ Aplicar formato a columnas (CORREGIDO)
      if (!transactionSheet['!cols']) {
        transactionSheet['!cols'] = [];
      }
      const transCols = transactionSheet['!cols'];
      if (transCols) {
        transCols[0] = { wch: 15 }; // Código
        transCols[1] = { wch: 10 }; // Tipo
        transCols[2] = { wch: 12 }; // Fecha
        transCols[3] = { wch: 25 }; // Contraparte
        transCols[4] = { wch: 15 }; // RUT
        transCols[5] = { wch: 15 }; // Monto
        transCols[6] = { wch: 12 }; // Items
        transCols[7] = { wch: 12 }; // Estado
        transCols[8] = { wch: 20 }; // Usuario
        transCols[9] = { wch: 15 }; // Pago
        transCols[10] = { wch: 30 }; // Comentarios
      }
      
      XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transacciones');
      console.log('✅ Hoja de Transacciones creada exitosamente');
    } else {
      console.log('⚠️ No hay transacciones detalladas para incluir en Excel');
    }

    // ✅ HOJA 4: Detalle de Items (SIEMPRE SE INCLUYE SI HAY TRANSACCIONES)
    if (exportData.transactions && exportData.transactions.length > 0) {
      console.log('📄 Generando hoja de Detalle Items...');
      
      const itemHeaders = [
        'Código Transacción',
        'Tipo Transacción',
        'Fecha',
        'Código Producto',
        'Producto',
        'Categoría',
        'Cantidad',
        'Precio Unitario',
        'Total'
      ];

      const itemRows: any[] = [];
      exportData.transactions.forEach((transaction: TransactionData) => {
        transaction.items.forEach(item => {
          itemRows.push([
            transaction.code,
            transaction.type === 'sale' ? 'Venta' : 'Compra',
            transaction.transactionDate.toLocaleDateString('es-CL'),
            item.productCode,
            item.productName,
            item.category,
            item.quantity,
            item.unitPrice,
            item.totalPrice
          ]);
        });
      });

      if (itemRows.length > 0) {
        console.log('📄 Creando hoja con', itemRows.length, 'items detallados');
        
        const itemData = [itemHeaders, ...itemRows];
        const itemSheet = XLSX.utils.aoa_to_sheet(itemData);
        
        // ✅ Aplicar formato (CORREGIDO)
        if (!itemSheet['!cols']) {
          itemSheet['!cols'] = [];
        }
        const itemCols = itemSheet['!cols'];
        if (itemCols) {
          itemCols[0] = { wch: 15 };
          itemCols[1] = { wch: 10 };
          itemCols[2] = { wch: 12 };
          itemCols[3] = { wch: 15 };
          itemCols[4] = { wch: 30 };
          itemCols[5] = { wch: 15 };
          itemCols[6] = { wch: 10 };
          itemCols[7] = { wch: 12 };
          itemCols[8] = { wch: 12 };
        }
        
        XLSX.utils.book_append_sheet(workbook, itemSheet, 'Detalle Items');
        console.log('✅ Hoja de Detalle Items creada exitosamente');
      } else {
        console.log('⚠️ No hay items detallados para incluir');
      }
    }

    // ✅ HOJA 5: Estadísticas (MEJORADA)
    if (exportData.statistics) {
      const statisticsData = [['ESTADÍSTICAS DEL REPORTE'], ['']];

      // Top Clientes
      if (exportData.statistics.topCustomers && exportData.statistics.topCustomers.length > 0) {
        statisticsData.push(['📊 TOP CLIENTES'], ['']);
        statisticsData.push(['Cliente', 'RUT', 'Transacciones', 'Monto Total', 'Promedio', 'Porcentaje', 'Última Transacción']);
        
        exportData.statistics.topCustomers.forEach((customer: any) => {
          statisticsData.push([
            customer.customerName,
            customer.customerRut,
            customer.transactionCount.toString(),
            customer.totalAmount,
            customer.averageOrderValue,
            customer.percentage.toFixed(2) + '%',
            customer.lastTransactionDate ? new Date(customer.lastTransactionDate).toLocaleDateString('es-CL') : 'N/A'
          ]);
        });
        statisticsData.push(['']);
      }

      // Top Proveedores
      if (exportData.statistics.topSuppliers && exportData.statistics.topSuppliers.length > 0) {
        statisticsData.push(['📈 TOP PROVEEDORES'], ['']);
        statisticsData.push(['Proveedor', 'RUT', 'Transacciones', 'Monto Total', 'Promedio', 'Porcentaje', 'Última Transacción']);
        
        exportData.statistics.topSuppliers.forEach((supplier: any) => {
          statisticsData.push([
            supplier.supplierName,
            supplier.supplierRut,
            supplier.transactionCount.toString(),
            supplier.totalAmount,
            supplier.averageOrderValue,
            supplier.percentage.toFixed(2) + '%',
            supplier.lastTransactionDate ? new Date(supplier.lastTransactionDate).toLocaleDateString('es-CL') : 'N/A'
          ]);
        });
        statisticsData.push(['']);
      }

      // Top Productos
      if (exportData.statistics.topProducts && exportData.statistics.topProducts.length > 0) {
        statisticsData.push(['🏆 TOP PRODUCTOS'], ['']);
        statisticsData.push(['Código', 'Producto', 'Categoría', 'Ventas', 'Compras', 'Monto Ventas', 'Monto Compras', 'Margen Promedio']);
        
        exportData.statistics.topProducts.forEach((product: any) => {
          statisticsData.push([
            product.productCode,
            product.productName,
            product.category,
            product.salesCount.toString(),
            product.purchasesCount.toString(),
            product.totalSalesAmount,
            product.totalPurchasesAmount,
            product.averageMargin ? product.averageMargin.toFixed(2) + '%' : 'N/A'
          ]);
        });
        statisticsData.push(['']);
      }

      // Top Categorías
      if (exportData.statistics.topCategories && exportData.statistics.topCategories.length > 0) {
        statisticsData.push(['📂 TOP CATEGORÍAS'], ['']);
        statisticsData.push(['Categoría', 'Transacciones', 'Monto Total', 'Cantidad', 'Productos', 'Promedio', 'Porcentaje']);
        
        exportData.statistics.topCategories.forEach((category: any) => {
          statisticsData.push([
            category.category,
            category.transactionCount.toString(),
            category.totalAmount,
            category.totalQuantity.toString(),
            category.productsCount ? category.productsCount.toString() : 'N/A',
            category.averageAmount,
            category.percentage.toFixed(2) + '%'
          ]);
        });
      }

      const statisticsSheet = XLSX.utils.aoa_to_sheet(statisticsData);
      
      // ✅ Aplicar formato (CORREGIDO)
      if (!statisticsSheet['!cols']) {
        statisticsSheet['!cols'] = [];
      }
      const statsCols = statisticsSheet['!cols'];
      if (statsCols) {
        statsCols[0] = { wch: 25 };
        statsCols[1] = { wch: 15 };
        statsCols[2] = { wch: 12 };
        statsCols[3] = { wch: 12 };
        statsCols[4] = { wch: 12 };
        statsCols[5] = { wch: 12 };
        statsCols[6] = { wch: 12 };
      }
      
      XLSX.utils.book_append_sheet(workbook, statisticsSheet, 'Estadísticas');
    }

    // ✅ Generar nombre de archivo mejorado
    const timestamp = new Date().toISOString().split('T')[0];
    const timeString = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileName = `${exportData.reportInfo.code}_${timestamp}_${timeString}.xlsx`;
    
    // ✅ Descargar archivo
    XLSX.writeFile(workbook, fileName);
    
    console.log('✅ Reporte Excel descargado exitosamente:', fileName);
    console.log('📊 Hojas incluidas:', workbook.SheetNames);

  } catch (error) {
    console.error('❌ Error generando archivo Excel:', error);
    throw new Error('Error al generar el archivo Excel. Por favor, inténtalo de nuevo.');
  }
};

/**
 * ✅ NUEVO: Descargar reporte como PDF COMPLETAMENTE RENOVADO CON TODA LA INFORMACIÓN
 */
export const downloadReportAsPDF = async (exportData: any) => {
  try {
    console.log('📄 Iniciando generación de PDF completo...');
    
    // ✅ Verificaciones de librerías
    if (typeof jsPDF === 'undefined') {
      throw new Error('jsPDF no está disponible. Verifica que la librería esté instalada.');
    }

    const doc = new jsPDF();
    console.log('📄 jsPDF inicializado correctamente');
    
    // ✅ Configuración inicial
    const margin = 15;
    let yPosition = margin;
    const pageHeight = doc.internal.pageSize.height;
    const usableHeight = pageHeight - (margin * 2);
    
    // ✅ Función auxiliar para agregar nueva página si es necesario
    const checkPageBreak = (neededSpace: number = 20) => {
      if (yPosition + neededSpace > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };

    // ✅ Función para agregar texto con wrap automático
    const addWrappedText = (text: string, x: number, fontSize: number = 10, maxWidth: number = 180) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      for (let i = 0; i < lines.length; i++) {
        checkPageBreak();
        doc.text(lines[i], x, yPosition);
        yPosition += fontSize === 10 ? 6 : fontSize * 0.6;
      }
    };

    // ✅ PÁGINA 1: PORTADA Y INFORMACIÓN BÁSICA
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    addWrappedText(exportData.reportInfo.title || 'Reporte de Transacciones', margin, 20);
    yPosition += 10;
    
    // Información básica del reporte
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    const basicInfo = [
      `Código: ${exportData.reportInfo.code || 'N/A'}`,
      `Tipo: ${exportData.reportInfo.type || 'N/A'}`,
      `Período: ${exportData.reportInfo.period || 'N/A'}`,
      `Generado: ${exportData.reportInfo.generatedAt || 'N/A'}`,
      `Por: ${exportData.reportInfo.generatedBy || 'N/A'}`,
      `Descargado: ${new Date().toLocaleString('es-CL')}`,
      `Tipo de descarga: ${exportData.reportInfo.downloadType || 'Standard'}`
    ];

    basicInfo.forEach(info => {
      checkPageBreak();
      doc.text(info, margin, yPosition);
      yPosition += 7;
    });
    
    yPosition += 15;

    // ✅ SECCIÓN 2: RESUMEN EJECUTIVO COMPLETO
    if (exportData.summary) {
      checkPageBreak(30);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN EJECUTIVO', margin, yPosition);
      yPosition += 12;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      // Datos generales
      const summaryInfo = [
        `Total de Transacciones: ${formatNumber(exportData.summary.totalTransactions || 0)}`,
        `Monto Total: ${formatCurrency(exportData.summary.totalAmount || 0)}`,
        `Promedio por Transacción: ${formatCurrency(exportData.summary.averageTransactionAmount || 0)}`,
        `Total de Items: ${formatNumber(exportData.summary.totalItems || 0)}`,
        `Cantidad Total: ${formatNumber(exportData.summary.totalQuantity || 0)}`
      ];

      summaryInfo.forEach(info => {
        checkPageBreak();
        doc.text(info, margin, yPosition);
        yPosition += 6;
      });

      yPosition += 8;

      // Resumen de ventas
      if (exportData.summary.salesSummary) {
        checkPageBreak(15);
        doc.setFont('helvetica', 'bold');
        doc.text('VENTAS:', margin, yPosition);
        yPosition += 7;
        doc.setFont('helvetica', 'normal');
        
        const salesInfo = [
          `  • Cantidad: ${formatNumber(exportData.summary.salesSummary.count || 0)}`,
          `  • Monto Total: ${formatCurrency(exportData.summary.salesSummary.totalAmount || 0)}`,
          `  • Promedio: ${formatCurrency(exportData.summary.salesSummary.averageAmount || 0)}`
        ];
        
        salesInfo.forEach(info => {
          checkPageBreak();
          doc.text(info, margin, yPosition);
          yPosition += 6;
        });
        yPosition += 5;
      }

      // Resumen de compras
      if (exportData.summary.purchasesSummary) {
        checkPageBreak(15);
        doc.setFont('helvetica', 'bold');
        doc.text('COMPRAS:', margin, yPosition);
        yPosition += 7;
        doc.setFont('helvetica', 'normal');
        
        const purchasesInfo = [
          `  • Cantidad: ${formatNumber(exportData.summary.purchasesSummary.count || 0)}`,
          `  • Monto Total: ${formatCurrency(exportData.summary.purchasesSummary.totalAmount || 0)}`,
          `  • Promedio: ${formatCurrency(exportData.summary.purchasesSummary.averageAmount || 0)}`
        ];
        
        purchasesInfo.forEach(info => {
          checkPageBreak();
          doc.text(info, margin, yPosition);
          yPosition += 6;
        });
        yPosition += 5;
      }

      // Tendencias si existen
      if (exportData.summary.trends) {
        checkPageBreak(20);
        doc.setFont('helvetica', 'bold');
        doc.text('TENDENCIAS:', margin, yPosition);
        yPosition += 7;
        doc.setFont('helvetica', 'normal');
        
        const trendsInfo = [
          `  • Promedio Diario: ${formatCurrency(exportData.summary.trends.dailyAverage || 0)}`,
          `  • Promedio Semanal: ${formatCurrency(exportData.summary.trends.weeklyAverage || 0)}`,
          `  • Promedio Mensual: ${formatCurrency(exportData.summary.trends.monthlyAverage || 0)}`,
          `  • Tasa de Crecimiento: ${(exportData.summary.trends.growthRate || 0).toFixed(2)}%`
        ];
        
        trendsInfo.forEach(info => {
          checkPageBreak();
          doc.text(info, margin, yPosition);
          yPosition += 6;
        });
      }
    }

    // ✅ SECCIÓN 3: TABLA DE TRANSACCIONES DETALLADA (MEJORADA)
    if (exportData.transactions && exportData.transactions.length > 0) {
      doc.addPage();
      yPosition = margin;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DE TRANSACCIONES', margin, yPosition);
      yPosition += 15;

      // Mostrar más transacciones (hasta 50 en lugar de 20)
      const maxTransactions = 50;
      const displayTransactions = exportData.transactions.slice(0, maxTransactions);
      
      // ✅ Verificar que autoTable esté disponible
      if (doc.autoTable && typeof doc.autoTable === 'function') {
        try {
          const tableData = displayTransactions.map((transaction: any) => {
            let dateStr = 'N/A';
            try {
              if (transaction.transactionDate) {
                const date = transaction.transactionDate instanceof Date ? 
                  transaction.transactionDate : 
                  new Date(transaction.transactionDate);
                if (!isNaN(date.getTime())) {
                  dateStr = date.toLocaleDateString('es-CL');
                }
              }
            } catch (e) {
              console.warn('Error convirtiendo fecha:', e);
            }

            return [
              String(transaction.code || 'N/A').substring(0, 12),
              transaction.type === 'sale' ? 'Venta' : 'Compra',
              dateStr,
              String(transaction.counterparty?.name || 'N/A').substring(0, 20),
              formatCurrency(Number(transaction.totalAmount) || 0),
              String(transaction.items?.length || 0)
            ];
          });

          doc.autoTable({
            startY: yPosition,
            head: [['Código', 'Tipo', 'Fecha', 'Contraparte', 'Monto', 'Items']],
            body: tableData,
            styles: { 
              fontSize: 8,
              cellPadding: 2,
              overflow: 'linebreak',
              halign: 'left'
            },
            headStyles: { 
              fillColor: [41, 128, 185],
              textColor: 255,
              fontStyle: 'bold',
              fontSize: 9
            },
            alternateRowStyles: {
              fillColor: [248, 249, 250]
            },
            columnStyles: {
              0: { cellWidth: 25 },  // Código
              1: { cellWidth: 20 },  // Tipo  
              2: { cellWidth: 25 },  // Fecha
              3: { cellWidth: 40 },  // Contraparte
              4: { cellWidth: 30, halign: 'right' },   // Monto
              5: { cellWidth: 15, halign: 'center' }   // Items
            },
            margin: { left: margin, right: margin },
            theme: 'striped'
          });
          
          // Obtener posición final de la tabla
          const finalY = (doc as any).lastAutoTable?.finalY || yPosition + 50;
          yPosition = finalY + 10;
          
          // Nota si hay más transacciones
          if (exportData.transactions.length > maxTransactions) {
            checkPageBreak(15);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text(`Nota: Se muestran las primeras ${maxTransactions} transacciones de ${exportData.transactions.length} totales.`, margin, yPosition);
            yPosition += 6;
            doc.text('Para ver todas las transacciones, descarga el archivo Excel.', margin, yPosition);
            yPosition += 10;
          }
          
        } catch (tableError) {
          console.error('Error generando tabla:', tableError);
          doc.setFontSize(10);
          doc.text('Error generando tabla de transacciones. Ver archivo Excel para datos completos.', margin, yPosition);
          yPosition += 10;
        }
      } else {
        // Fallback sin autoTable
        doc.setFontSize(10);
        doc.text('Primeras 10 transacciones:', margin, yPosition);
        yPosition += 8;
        
        displayTransactions.slice(0, 10).forEach((transaction: any, index: number) => {
          checkPageBreak();
          const line = `${index + 1}. ${transaction.code} - ${transaction.type === 'sale' ? 'Venta' : 'Compra'} - ${formatCurrency(transaction.totalAmount || 0)}`;
          doc.text(line, margin, yPosition);
          yPosition += 6;
        });
      }
    }

    // ✅ SECCIÓN 4: ESTADÍSTICAS DETALLADAS
    if (exportData.statistics) {
      doc.addPage();
      yPosition = margin;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTADÍSTICAS DETALLADAS', margin, yPosition);
      yPosition += 15;

      // Top Clientes
      if (exportData.statistics.topCustomers && exportData.statistics.topCustomers.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('TOP CLIENTES', margin, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        exportData.statistics.topCustomers.slice(0, 10).forEach((customer: any, index: number) => {
          checkPageBreak(12);
          const info = `${index + 1}. ${customer.customerName} (${customer.customerRut})`;
          doc.text(info, margin, yPosition);
          yPosition += 6;
          doc.text(`   Transacciones: ${formatNumber(customer.transactionCount)} | Monto: ${formatCurrency(customer.totalAmount)}`, margin + 5, yPosition);
          yPosition += 6;
          doc.text(`   Promedio: ${formatCurrency(customer.averageOrderValue)} | Participación: ${customer.percentage.toFixed(2)}%`, margin + 5, yPosition);
          yPosition += 8;
        });
      }

      // Top Proveedores
      if (exportData.statistics.topSuppliers && exportData.statistics.topSuppliers.length > 0) {
        checkPageBreak(20);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('TOP PROVEEDORES', margin, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        exportData.statistics.topSuppliers.slice(0, 10).forEach((supplier: any, index: number) => {
          checkPageBreak(12);
          const info = `${index + 1}. ${supplier.supplierName} (${supplier.supplierRut})`;
          doc.text(info, margin, yPosition);
          yPosition += 6;
          doc.text(`   Transacciones: ${formatNumber(supplier.transactionCount)} | Monto: ${formatCurrency(supplier.totalAmount)}`, margin + 5, yPosition);
          yPosition += 6;
          doc.text(`   Promedio: ${formatCurrency(supplier.averageOrderValue)} | Participación: ${supplier.percentage.toFixed(2)}%`, margin + 5, yPosition);
          yPosition += 8;
        });
      }

      // Top Productos
      if (exportData.statistics.topProducts && exportData.statistics.topProducts.length > 0) {
        checkPageBreak(20);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('TOP PRODUCTOS', margin, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        exportData.statistics.topProducts.slice(0, 15).forEach((product: any, index: number) => {
          checkPageBreak(10);
          const info = `${index + 1}. ${product.productCode} - ${product.productName}`;
          doc.text(info, margin, yPosition);
          yPosition += 6;
          doc.text(`   Categoría: ${product.category} | Ventas: ${product.salesCount} | Compras: ${product.purchasesCount}`, margin + 5, yPosition);
          yPosition += 6;
          doc.text(`   Monto Ventas: ${formatCurrency(product.totalSalesAmount)} | Monto Compras: ${formatCurrency(product.totalPurchasesAmount)}`, margin + 5, yPosition);
          yPosition += 8;
        });
      }

      // Top Categorías
      if (exportData.statistics.topCategories && exportData.statistics.topCategories.length > 0) {
        checkPageBreak(20);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('TOP CATEGORIAS', margin, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        exportData.statistics.topCategories.forEach((category: any, index: number) => {
          checkPageBreak(8);
          const info = `${index + 1}. ${category.category}`;
          doc.text(info, margin, yPosition);
          yPosition += 6;
          doc.text(`   Transacciones: ${formatNumber(category.transactionCount)} | Monto: ${formatCurrency(category.totalAmount)} | Participación: ${category.percentage.toFixed(2)}%`, margin + 5, yPosition);
          yPosition += 8;
        });
      }
    }

    // ✅ Nota final
    doc.addPage();
    yPosition = margin;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN ADICIONAL', margin, yPosition);
    yPosition += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const finalNotes = [
      '• Este PDF contiene un resumen ejecutivo del reporte completo.',
      '• Para datos completos y análisis detallado, descarga el archivo Excel.',
      '• Los montos están expresados en pesos chilenos (CLP).',
      '• Las fechas están en formato DD/MM/AAAA.',
      '• Este documento fue generado automáticamente por el sistema.'
    ];

    finalNotes.forEach(note => {
      checkPageBreak();
      doc.text(note, margin, yPosition);
      yPosition += 7;
    });

    // ✅ Descargar PDF
    const timestamp = new Date().toISOString().split('T')[0];
    const timeString = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileName = `${(exportData.reportInfo.code || 'reporte').replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}_${timeString}.pdf`;
    
    console.log('💾 Guardando PDF:', fileName);
    doc.save(fileName);
    
    console.log('✅ PDF completo descargado exitosamente:', fileName);

  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    
    let errorMessage = 'Error al generar el archivo PDF.';
    
    if (error instanceof Error) {
      if (error.message.includes('jsPDF')) {
        errorMessage += ' La librería de PDF no está disponible.';
      } else if (error.message.includes('autoTable')) {
        errorMessage += ' Error en la generación de tablas.';
      } else {
        errorMessage += ` Detalles: ${error.message}`;
      }
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * ✅ Función de validación de datos para exportación (MEJORADA)
 */
export const validateReportDataForExport = (report: TransactionReport): boolean => {
  console.log('🔍 Validando datos para exportación:', {
    id: report.id,
    hasTransactionData: !!report.transactionData,
    transactionDataLength: report.transactionData?.length || 0,
    hasSummary: !!report.summary,
    hasStatistics: !!report.statistics,
    hasFilters: !!report.filters,
    summaryTotalTransactions: report.summary?.totalTransactions || 0
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
 * ✅ Función para exportar datos específicos (MEJORADA)
 */
export const exportCustomData = async (
  data: any[], 
  headers: string[], 
  fileName: string,
  format: 'excel' | 'csv' = 'excel'
) => {
  try {
    console.log('📊 Exportando datos personalizados:', { 
      records: data.length, 
      format, 
      fileName 
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    // ✅ Aplicar formato automático a las columnas (CORREGIDO)
    if (!worksheet['!cols']) {
      worksheet['!cols'] = [];
    }
    
    // Asegurar que !cols existe antes de usarlo
    const cols = worksheet['!cols'];
    if (cols) {
      headers.forEach((_, index) => {
        cols[index] = { wch: 15 }; // Ancho base
      });
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

    const timestamp = new Date().toISOString().split('T')[0];
    const fileExtension = format === 'excel' ? '.xlsx' : '.csv';
    const fullFileName = `${fileName}_${timestamp}${fileExtension}`;

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