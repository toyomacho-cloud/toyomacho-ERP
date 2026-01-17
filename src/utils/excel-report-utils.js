import * as XLSX from 'xlsx';

/**
 * Generates an Excel report with historical movements data
 * @param {Array} records - Filtered records to export
 * @param {Object} summary - Summary statistics
 * @param {Object} dateRange - Date range filter { dateFrom, dateTo }
 */
export const generateReportExcel = (records, summary, dateRange) => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Format date for filename
    const today = new Date().toLocaleDateString('es-VE').replace(/\//g, '-');

    // ============ SHEET 1: Movimientos ============
    const movementsData = records.map(r => ({
        'Fecha': formatDateForExcel(r.date),
        'Tipo': r.type,
        'SKU': r.sku,
        'Producto': r.productName,
        'Cantidad': r.quantity,
        'Precio Unitario ($)': parseFloat(r.unitPrice.toFixed(2)),
        'Subtotal ($)': parseFloat(r.subtotal.toFixed(2)),
        'IVA 16% ($)': parseFloat(r.iva.toFixed(2)),
        'Total ($)': parseFloat(r.total.toFixed(2)),
        'Proveedor': r.provider,
        'Motivo': r.reason,
        'Usuario': r.user,
        'Estado': translateStatus(r.status)
    }));

    const wsMovements = XLSX.utils.json_to_sheet(movementsData);

    // Set column widths
    wsMovements['!cols'] = [
        { wch: 18 }, // Fecha
        { wch: 10 }, // Tipo
        { wch: 15 }, // SKU
        { wch: 35 }, // Producto
        { wch: 10 }, // Cantidad
        { wch: 16 }, // Precio Unitario
        { wch: 14 }, // Subtotal
        { wch: 12 }, // IVA
        { wch: 12 }, // Total
        { wch: 20 }, // Proveedor
        { wch: 30 }, // Motivo
        { wch: 15 }, // Usuario
        { wch: 12 }, // Estado
    ];

    XLSX.utils.book_append_sheet(wb, wsMovements, 'Movimientos');

    // ============ SHEET 2: Resumen ============
    const summaryData = [
        ['REPORTE DE MOVIMIENTOS DE ALMACÉN'],
        [''],
        ['Período:', dateRange.dateFrom || 'Inicio', 'hasta', dateRange.dateTo || 'Hoy'],
        ['Fecha de generación:', today],
        [''],
        ['RESUMEN'],
        [''],
        ['Concepto', 'Cantidad', 'Valor ($)'],
        ['Total Entradas', summary.totalEntradas, summary.valorEntradas.toFixed(2)],
        ['Total Salidas', summary.totalSalidas, summary.valorSalidas.toFixed(2)],
        ['Total Ajustes', summary.totalAjustes, '-'],
        ['IVA Total (16%)', '-', summary.ivaTotal.toFixed(2)],
        [''],
        ['Total Registros:', records.length]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    // ============ SHEET 3: Entradas ============
    const entradasData = records
        .filter(r => r.type === 'Entrada')
        .map(r => ({
            'Fecha': formatDateForExcel(r.date),
            'SKU': r.sku,
            'Producto': r.productName,
            'Cantidad': r.quantity,
            'Costo Unitario ($)': parseFloat(r.unitPrice.toFixed(2)),
            'Subtotal ($)': parseFloat(r.subtotal.toFixed(2)),
            'IVA ($)': parseFloat(r.iva.toFixed(2)),
            'Total ($)': parseFloat(r.total.toFixed(2)),
            'Proveedor': r.provider,
            'Motivo': r.reason
        }));

    if (entradasData.length > 0) {
        const wsEntradas = XLSX.utils.json_to_sheet(entradasData);
        wsEntradas['!cols'] = [
            { wch: 18 }, { wch: 15 }, { wch: 35 }, { wch: 10 },
            { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
            { wch: 20 }, { wch: 30 }
        ];
        XLSX.utils.book_append_sheet(wb, wsEntradas, 'Entradas');
    }

    // ============ SHEET 4: Salidas ============
    const salidasData = records
        .filter(r => r.type === 'Salida')
        .map(r => ({
            'Fecha': formatDateForExcel(r.date),
            'SKU': r.sku,
            'Producto': r.productName,
            'Cantidad': r.quantity,
            'Precio Unitario ($)': parseFloat(r.unitPrice.toFixed(2)),
            'Subtotal ($)': parseFloat(r.subtotal.toFixed(2)),
            'IVA ($)': parseFloat(r.iva.toFixed(2)),
            'Total ($)': parseFloat(r.total.toFixed(2)),
            'Motivo': r.reason
        }));

    if (salidasData.length > 0) {
        const wsSalidas = XLSX.utils.json_to_sheet(salidasData);
        wsSalidas['!cols'] = [
            { wch: 18 }, { wch: 15 }, { wch: 35 }, { wch: 10 },
            { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
            { wch: 30 }
        ];
        XLSX.utils.book_append_sheet(wb, wsSalidas, 'Salidas');
    }

    // ============ SHEET 5: Ajustes ============
    const ajustesData = records
        .filter(r => r.type === 'Ajuste')
        .map(r => ({
            'Fecha': formatDateForExcel(r.date),
            'SKU': r.sku,
            'Producto': r.productName,
            'Cantidad Ajustada': r.quantity,
            'Motivo/Justificación': r.reason,
            'Usuario': r.user
        }));

    if (ajustesData.length > 0) {
        const wsAjustes = XLSX.utils.json_to_sheet(ajustesData);
        wsAjustes['!cols'] = [
            { wch: 18 }, { wch: 15 }, { wch: 35 }, { wch: 18 },
            { wch: 40 }, { wch: 15 }
        ];
        XLSX.utils.book_append_sheet(wb, wsAjustes, 'Ajustes');
    }

    // Generate and download file
    const fileName = `Reporte_Movimientos_${today}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

/**
 * Format date for Excel display
 */
const formatDateForExcel = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Translate status to Spanish
 */
const translateStatus = (status) => {
    switch (status) {
        case 'approved': return 'Aprobado';
        case 'pending': return 'Pendiente';
        case 'rejected': return 'Rechazado';
        default: return status || 'Aprobado';
    }
};
