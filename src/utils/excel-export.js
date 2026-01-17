import * as XLSX from 'xlsx';

/**
 * Exporta productos a un archivo Excel
 * @param {Array} products - Array de productos a exportar
 * @param {string} filename - Nombre del archivo (sin extensión)
 */
export const exportProductsToExcel = (products, filename = 'inventario') => {
    // Preparar datos para Excel
    const excelData = products.map(product => ({
        'SKU': product.sku || '',
        'Referencia': product.reference || '',
        'Descripción': product.description || '',
        'Categoría': product.category || '',
        'Marca': product.brand || '',
        'Ubicación': product.location || '',
        'Almacén': product.warehouse || '',
        'Unidad': product.unit || '',
        'Cantidad': product.quantity || 0,
        'Precio ($)': product.price || 0,
        'Estado': product.status || ''
    }));

    // Crear libro y hoja de trabajo
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');

    // Ajustar ancho de columnas
    const columnWidths = [
        { wch: 15 }, // SKU
        { wch: 20 }, // Referencia
        { wch: 40 }, // Descripción
        { wch: 15 }, // Categoría
        { wch: 15 }, // Marca
        { wch: 15 }, // Ubicación
        { wch: 15 }, // Almacén
        { wch: 10 }, // Unidad
        { wch: 10 }, // Cantidad
        { wch: 12 }, // Precio
        { wch: 12 }  // Estado
    ];
    worksheet['!cols'] = columnWidths;

    // Generar nombre con fecha
    const date = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}_${date}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(workbook, fullFilename);
};

/**
 * Exporta productos a un archivo CSV
 * @param {Array} products - Array de productos a exportar
 * @param {string} filename - Nombre del archivo (sin extensión)
 */
export const exportProductsToCSV = (products, filename = 'inventario') => {
    // Definir headers
    const headers = [
        'SKU',
        'Referencia',
        'Descripción',
        'Categoría',
        'Marca',
        'Ubicación',
        'Almacén',
        'Unidad',
        'Cantidad',
        'Precio ($)',
        'Estado'
    ];

    // Función para escapar valores CSV
    const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // Preparar filas de datos
    const rows = products.map(product => [
        escapeCSV(product.sku),
        escapeCSV(product.reference),
        escapeCSV(product.description),
        escapeCSV(product.category),
        escapeCSV(product.brand),
        escapeCSV(product.location),
        escapeCSV(product.warehouse),
        escapeCSV(product.unit),
        product.quantity || 0,
        product.price || 0,
        escapeCSV(product.status)
    ].join(','));

    // Crear contenido CSV con BOM para Excel
    const csvContent = '\ufeff' + [headers.join(','), ...rows].join('\n');

    // Crear blob y descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    // Generar nombre con fecha
    const date = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}_${date}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', fullFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
