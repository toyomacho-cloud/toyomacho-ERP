/**
 * Generador de PDF - ORDEN DE DESPACHO POR TRASLADO
 * 
 * Formato:
 * - Header: Logo empresa, nombre, RIF
 * - Titulo: ORDEN DE DESPACHO POR TRASLADO
 * - Datos: Numero control, almacen origen, destino, fecha, responsable
 * - Tabla: Codigo | Descripcion | Cantidad (SIN PRECIOS)
 * - Footer: Firmas Despachado por / Recibido por
 */
import jsPDF from 'jspdf';

/**
 * Generar y descargar PDF de Orden de Despacho
 * @param {Object} transfer - Datos del traslado
 * @param {Object} empresa - Datos de la empresa { nombre, rif, logo_url }
 */
export function generarOrdenDespacho(transfer, empresa = {}) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
    });

    const pageWidth = 215.9;
    const pageHeight = 279.4;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    const nombreEmpresa = empresa.nombre || 'TOYOMACHO';
    const rifEmpresa = empresa.rif || '';

    // ========== LOGO ==========
    // Si hay logo_url, se intentara cargar. Si no, se usa texto
    const drawHeader = () => {
        // Rectangulo header
        doc.setFillColor(30, 30, 50);
        doc.rect(margin, y, contentWidth, 22, 'F');

        // Nombre empresa
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(nombreEmpresa.toUpperCase(), margin + 5, y + 9);

        // RIF
        if (rifEmpresa) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`RIF: ${rifEmpresa}`, margin + 5, y + 16);
        }

        // Instagram / contacto
        doc.setFontSize(8);
        doc.text('@toyomacho', margin + 5, y + 20);

        // Numero de control (derecha)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(transfer.transfer_number || 'TRS-0000', pageWidth - margin - 5, y + 9, { align: 'right' });

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const fechaHora = new Date(transfer.created_at || Date.now()).toLocaleString('es-VE', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
        doc.text(fechaHora, pageWidth - margin - 5, y + 15, { align: 'right' });

        y += 26;
    };

    drawHeader();

    // ========== TITULO ==========
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('ORDEN DE DESPACHO POR TRASLADO', pageWidth / 2, y, { align: 'center' });
    y += 4;

    // Linea decorativa
    doc.setDrawColor(50, 100, 200);
    doc.setLineWidth(0.8);
    doc.line(margin + 30, y, pageWidth - margin - 30, y);
    y += 10;

    // ========== DATOS DEL TRASLADO ==========
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);

    const drawField = (label, value, xPos, yPos) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, xPos, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value || 'N/A'), xPos + doc.getTextWidth(`${label}: `) + 1, yPos);
    };

    // Fila 1
    drawField('Almacen Origen', transfer.almacen_origen, margin, y);
    y += 6;

    drawField('Almacen Destino', transfer.almacen_destino, margin, y);
    y += 6;

    const fechaStr = transfer.fecha
        ? new Date(transfer.fecha + 'T12:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })
        : new Date().toLocaleDateString('es-VE');

    drawField('Fecha', fechaStr, margin, y);
    drawField('Hora', new Date(transfer.created_at || Date.now()).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }), margin + 100, y);
    y += 6;

    drawField('Responsable Despacho', transfer.responsable, margin, y);
    y += 6;

    if (transfer.observaciones) {
        drawField('Observaciones', transfer.observaciones, margin, y);
        y += 6;
    }

    y += 4;

    // ========== TABLA DE ITEMS ==========
    const items = transfer.items || [];

    // Header de la tabla
    const colX = {
        num: margin,
        codigo: margin + 10,
        descripcion: margin + 45,
        cantidad: pageWidth - margin - 20
    };
    const colWidths = {
        num: 10,
        codigo: 35,
        descripcion: contentWidth - 65,
        cantidad: 20
    };

    // Fondo header tabla
    doc.setFillColor(40, 40, 60);
    doc.rect(margin, y, contentWidth, 8, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('#', colX.num + 3, y + 5.5);
    doc.text('CODIGO', colX.codigo + 2, y + 5.5);
    doc.text('DESCRIPCION', colX.descripcion + 2, y + 5.5);
    doc.text('CANT.', colX.cantidad + 2, y + 5.5);
    y += 8;

    // Filas de la tabla
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);

    items.forEach((item, index) => {
        const isEven = index % 2 === 0;
        if (isEven) {
            doc.setFillColor(245, 245, 250);
            doc.rect(margin, y, contentWidth, 7, 'F');
        }

        // Borde inferior
        doc.setDrawColor(220, 220, 230);
        doc.setLineWidth(0.2);
        doc.line(margin, y + 7, pageWidth - margin, y + 7);

        doc.setFontSize(8);
        doc.text(String(index + 1), colX.num + 3, y + 5);
        doc.text(String(item.sku || 'N/A'), colX.codigo + 2, y + 5);

        // Descripcion (truncar si es muy larga)
        const desc = String(item.descripcion || item.product_name || 'N/A');
        const maxDescWidth = colWidths.descripcion - 4;
        const truncDesc = doc.getTextWidth(desc) > maxDescWidth
            ? desc.substring(0, Math.floor(desc.length * maxDescWidth / doc.getTextWidth(desc))) + '...'
            : desc;
        doc.text(truncDesc, colX.descripcion + 2, y + 5);

        doc.setFont('helvetica', 'bold');
        doc.text(String(item.cantidad || item.quantity || 0), colX.cantidad + 8, y + 5, { align: 'center' });
        doc.setFont('helvetica', 'normal');

        y += 7;

        // Saltar pagina si es necesario
        if (y > pageHeight - 60) {
            doc.addPage();
            y = margin;
        }
    });

    // Total unidades
    doc.setFillColor(40, 40, 60);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL', colX.descripcion + 2, y + 5);
    const totalUnidades = items.reduce((s, i) => s + (i.cantidad || i.quantity || 0), 0);
    doc.text(String(totalUnidades), colX.cantidad + 8, y + 5, { align: 'center' });
    y += 12;

    // ========== NOTAS ==========
    if (transfer.observaciones) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text(`Nota: ${transfer.observaciones}`, margin, y);
        y += 8;
    }

    // ========== FIRMAS ==========
    // Asegurar espacio para firmas
    if (y > pageHeight - 50) {
        doc.addPage();
        y = margin + 10;
    } else {
        y = Math.max(y + 10, pageHeight - 55);
    }

    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const firmaY = y;
    const firma1X = margin + 10;
    const firma2X = pageWidth / 2 + 10;
    const firmaWidth = 70;

    // Firma 1 - Despachado por
    doc.line(firma1X, firmaY, firma1X + firmaWidth, firmaY);
    doc.text('Despachado por:', firma1X, firmaY + 5);
    if (transfer.responsable) {
        doc.setFont('helvetica', 'bold');
        doc.text(transfer.responsable, firma1X, firmaY + 10);
        doc.setFont('helvetica', 'normal');
    }
    doc.setFontSize(7);
    doc.text('C.I.: ___________________', firma1X, firmaY + 15);

    // Firma 2 - Recibido/Transportado por
    doc.setFontSize(9);
    doc.line(firma2X, firmaY, firma2X + firmaWidth, firmaY);
    doc.text('Recibido/Transportado por:', firma2X, firmaY + 5);
    doc.setFontSize(7);
    doc.text('Nombre: ___________________', firma2X, firmaY + 10);
    doc.text('C.I.: ___________________', firma2X, firmaY + 15);

    // ========== FOOTER ==========
    const footerY = pageHeight - 10;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text(`${nombreEmpresa} — Documento generado el ${new Date().toLocaleString('es-VE')}`, pageWidth / 2, footerY, { align: 'center' });

    // ========== LINK LOGO (si existe) ==========
    if (empresa.logo_url) {
        try {
            // Intentar agregar logo como imagen (funciona si es base64 o URL local cargada)
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = empresa.logo_url;
            // jsPDF addImage es sincrono con base64, para URLs externas necesitariamos precargar
            // Por ahora se usa el texto del header
        } catch (e) {
            console.warn('No se pudo cargar el logo:', e);
        }
    }

    // ========== DESCARGAR ==========
    doc.save(`Orden_Despacho_${transfer.transfer_number || 'TRS'}.pdf`);
    return doc;
}
