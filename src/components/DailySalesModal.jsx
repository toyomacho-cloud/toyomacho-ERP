import React, { useState, useMemo } from 'react';
import { X, FileText, Download, Printer, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DailySalesModal = ({ isOpen, onClose, sales, products }) => {
    if (!isOpen) return null;

    // Date Filter State
    const [dateRange, setDateRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const handleDateChange = (field, value) => {
        setDateRange(prev => ({ ...prev, [field]: value }));
    };

    // Filter sales based on range
    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            const saleDate = new Date(sale.createdAt || sale.created_at);
            const start = new Date(dateRange.start);
            const end = new Date(dateRange.end);

            // Adjust end date to include the full day (23:59:59.999)
            // Use local time components to avoid timezone shifts
            const endFull = new Date(end);
            endFull.setHours(23, 59, 59, 999);

            // Adjust start to beginning of day
            const startFull = new Date(start);
            startFull.setHours(0, 0, 0, 0);

            return saleDate >= startFull && saleDate <= endFull;
        }).sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
    }, [sales, dateRange]);

    // Calculate totals breakdown for FILTERED sales
    const totals = useMemo(() => {
        return filteredSales.reduce((acc, sale) => {
            const isPending = sale.status === 'pending' || sale.payment_status === 'pending';
            const amountUSD = parseFloat(sale.total || sale.amount_usd) || 0;
            const amountBs = parseFloat(sale.totalBs || sale.amount_bs) || 0;

            // Total General
            acc.totalUSD += amountUSD;
            acc.totalBs += amountBs;

            // Breakdown
            if (isPending) {
                acc.pendingCount++;
                acc.pendingUSD += amountUSD;
            } else {
                acc.processedCount++;
                acc.processedUSD += amountUSD;
            }
            return acc;
        }, { totalUSD: 0, totalBs: 0, pendingCount: 0, pendingUSD: 0, processedCount: 0, processedUSD: 0 });
    }, [filteredSales]);

    // Export to PDF
    const exportPDF = () => {
        try {
            console.log('📄 Starting PDF Export...');
            const doc = new jsPDF();

            // Header
            doc.setFontSize(18);
            doc.text('Reporte de Ventas (POS)', 14, 20);

            doc.setFontSize(12);
            doc.text(`Período: ${new Date(dateRange.start).toLocaleDateString()} al ${new Date(dateRange.end).toLocaleDateString()}`, 14, 30);
            doc.text(`Total Operaciones: ${filteredSales.length}`, 14, 38);

            // Summary Box
            doc.setDrawColor(200);
            doc.setFillColor(245, 245, 245);
            doc.rect(14, 45, 180, 25, 'FD');

            doc.setFontSize(10);
            doc.text('Enviado a Caja (Pendiente):', 20, 55);
            doc.text(`${totals.pendingCount} ventas - $${totals.pendingUSD.toFixed(2)}`, 20, 62);

            doc.text('Cobrado (Procesado):', 100, 55);
            doc.text(`${totals.processedCount} ventas - $${totals.processedUSD.toFixed(2)}`, 100, 62);

            // Table
            const tableColumn = ["Fecha/Hora", "Cliente", "Estado", "Total ($)", "Total (Bs)"];
            const tableRows = [];

            filteredSales.forEach(sale => {
                const date = new Date(sale.createdAt || sale.created_at);
                const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isPending = sale.status === 'pending' || sale.payment_status === 'pending';
                const amountUSD = parseFloat(sale.total || sale.amount_usd) || 0;
                const amountBs = parseFloat(sale.totalBs || sale.amount_bs) || 0;

                const saleData = [
                    dateStr,
                    sale.clientName || sale.customer?.name || 'Cliente Casual',
                    isPending ? 'En Caja' : 'Cobrado',
                    `$${amountUSD.toFixed(2)}`,
                    `Bs ${amountBs.toFixed(2)}`
                ];
                tableRows.push(saleData);
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 80,
                theme: 'grid',
                headStyles: { fillColor: [66, 66, 66] },
                styles: { fontSize: 9 },
                foot: [['', '', 'TOTAL GENERAL', `$${totals.totalUSD.toFixed(2)}`, `Bs ${totals.totalBs.toFixed(2)}`]],
                footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
            });

            doc.save(`resumen_pos_${dateRange.start}_${dateRange.end}.pdf`);
            console.log('✅ PDF Export completed');
        } catch (error) {
            console.error('❌ PDF Export Error:', error);
            alert('Error al exportar PDF: ' + error.message);
        }
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
            alignItems: 'flex-start',
            paddingTop: '4rem',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Reporte de Ventas (POS)</h2>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => handleDateChange('start', e.target.value)}
                                style={{
                                    padding: '0.35rem',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)'
                                }}
                            />
                            <span style={{ color: 'var(--text-secondary)' }}>a</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => handleDateChange('end', e.target.value)}
                                style={{
                                    padding: '0.35rem',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)'
                                }}
                            />
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Resumen Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    {/* Pendiente en Caja */}
                    <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>⏳ ENVIADO A CAJA</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning)', margin: '0.5rem 0' }}>
                            ${totals.pendingUSD.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {totals.pendingCount} pendientes de cobro
                        </div>
                    </div>

                    {/* Cobrado */}
                    <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>✅ COBRADO</span>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)', margin: '0.5rem 0' }}>
                            ${totals.processedUSD.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {totals.processedCount} ventas procesadas
                        </div>
                    </div>

                    {/* Total General */}
                    <div style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TOTAL GENERADO</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${totals.totalUSD.toFixed(2)}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Bs {totals.totalBs.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={exportPDF}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Download size={18} /> Exportar Reporte
                    </button>
                </div>

                {/* Table */}
                <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                            <tr>
                                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Fecha/Hora</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Cliente</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>Estado</th>
                                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Monto ($)</th>
                                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Monto (Bs)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No hay movimientos en este rango
                                    </td>
                                </tr>
                            ) : (
                                filteredSales.map((sale) => {
                                    const isPending = sale.status === 'pending' || sale.payment_status === 'pending';
                                    const amountUSD = parseFloat(sale.total || sale.amount_usd) || 0;
                                    const amountBs = parseFloat(sale.totalBs || sale.amount_bs) || 0;
                                    const date = new Date(sale.createdAt || sale.created_at);

                                    return (
                                        <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                                                {date.toLocaleDateString()} <small style={{ color: 'var(--text-secondary)' }}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>{sale.clientName || sale.customer?.name || 'Cliente Casual'}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    background: isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                    color: isPending ? 'var(--warning)' : 'var(--success)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    border: `1px solid ${isPending ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                                                }}>
                                                    {isPending ? 'En Caja' : 'Cobrado'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                                                ${amountUSD.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                Bs {amountBs.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('¿Seguro que deseas eliminar este registro? El stock será devuelto al inventario.')) {
                                                            onDeleteSale(sale.id);
                                                        }
                                                    }}
                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', opacity: 0.7 }}
                                                    className="hover-bright"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DailySalesModal;
