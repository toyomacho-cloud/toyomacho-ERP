import React, { useState, useMemo } from 'react';
import { FileText, Download, Calendar, Building2, Printer } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import { useCompany } from '../context/CompanyContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Article177Report = () => {
    const { movements, products } = useInventoryContext();
    const { currentCompany } = useCompany();

    // Period selection
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    // Company data (editable for the report)
    const [companyData, setCompanyData] = useState({
        name: currentCompany?.name || '',
        rif: currentCompany?.rif || '',
        address: 'Domicilio Fiscal'
    });

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const years = Array.from({ length: 6 }, (_, i) => currentDate.getFullYear() - i);

    // Calculate report data for the selected period
    const reportData = useMemo(() => {
        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

        // Filter movements for the period
        const periodMovements = movements.filter(m => {
            const moveDate = new Date(m.date);
            const isInPeriod = moveDate >= startDate && moveDate <= endDate;
            const isApproved = !m.status || m.status === 'approved';
            return isInPeriod && isApproved;
        });

        // Group by product
        const productMap = new Map();

        // Process each movement
        periodMovements.forEach(m => {
            const product = products.find(p => p.id === m.productId);
            if (!product) return;

            if (!productMap.has(m.productId)) {
                productMap.set(m.productId, {
                    id: m.productId,
                    sku: product.sku || '-',
                    description: product.description || '-',
                    unitCost: product.price || 0,
                    currentStock: product.quantity || 0,
                    // Columns
                    entryQty: 0, entryCost: 0,
                    exitQty: 0, exitCost: 0,
                    retiroQty: 0, retiroCost: 0,
                    autoconsumoQty: 0, autoconsumoCost: 0,
                    ajusteQty: 0, ajusteCost: 0
                });
            }

            const item = productMap.get(m.productId);
            const unitPrice = m.unitPrice || item.unitCost;
            const reason = (m.reason || '').toUpperCase();

            // Classify movement
            if (reason.includes('RETIRO')) {
                item.retiroQty += Math.abs(m.quantity);
                item.retiroCost += Math.abs(m.quantity) * unitPrice;
            } else if (reason.includes('AUTOCONSUMO')) {
                item.autoconsumoQty += Math.abs(m.quantity);
                item.autoconsumoCost += Math.abs(m.quantity) * unitPrice;
            } else if (reason.includes('AJUSTE') || m.type === 'Ajuste') {
                item.ajusteQty += m.quantity;
                item.ajusteCost += Math.abs(m.quantity) * unitPrice;
            } else if (m.type === 'Entrada') {
                item.entryQty += m.quantity;
                item.entryCost += m.quantity * unitPrice;
            } else if (m.type === 'Salida') {
                item.exitQty += m.quantity;
                item.exitCost += m.quantity * unitPrice;
            }
        });

        // Calculate initial and final stock for each product
        const items = Array.from(productMap.values()).map(item => {
            // Current stock is the final stock
            const finalQty = item.currentStock;
            // Initial = Final - Entries + Exits + Retiros + Autoconsumo - Ajustes
            const initialQty = finalQty - item.entryQty + item.exitQty + item.retiroQty + item.autoconsumoQty - item.ajusteQty;

            return {
                ...item,
                initialQty: Math.max(0, initialQty),
                initialCost: Math.max(0, initialQty) * item.unitCost,
                finalQty: finalQty,
                finalCost: finalQty * item.unitCost
            };
        });

        // Calculate totals
        const totals = items.reduce((acc, item) => ({
            initialQty: acc.initialQty + item.initialQty,
            initialCost: acc.initialCost + item.initialCost,
            entryQty: acc.entryQty + item.entryQty,
            entryCost: acc.entryCost + item.entryCost,
            exitQty: acc.exitQty + item.exitQty,
            exitCost: acc.exitCost + item.exitCost,
            retiroQty: acc.retiroQty + item.retiroQty,
            retiroCost: acc.retiroCost + item.retiroCost,
            autoconsumoQty: acc.autoconsumoQty + item.autoconsumoQty,
            autoconsumoCost: acc.autoconsumoCost + item.autoconsumoCost,
            ajusteQty: acc.ajusteQty + item.ajusteQty,
            ajusteCost: acc.ajusteCost + item.ajusteCost,
            finalQty: acc.finalQty + item.finalQty,
            finalCost: acc.finalCost + item.finalCost
        }), {
            initialQty: 0, initialCost: 0,
            entryQty: 0, entryCost: 0,
            exitQty: 0, exitCost: 0,
            retiroQty: 0, retiroCost: 0,
            autoconsumoQty: 0, autoconsumoCost: 0,
            ajusteQty: 0, ajusteCost: 0,
            finalQty: 0, finalCost: 0
        });

        return { items, totals };
    }, [movements, products, selectedMonth, selectedYear]);

    // Generate PDF
    const generatePDF = () => {
        const doc = new jsPDF('landscape', 'mm', 'legal');
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(companyData.name || 'EMPRESA, C.A.', 14, 12);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`RIF: ${companyData.rif}`, 14, 17);
        doc.text('Movimiento de Unidades según el artículo 177 ley de impuesto sobre la renta', 14, 22);
        doc.text('SENIAT Tipo Prod. General', 14, 27);

        doc.text(`Fecha desde: 01/${(selectedMonth + 1).toString().padStart(2, '0')}/${selectedYear}`, pageWidth - 80, 12);
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        doc.text(`Fecha hasta: ${lastDay}/${(selectedMonth + 1).toString().padStart(2, '0')}/${selectedYear}`, pageWidth - 80, 17);

        // Table
        const tableData = reportData.items.map(item => [
            item.sku,
            item.description.substring(0, 25),
            item.initialQty, item.unitCost.toFixed(2), item.initialCost.toFixed(2),
            item.entryQty, item.unitCost.toFixed(2), item.entryCost.toFixed(2),
            item.exitQty, item.unitCost.toFixed(2), item.exitCost.toFixed(2),
            item.retiroQty, item.retiroCost.toFixed(2),
            item.autoconsumoQty, item.autoconsumoCost.toFixed(2),
            item.finalQty, item.unitCost.toFixed(2), item.finalCost.toFixed(2)
        ]);

        // Totals row
        tableData.push([
            { content: 'TOTAL INVENTARIO GENERAL', colSpan: 2, styles: { fontStyle: 'bold' } },
            '', '', reportData.totals.initialCost.toFixed(2),
            '', '', reportData.totals.entryCost.toFixed(2),
            '', '', reportData.totals.exitCost.toFixed(2),
            '', reportData.totals.retiroCost.toFixed(2),
            '', reportData.totals.autoconsumoCost.toFixed(2),
            '', '', reportData.totals.finalCost.toFixed(2)
        ]);

        autoTable(doc, {
            head: [[
                { content: '', colSpan: 2 },
                { content: 'EXIST. INICIAL', colSpan: 3 },
                { content: 'ENTRADAS', colSpan: 3 },
                { content: 'SALIDAS', colSpan: 3 },
                { content: 'RETIROS', colSpan: 2 },
                { content: 'AUTOCONSUMO', colSpan: 2 },
                { content: 'EXIST. FINAL', colSpan: 3 }
            ], [
                'Código', 'Descripción',
                'Cant', 'C.Uni', 'Monto',
                'Cant', 'C.Uni', 'Monto',
                'Cant', 'C.Uni', 'Monto',
                'Cant', 'Monto',
                'Cant', 'Monto',
                'Cant', 'C.Uni', 'Monto'
            ]],
            body: tableData,
            startY: 32,
            theme: 'grid',
            headStyles: { fillColor: [34, 139, 34], fontSize: 6, halign: 'center' },
            styles: { fontSize: 5, cellPadding: 1 },
            columnStyles: {
                0: { cellWidth: 20 }, 1: { cellWidth: 40 },
                2: { cellWidth: 12, halign: 'right' }, 3: { cellWidth: 14, halign: 'right' }, 4: { cellWidth: 16, halign: 'right' },
                5: { cellWidth: 12, halign: 'right' }, 6: { cellWidth: 14, halign: 'right' }, 7: { cellWidth: 16, halign: 'right' },
                8: { cellWidth: 12, halign: 'right' }, 9: { cellWidth: 14, halign: 'right' }, 10: { cellWidth: 16, halign: 'right' },
                11: { cellWidth: 12, halign: 'right' }, 12: { cellWidth: 16, halign: 'right' },
                13: { cellWidth: 12, halign: 'right' }, 14: { cellWidth: 16, halign: 'right' },
                15: { cellWidth: 12, halign: 'right' }, 16: { cellWidth: 14, halign: 'right' }, 17: { cellWidth: 16, halign: 'right' }
            }
        });

        doc.save(`Art177_${monthNames[selectedMonth]}_${selectedYear}.pdf`);
    };

    const formatCurrency = (val) => val > 0 ? `$${val.toFixed(2)}` : '-';
    const formatQty = (val) => val !== 0 ? val : '-';

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
                        <FileText size={24} /> Reporte Artículo 177 ISLR
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Movimiento de Unidades - Formato SENIAT
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => window.print()}>
                        <Printer size={16} /> Imprimir
                    </button>
                    <button className="btn btn-primary" onClick={generatePDF}>
                        <Download size={16} /> PDF
                    </button>
                </div>
            </header>

            {/* Company & Period Selection */}
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <Building2 size={10} /> Contribuyente
                        </label>
                        <input type="text" value={companyData.name} onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>RIF</label>
                        <input type="text" value={companyData.rif} onChange={(e) => setCompanyData({ ...companyData, rif: e.target.value })} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <Calendar size={10} /> Mes
                        </label>
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                            {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Año</label>
                        <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                {[
                    { label: 'EXIST. INICIAL', value: reportData.totals.initialCost, color: 'var(--text-secondary)' },
                    { label: 'ENTRADAS', value: reportData.totals.entryCost, color: 'var(--success)' },
                    { label: 'SALIDAS', value: reportData.totals.exitCost, color: 'var(--danger)' },
                    { label: 'RETIROS', value: reportData.totals.retiroCost, color: 'var(--warning)' },
                    { label: 'AUTOCONSUMO', value: reportData.totals.autoconsumoCost, color: 'orange' },
                    { label: 'EXIST. FINAL', value: reportData.totals.finalCost, color: 'var(--success)' }
                ].map((c, i) => (
                    <div key={i} className="glass-panel" style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${c.color}` }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{c.label}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: c.color }}>${c.value.toFixed(2)}</div>
                    </div>
                ))}
            </div>

            {/* Data Table */}
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', minWidth: '1200px' }}>
                    <thead>
                        <tr style={{ background: 'rgba(34, 139, 34, 0.2)' }}>
                            <th rowSpan="2" style={{ padding: '0.5rem', border: '1px solid var(--border-color)' }}>Código</th>
                            <th rowSpan="2" style={{ padding: '0.5rem', border: '1px solid var(--border-color)' }}>Descripción</th>
                            <th colSpan="3" style={{ padding: '0.25rem', border: '1px solid var(--border-color)', background: 'rgba(100,100,100,0.2)' }}>EXIST. INICIAL</th>
                            <th colSpan="3" style={{ padding: '0.25rem', border: '1px solid var(--border-color)', background: 'rgba(34, 139, 34, 0.3)' }}>ENTRADAS</th>
                            <th colSpan="3" style={{ padding: '0.25rem', border: '1px solid var(--border-color)', background: 'rgba(220, 38, 38, 0.2)' }}>SALIDAS</th>
                            <th colSpan="2" style={{ padding: '0.25rem', border: '1px solid var(--border-color)', background: 'rgba(234, 179, 8, 0.2)' }}>RETIROS</th>
                            <th colSpan="2" style={{ padding: '0.25rem', border: '1px solid var(--border-color)', background: 'rgba(249, 115, 22, 0.2)' }}>AUTOCONSUMO</th>
                            <th colSpan="3" style={{ padding: '0.25rem', border: '1px solid var(--border-color)', background: 'rgba(34, 139, 34, 0.3)' }}>EXIST. FINAL</th>
                        </tr>
                        <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                            {['Cant', 'C.Uni', 'Monto', 'Cant', 'C.Uni', 'Monto', 'Cant', 'C.Uni', 'Monto', 'Cant', 'Monto', 'Cant', 'Monto', 'Cant', 'C.Uni', 'Monto'].map((h, i) => (
                                <th key={i} style={{ padding: '0.25rem', border: '1px solid var(--border-color)', fontSize: '0.6rem' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.items.length > 0 ? reportData.items.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', fontFamily: 'monospace' }}>{item.sku}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>{formatQty(item.initialQty)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>{formatCurrency(item.unitCost)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>{formatCurrency(item.initialCost)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--success)' }}>{formatQty(item.entryQty)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>{formatCurrency(item.unitCost)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--success)' }}>{formatCurrency(item.entryCost)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--danger)' }}>{formatQty(item.exitQty)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>{formatCurrency(item.unitCost)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--danger)' }}>{formatCurrency(item.exitCost)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--warning)' }}>{formatQty(item.retiroQty)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--warning)' }}>{formatCurrency(item.retiroCost)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', color: 'orange' }}>{formatQty(item.autoconsumoQty)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', color: 'orange' }}>{formatCurrency(item.autoconsumoCost)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', fontWeight: 'bold' }}>{formatQty(item.finalQty)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>{formatCurrency(item.unitCost)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.finalCost)}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan="18" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay movimientos para el período.</td></tr>
                        )}
                    </tbody>
                    {reportData.items.length > 0 && (
                        <tfoot>
                            <tr style={{ background: 'rgba(34, 139, 34, 0.1)', fontWeight: 'bold' }}>
                                <td colSpan="2" style={{ padding: '0.5rem', border: '1px solid var(--border-color)' }}>TOTAL INVENTARIO GENERAL</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>{reportData.totals.initialQty}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)' }}></td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>${reportData.totals.initialCost.toFixed(2)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>{reportData.totals.entryQty}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)' }}></td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--success)' }}>${reportData.totals.entryCost.toFixed(2)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>{reportData.totals.exitQty}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)' }}></td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--danger)' }}>${reportData.totals.exitCost.toFixed(2)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>{reportData.totals.retiroQty}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--warning)' }}>${reportData.totals.retiroCost.toFixed(2)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>{reportData.totals.autoconsumoQty}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', color: 'orange' }}>${reportData.totals.autoconsumoCost.toFixed(2)}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right' }}>{reportData.totals.finalQty}</td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)' }}></td>
                                <td style={{ padding: '0.4rem', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--success)' }}>${reportData.totals.finalCost.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                <strong>Nota:</strong> Registro según Artículo 177 del Reglamento LISLR. Debe mantenerse en el domicilio fiscal.
            </div>
        </div >
    );
};

export default Article177Report;
