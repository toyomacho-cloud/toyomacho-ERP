import React, { useMemo } from 'react';
import { X, FileText, Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const DailySalesModal = ({ isOpen, onClose, sales, products }) => {
    if (!isOpen) return null;

    // Filter sales for today (or current shift)
    const dailySales = useMemo(() => {
        const today = new Date().toLocaleDateString();
        return sales.filter(sale =>
            new Date(sale.createdAt).toLocaleDateString() === today
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [sales]);

    // Calculate totals
    const totals = useMemo(() => {
        return dailySales.reduce((acc, sale) => {
            acc.usd += parseFloat(sale.total) || 0;
            acc.bs += parseFloat(sale.totalBs) || 0;
            return acc;
        }, { usd: 0, bs: 0 });
    }, [dailySales]);

    // Export to PDF
    const exportPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text('Reporte de Ventas Diarias', 14, 20);

        doc.setFontSize(12);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
        doc.text(`Total Ventas: ${dailySales.length}`, 14, 38);

        // Totales Header
        doc.setFillColor(240, 240, 240);
        doc.rect(14, 45, 180, 20, 'F');
        doc.text(`Total USD: $${totals.usd.toFixed(2)}`, 20, 58);
        doc.text(`Total Bs: Bs ${totals.bs.toFixed(2)}`, 100, 58);

        // Table
        const tableColumn = ["Hora", "Cliente", "Tipo", "Ref", "Items", "Total ($)", "Total (Bs)"];
        const tableRows = [];

        dailySales.forEach(sale => {
            const date = new Date(sale.createdAt);
            const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const saleData = [
                time,
                sale.clientName || 'Cliente Casual',
                sale.paymentType || 'Contado',
                sale.reference || '-',
                sale.items?.length || 0,
                `$${(parseFloat(sale.total) || 0).toFixed(2)}`,
                `Bs ${(parseFloat(sale.totalBs) || 0).toFixed(2)}`
            ];
            tableRows.push(saleData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 75,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 9 },
            foot: [['', '', '', 'TOTALES', '', `$${totals.usd.toFixed(2)}`, `Bs ${totals.bs.toFixed(2)}`]],
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });

        doc.save(`ventas_diarias_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div className="glass-panel" style={{
                width: '90%',
                maxWidth: '900px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-primary)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Ventas del Día</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>{new Date().toLocaleDateString()}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Resumen Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total USD</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>${totals.usd.toFixed(2)}</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Bs</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>Bs {totals.bs.toFixed(2)}</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Operaciones</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{dailySales.length}</div>
                    </div>
                </div>

                {/* Action Bar */}
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={exportPDF}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Download size={18} /> Exportar PDF
                    </button>
                </div>

                {/* Table */}
                <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                            <tr>
                                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Hora</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Cliente</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Tipo</th>
                                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Total ($)</th>
                                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Total (Bs)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dailySales.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No hay ventas registradas hoy
                                    </td>
                                </tr>
                            ) : (
                                dailySales.map((sale) => (
                                    <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.75rem' }}>
                                            {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>{sale.clientName || 'Cliente Casual'}</td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <span style={{
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: 'var(--radius-sm)',
                                                background: 'var(--bg-secondary)',
                                                fontSize: '0.8rem'
                                            }}>
                                                {sale.paymentType || 'Contado'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--success)' }}>
                                            ${(parseFloat(sale.total) || 0).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-primary)' }}>
                                            Bs {(parseFloat(sale.totalBs) || 0).toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DailySalesModal;
