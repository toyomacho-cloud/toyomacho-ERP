import React from 'react';
import { Printer, Download, RefreshCw, Building, User, FileText, Calendar, DollarSign } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const InvoiceDocument = ({
    sale,
    documentNumber,
    onNewSale,
    onPrint,
    companyName = 'Repuestos Toyota, C.A.'
}) => {
    const {
        items = [],
        customer,
        documentType,
        paymentType,
        creditDays,
        dueDate,
        subtotal,
        iva,
        total,
        totalBs,
        exchangeRate,
        date
    } = sale || {};

    const isCredit = paymentType === 'credito';
    const isFactura = documentType === 'factura';
    const formattedDate = date ? new Date(date).toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');
    const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('es-VE') : null;

    // Export to PDF
    const exportToPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header - Company
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(companyName, 14, 20);

        // Document type and number
        doc.setFontSize(14);
        const docTitle = isFactura ? 'FACTURA' : 'NOTA DE ENTREGA';
        doc.text(`${docTitle} Nro: ${documentNumber || '0000001'}`, pageWidth - 14, 20, { align: 'right' });

        // Date
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${formattedDate}`, pageWidth - 14, 28, { align: 'right' });

        // Payment type
        const paymentLabel = isCredit ? `CRÉDITO (${creditDays} días) - Vence: ${formattedDueDate}` : 'CONTADO';
        doc.text(`Tipo: ${paymentLabel}`, pageWidth - 14, 34, { align: 'right' });

        // Line
        doc.setLineWidth(0.5);
        doc.line(14, 40, pageWidth - 14, 40);

        // Customer data
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('DATOS DEL CLIENTE:', 14, 50);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        if (customer) {
            doc.text(`Nombre: ${customer.name || 'N/A'}`, 14, 58);
            doc.text(`RIF/CI: ${customer.type || 'V'}-${customer.rif || 'S/I'}`, 14, 64);
            doc.text(`Teléfono: ${customer.phone || 'N/A'}`, 14, 70);
            if (customer.address) {
                doc.text(`Dirección: ${customer.address}`, 14, 76);
            }
        } else {
            doc.text('Cliente: Venta Rápida (Cliente Casual)', 14, 58);
        }

        // Products table
        const tableStartY = customer?.address ? 85 : 75;

        const tableData = items.map(item => [
            item.reference || item.sku || '-',
            item.description,
            item.qty.toString(),
            `$${item.priceUSD.toFixed(2)}`,
            `$${(item.priceUSD * item.qty).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: tableStartY,
            head: [['Ref.', 'Descripción', 'Cant.', 'P/U', 'Total']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [66, 66, 66],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 25, halign: 'right' },
                4: { cellWidth: 25, halign: 'right' }
            }
        });

        // Totals
        const finalY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(10);
        doc.text(`Subtotal:`, pageWidth - 60, finalY);
        doc.text(`$${subtotal?.toFixed(2) || '0.00'}`, pageWidth - 14, finalY, { align: 'right' });

        if (isFactura) {
            doc.text(`IVA (16%):`, pageWidth - 60, finalY + 6);
            doc.text(`$${iva?.toFixed(2) || '0.00'}`, pageWidth - 14, finalY + 6, { align: 'right' });
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const totalY = isFactura ? finalY + 14 : finalY + 8;
        doc.text(`TOTAL USD:`, pageWidth - 60, totalY);
        doc.text(`$${total?.toFixed(2) || '0.00'}`, pageWidth - 14, totalY, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`TOTAL Bs:`, pageWidth - 60, totalY + 6);
        doc.text(`Bs ${totalBs?.toFixed(2) || '0.00'}`, pageWidth - 14, totalY + 6, { align: 'right' });

        doc.setFontSize(8);
        doc.text(`Tasa: ${exchangeRate?.toFixed(2) || '0.00'} Bs/$`, pageWidth - 14, totalY + 12, { align: 'right' });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text('Documento generado por Sistema NOVA', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

        // Save
        const fileName = `${isFactura ? 'factura' : 'nota'}_${documentNumber || '0001'}_${customer?.name?.replace(/\s+/g, '_') || 'venta_rapida'}.pdf`;
        doc.save(fileName);
    };

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Document Preview */}
            <div className="glass-panel" style={{
                padding: '2rem',
                background: 'white',
                color: '#1a1a1a',
                fontFamily: 'Georgia, serif'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '2px solid #333',
                    paddingBottom: '1rem',
                    marginBottom: '1rem'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1a1a1a' }}>{companyName}</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            color: isFactura ? '#059669' : '#2563eb'
                        }}>
                            {isFactura ? 'FACTURA' : 'NOTA DE ENTREGA'}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                            Nro: {documentNumber || '0000001'}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>
                            Fecha: {formattedDate}
                        </div>
                        <div style={{
                            fontSize: '0.85rem',
                            marginTop: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            background: isCredit ? '#fef3c7' : '#d1fae5',
                            borderRadius: '4px',
                            display: 'inline-block'
                        }}>
                            {isCredit ? `CRÉDITO (${creditDays} días)` : 'CONTADO'}
                        </div>
                        {isCredit && formattedDueDate && (
                            <div style={{ fontSize: '0.8rem', color: '#b45309', marginTop: '0.25rem' }}>
                                Vence: {formattedDueDate}
                            </div>
                        )}
                    </div>
                </div>

                {/* Customer Info */}
                <div style={{
                    background: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#333' }}>
                        DATOS DEL CLIENTE
                    </div>
                    {customer ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <div><strong>Nombre:</strong> {customer.name}</div>
                            <div><strong>RIF/CI:</strong> {customer.type || 'V'}-{customer.rif || 'S/I'}</div>
                            <div><strong>Teléfono:</strong> {customer.phone || 'N/A'}</div>
                            {customer.address && (
                                <div style={{ gridColumn: 'span 2' }}><strong>Dirección:</strong> {customer.address}</div>
                            )}
                        </div>
                    ) : (
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>
                            Venta Rápida (Cliente Casual)
                        </div>
                    )}
                </div>

                {/* Products Table */}
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem'
                }}>
                    <thead>
                        <tr style={{ background: '#333', color: 'white' }}>
                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ref.</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Descripción</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Cant.</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right' }}>P/U</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{item.reference || item.sku || '-'}</td>
                                <td style={{ padding: '0.75rem' }}>{item.description}</td>
                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.qty}</td>
                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>${item.priceUSD.toFixed(2)}</td>
                                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                                    ${(item.priceUSD * item.qty).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    borderTop: '2px solid #333',
                    paddingTop: '1rem'
                }}>
                    <div style={{ width: '250px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Subtotal:</span>
                            <span>${subtotal?.toFixed(2) || '0.00'}</span>
                        </div>
                        {isFactura && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#b45309' }}>
                                <span>IVA (16%):</span>
                                <span>${iva?.toFixed(2) || '0.00'}</span>
                            </div>
                        )}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontWeight: 'bold',
                            fontSize: '1.2rem',
                            borderTop: '1px solid #333',
                            paddingTop: '0.5rem',
                            marginTop: '0.5rem'
                        }}>
                            <span>TOTAL USD:</span>
                            <span style={{ color: '#059669' }}>${total?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '0.95rem' }}>
                            <span>TOTAL Bs:</span>
                            <span>Bs {totalBs?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                            Tasa: {exchangeRate?.toFixed(2) || '0.00'} Bs/$
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '1.5rem',
                justifyContent: 'center'
            }}>
                <button onClick={onPrint} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Printer size={18} /> Imprimir
                </button>
                <button onClick={exportToPDF} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Download size={18} /> Descargar PDF
                </button>
                <button onClick={onNewSale} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={18} /> Nueva Venta
                </button>
            </div>
        </div>
    );
};

export default InvoiceDocument;
