import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate a professional quote/budget PDF
 * Updated: Validity 1 day
 */
export function generateQuotePDF(cart, clientData, exchangeRate) {
    const doc = new jsPDF();
    const quoteNumber = `PRE-${Date.now().toString().slice(-6)}`;
    const quoteDate = new Date().toLocaleDateString('es-VE');
    const validUntil = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toLocaleDateString('es-VE'); // 1 day

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESUPUESTO', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nº ${quoteNumber}`, 14, 27);
    doc.text(`Fecha: ${quoteDate}`, 14, 32);
    doc.text(`Válido hasta: ${validUntil}`, 14, 37);

    // Company Info
    doc.setFontSize(9);
    doc.text('TOYOMACHO', 150, 20);
    doc.text('@toyomacho', 150, 25);
    doc.text('0414-8972342', 150, 30);

    // Client Info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', 14, 50);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(clientData.name || 'N/A', 14, 56);
    if (clientData.phone) doc.text(`Teléfono: ${clientData.phone}`, 14, 61);
    if (clientData.email) doc.text(`Email: ${clientData.email}`, 14, 66);
    if (clientData.address) doc.text(`Dirección: ${clientData.address}`, 14, 71);

    // Products Table
    const startY = clientData.address ? 80 : 75;

    const tableColumns = ['#', 'Producto', 'Ref.', 'Cant.', 'P. Unit. (USD)', 'Total (USD)'];
    const tableRows = cart.map((item, index) => [
        (index + 1).toString(),
        item.description || 'N/A',
        item.reference || item.sku || 'N/A',
        item.quantity.toString(),
        `$${(item.amountUSD / item.quantity).toFixed(2)}`,
        `$${item.amountUSD.toFixed(2)}`
    ]);

    autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: startY,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 60 },
            2: { cellWidth: 30 },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 30, halign: 'right' },
            5: { cellWidth: 30, halign: 'right' }
        }
    });

    // Totals
    const finalY = doc.lastAutoTable.finalY + 10;
    const totalUSD = cart.reduce((sum, item) => sum + item.amountUSD, 0);
    const totalBs = totalUSD * exchangeRate;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SUBTOTAL USD:', 120, finalY);
    doc.text(`$${totalUSD.toFixed(2)}`, 180, finalY, { align: 'right' });

    doc.text('TOTAL Bs:', 120, finalY + 7);
    doc.text(`Bs ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 180, finalY + 7, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`(Tasa: Bs ${exchangeRate.toFixed(2)})`, 180, finalY + 12, { align: 'right' });

    // Terms and Conditions
    const termsY = finalY + 25;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Términos y Condiciones:', 14, termsY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const terms = [
        '• Presupuesto válido por 24 horas (1 día) desde la fecha de emisión.',
        '• Precios sujetos a cambios sin previo aviso.',
        '• Los productos están sujetos a disponibilidad en inventario.',
        '• Formas de pago: Efectivo, transferencia bancaria.',
        '• Tiempo de entrega: Inmediato (sujeto a disponibilidad).'
    ];

    terms.forEach((term, index) => {
        doc.text(term, 14, termsY + 7 + (index * 5));
    });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Gracias por su preferencia', 105, 280, { align: 'center' });

    return doc;
}

/**
 * Download quote PDF
 */
export function downloadQuotePDF(doc) {
    const filename = `presupuesto_${Date.now()}.pdf`;
    doc.save(filename);
}

/**
 * Generate sales report PDF for date range
 */
export function generateSalesReportPDF(sales, startDate, endDate) {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE VENTAS Y EGRESOS', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${new Date(startDate).toLocaleDateString('es-VE')} - ${new Date(endDate).toLocaleDateString('es-VE')}`, 14, 28);
    doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, 14, 34);

    // Filter sales by date range
    const filteredSales = sales.filter(sale => {
        const saleDate = sale.date;
        return saleDate >= startDate && saleDate <= endDate;
    });

    if (filteredSales.length === 0) {
        doc.setFontSize(12);
        doc.text('No hay ventas/egresos registrados en el período seleccionado.', 14, 50);
        return doc;
    }

    // Table Data
    const tableColumns = ['Fecha', 'Producto', 'Ref.', 'Cant.', 'USD', 'Bs', 'Pago'];
    const tableRows = filteredSales.map(sale => [
        new Date(sale.date).toLocaleDateString('es-VE'),
        sale.description || 'N/A',
        sale.reference || sale.sku || 'N/A',
        sale.quantity.toString(),
        `$${(sale.amountUSD || 0).toFixed(2)}`,
        `Bs ${(sale.amountBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        sale.paymentType === 'cash' ? 'Efectivo' : sale.paymentType === 'card' ? 'Tarjeta' : 'Transf.'
    ]);

    autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
        styles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 50 },
            2: { cellWidth: 25 },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 22, halign: 'right' },
            5: { cellWidth: 28, halign: 'right' },
            6: { cellWidth: 20, halign: 'center' }
        }
    });

    // Totals
    const finalY = doc.lastAutoTable.finalY + 10;
    const totalUSD = filteredSales.reduce((sum, sale) => sum + (sale.amountUSD || 0), 0);
    const totalBs = filteredSales.reduce((sum, sale) => sum + (sale.amountBs || 0), 0);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTALES:', 14, finalY);
    doc.text(`USD: $${totalUSD.toFixed(2)}`, 120, finalY);
    doc.text(`Bs: Bs ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 120, finalY + 8);

    // Summary
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de registros: ${filteredSales.length}`, 14, finalY + 20);

    return doc;
}

/**
 * Download sales report PDF
 */
export function downloadSalesReportPDF(doc) {
    const filename = `reporte_ventas_${Date.now()}.pdf`;
    doc.save(filename);
}
