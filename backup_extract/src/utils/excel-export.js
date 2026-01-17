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
