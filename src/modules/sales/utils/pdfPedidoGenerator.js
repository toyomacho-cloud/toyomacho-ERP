/**
 * Generador de PDF para Pedidos/Ventas POS
 * Solo para uso en el modulo de ventas
 */
import jsPDF from 'jspdf';

/**
 * Formatear moneda USD
 */
const formatUSD = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
};

/**
 * Formatear moneda Bs
 */
const formatBs = (amount) => {
    return `Bs ${new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0)}`;
};

/**
 * Generar PDF de pedido
 * @param {Object} datosVenta - Datos de la venta
 * @param {Array} datosVenta.items - Items del carrito
 * @param {string} datosVenta.numeroDocumento - Numero del pedido
 * @param {Object} datosVenta.cliente - Cliente (puede ser null)
 * @param {number} datosVenta.subtotal - Subtotal en USD
 * @param {number} datosVenta.total - Total en USD
 * @param {number} datosVenta.totalBs - Total en Bs
 * @param {number} datosVenta.tasaCambio - Tasa de cambio
 * @param {string} datosVenta.tipoVenta - 'contado' o 'credito'
 * @param {number} datosVenta.diasCredito - Dias de credito (si aplica)
 */
export function generarPDFPedido(datosVenta) {
    const {
        items,
        numeroDocumento,
        cliente,
        subtotal,
        total,
        totalBs,
        tasaCambio,
        tipoVenta,
        diasCredito
    } = datosVenta;

    // Crear PDF tamano carta
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
    });

    const pageWidth = 215.9;
    const margin = 15;
    let y = margin;

    // ========== HEADER ==========
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TOYOMACHO', margin, y);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('@toyomacho', margin, y + 6);

    // Numero de pedido (derecha)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`PEDIDO ${numeroDocumento}`, pageWidth - margin, y, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const fecha = new Date().toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    doc.text(fecha, pageWidth - margin, y + 6, { align: 'right' });

    y += 20;

    // Linea separadora
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ========== CLIENTE ==========
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', margin, y);
    doc.setFont('helvetica', 'normal');

    if (cliente) {
        doc.text(cliente.name || cliente.nombre || 'Sin nombre', margin + 20, y);
        if (cliente.rif) {
            doc.text(`RIF: ${cliente.rif}`, margin + 100, y);
        }
        if (cliente.phone || cliente.telefono) {
            y += 5;
            doc.text(`Tel: ${cliente.phone || cliente.telefono}`, margin + 20, y);
        }
    } else {
        doc.text('VENTA RAPIDA (Sin cliente)', margin + 20, y);
    }

    y += 8;

    // Tipo de pago
    doc.setFont('helvetica', 'bold');
    doc.text('TIPO DE PAGO:', margin, y);
    doc.setFont('helvetica', 'normal');
    const tipoPagoTexto = tipoVenta === 'credito'
        ? `CREDITO (${diasCredito} dias)`
        : 'CONTADO';
    doc.text(tipoPagoTexto, margin + 35, y);

    y += 10;

    // Linea separadora
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ========== TABLA DE PRODUCTOS ==========
    // Header de tabla
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, pageWidth - margin * 2, 7, 'F');

    doc.text('CANT', margin + 2, y);
    doc.text('SKU', margin + 18, y);
    doc.text('DESCRIPCION', margin + 55, y);
    doc.text('P.UNIT', margin + 130, y);
    doc.text('TOTAL', margin + 160, y);

    y += 8;

    // Items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    items.forEach((item, index) => {
        // Alternar color de fondo
        if (index % 2 === 1) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, y - 3, pageWidth - margin * 2, 6, 'F');
        }

        const cantidad = item.cantidad || item.quantity || 1;
        const sku = item.sku || item.referencia || '-';
        const desc = item.descripcion || item.description || 'Sin descripcion';
        const precioUnit = item.precioUSD || item.unit_price || 0;
        const totalItem = precioUnit * cantidad;

        doc.text(String(cantidad), margin + 2, y);
        doc.text(sku.substring(0, 15), margin + 18, y);
        doc.text(desc.substring(0, 40), margin + 55, y);
        doc.text(formatUSD(precioUnit), margin + 130, y);
        doc.text(formatUSD(totalItem), margin + 160, y);

        y += 6;

        // Nueva pagina si es necesario
        if (y > 250) {
            doc.addPage();
            y = margin;
        }
    });

    y += 5;

    // Linea separadora
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ========== TOTALES ==========
    doc.setFontSize(10);

    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', margin + 120, y);
    doc.text(formatUSD(subtotal), margin + 160, y);
    y += 6;

    // Tasa de cambio
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Tasa: ${tasaCambio?.toFixed(2) || '0.00'} Bs/$`, margin + 120, y);
    y += 8;

    // Total USD
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL USD:', margin + 110, y);
    doc.text(formatUSD(total), margin + 160, y);
    y += 7;

    // Total Bs
    doc.setFontSize(11);
    doc.text('TOTAL Bs:', margin + 115, y);
    doc.text(formatBs(totalBs), margin + 160, y);

    y += 15;

    // ========== FOOTER ==========
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Gracias por su compra', pageWidth / 2, y, { align: 'center' });
    doc.text('TOYOMACHO - @toyomacho', pageWidth / 2, y + 5, { align: 'center' });

    return doc;
}

/**
 * Descargar PDF de pedido
 */
export function descargarPDFPedido(datosVenta) {
    const doc = generarPDFPedido(datosVenta);
    const filename = `pedido_${datosVenta.numeroDocumento}_${Date.now()}.pdf`;
    doc.save(filename);
    return filename;
}

export default {
    generarPDFPedido,
    descargarPDFPedido
};
