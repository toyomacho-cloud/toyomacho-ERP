import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, Filter, Download, TrendingUp, TrendingDown, RefreshCw, Calendar, Search } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import { generateReportExcel } from '../utils/excel-report-utils';

const Reports = () => {
    const { movements, purchases, sales, products, providers } = useInventoryContext();

    // Filter states
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterProvider, setFilterProvider] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // IVA rate
    const IVA_RATE = 0.16;

    // Combine all data sources into unified records
    const allRecords = useMemo(() => {
        const records = [];

        // Process movements
        movements.forEach(m => {
            const product = products.find(p => p.id === m.productId);
            const price = product?.price || m.cost || 0;
            const subtotal = price * m.quantity;
            const iva = m.type !== 'Ajuste' ? subtotal * IVA_RATE : 0;

            records.push({
                id: m.id,
                source: 'movement',
                date: m.date,
                type: m.type,
                sku: m.sku || product?.sku || '-',
                productName: m.productName || product?.description || '-',
                quantity: m.quantity,
                unitPrice: price,
                subtotal: subtotal,
                iva: iva,
                total: subtotal + iva,
                provider: m.providerName || '-',
                reason: m.reason || '-',
                user: m.createdBy || 'Sistema',
                status: m.status || 'approved'
            });
        });

        // Process purchases (if not already in movements)
        purchases.forEach(p => {
            const existsInMovements = movements.some(m =>
                m.reason?.includes(p.invoiceNumber) &&
                m.productId === p.productId
            );

            if (!existsInMovements) {
                const price = p.cost || 0;
                const subtotal = price * p.quantity;
                const iva = subtotal * IVA_RATE;

                records.push({
                    id: p.id,
                    source: 'purchase',
                    date: p.date,
                    type: 'Entrada',
                    sku: p.productSku || '-',
                    productName: p.productName || '-',
                    quantity: p.quantity,
                    unitPrice: price,
                    subtotal: subtotal,
                    iva: iva,
                    total: subtotal + iva,
                    provider: p.providerName || '-',
                    reason: `Compra - Factura: ${p.invoiceNumber}`,
                    user: 'Sistema',
                    status: 'approved'
                });
            }
        });

        // Process sales (if not already in movements)
        sales.forEach(s => {
            const existsInMovements = movements.some(m =>
                m.reason?.includes('Venta') &&
                m.productId === s.productId &&
                m.date?.startsWith(s.createdAt?.split('T')[0])
            );

            if (!existsInMovements) {
                const price = s.priceUSD || s.price || 0;
                const subtotal = price * s.quantity;
                const iva = subtotal * IVA_RATE;

                records.push({
                    id: s.id,
                    source: 'sale',
                    date: s.createdAt,
                    type: 'Salida',
                    sku: s.sku || '-',
                    productName: s.description || '-',
                    quantity: s.quantity,
                    unitPrice: price,
                    subtotal: subtotal,
                    iva: iva,
                    total: subtotal + iva,
                    provider: '-',
                    reason: 'Venta/Egreso',
                    user: s.userName || 'Sistema',
                    status: 'approved'
                });
            }
        });

        // Sort by date descending
        return records.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [movements, purchases, sales, products]);

    // Apply filters
    const filteredRecords = useMemo(() => {
        return allRecords.filter(r => {
            // Date filter
            if (dateFrom && new Date(r.date) < new Date(dateFrom)) return false;
            if (dateTo && new Date(r.date) > new Date(dateTo + 'T23:59:59')) return false;

            // Type filter
            if (filterType !== 'all' && r.type !== filterType) return false;

            // Provider filter
            if (filterProvider && r.provider !== filterProvider) return false;

            // Search filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesSku = r.sku.toLowerCase().includes(term);
                const matchesProduct = r.productName.toLowerCase().includes(term);
                const matchesReason = r.reason.toLowerCase().includes(term);
                if (!matchesSku && !matchesProduct && !matchesReason) return false;
            }

            return true;
        });
    }, [allRecords, dateFrom, dateTo, filterType, filterProvider, searchTerm]);

    // Calculate summary
    const summary = useMemo(() => {
        const result = {
            totalEntradas: 0,
            valorEntradas: 0,
            totalSalidas: 0,
            valorSalidas: 0,
            totalAjustes: 0,
            ivaTotal: 0
        };

        filteredRecords.forEach(r => {
            if (r.type === 'Entrada') {
                result.totalEntradas += r.quantity;
                result.valorEntradas += r.subtotal;
            } else if (r.type === 'Salida') {
                result.totalSalidas += r.quantity;
                result.valorSalidas += r.subtotal;
            } else if (r.type === 'Ajuste') {
                result.totalAjustes++;
            }
            result.ivaTotal += r.iva;
        });

        return result;
    }, [filteredRecords]);

    // Get unique providers for filter dropdown
    const uniqueProviders = useMemo(() => {
        const provs = new Set();
        allRecords.forEach(r => {
            if (r.provider && r.provider !== '-') {
                provs.add(r.provider);
            }
        });
        return Array.from(provs).sort();
    }, [allRecords]);

    const handleExportExcel = () => {
        generateReportExcel(filteredRecords, summary, { dateFrom, dateTo });
    };

    const clearFilters = () => {
        setDateFrom('');
        setDateTo('');
        setFilterType('all');
        setFilterProvider('');
        setSearchTerm('');
    };

    const formatDate = (dateStr) => {
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

    const getTypeStyle = (type) => {
        switch (type) {
            case 'Entrada':
                return { color: 'var(--success)', icon: <TrendingUp size={14} /> };
            case 'Salida':
                return { color: 'var(--danger)', icon: <TrendingDown size={14} /> };
            case 'Ajuste':
                return { color: 'var(--warning)', icon: <RefreshCw size={14} /> };
            default:
                return { color: 'var(--text-secondary)', icon: null };
        }
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileSpreadsheet size={28} /> Reportes Históricos
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Consulta y exporta el historial de movimientos de almacén.
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleExportExcel}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Download size={20} /> Exportar Excel
                </button>
            </header>

            {/* Filters */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Filter size={18} />
                    <h3 style={{ margin: 0 }}>Filtros</h3>
                    <button
                        className="btn btn-ghost"
                        onClick={clearFilters}
                        style={{ marginLeft: 'auto', fontSize: '0.8rem' }}
                    >
                        Limpiar filtros
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <Calendar size={12} style={{ marginRight: '4px' }} />Desde
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <Calendar size={12} style={{ marginRight: '4px' }} />Hasta
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tipo</label>
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                            <option value="all">Todos</option>
                            <option value="Entrada">Entradas</option>
                            <option value="Salida">Salidas</option>
                            <option value="Ajuste">Ajustes</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Proveedor</label>
                        <select value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)}>
                            <option value="">Todos</option>
                            {uniqueProviders.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <Search size={12} style={{ marginRight: '4px' }} />Buscar
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="SKU, producto o motivo..."
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--success)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>ENTRADAS</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{summary.totalEntradas}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>${summary.valorEntradas.toFixed(2)}</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--danger)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>SALIDAS</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>{summary.totalSalidas}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>${summary.valorSalidas.toFixed(2)}</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--warning)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>AJUSTES</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>{summary.totalAjustes}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>registros</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--accent-primary)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>IVA TOTAL</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>${summary.ivaTotal.toFixed(2)}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>16%</div>
                </div>
            </div>

            {/* Data Table */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Historial de Movimientos</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {filteredRecords.length} registros
                    </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '1000px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'rgba(255,255,255,0.03)' }}>
                            <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Fecha</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Tipo</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>SKU</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Producto</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cant.</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Precio U.</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Subtotal</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>IVA</th>
                            <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Total</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Proveedor</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Motivo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length > 0 ? (
                            filteredRecords.slice(0, 100).map((r) => {
                                const typeStyle = getTypeStyle(r.type);
                                return (
                                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                            {formatDate(r.date)}
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                color: typeStyle.color,
                                                fontWeight: 500
                                            }}>
                                                {typeStyle.icon} {r.type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.sku}</td>
                                        <td style={{ padding: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {r.productName}
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>{r.quantity}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>${r.unitPrice.toFixed(2)}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>${r.subtotal.toFixed(2)}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                            {r.iva > 0 ? `$${r.iva.toFixed(2)}` : '-'}
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                                            {r.total > 0 ? `$${r.total.toFixed(2)}` : '-'}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>{r.provider}</td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {r.reason}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="11" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No se encontraron registros con los filtros aplicados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {filteredRecords.length > 100 && (
                    <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Mostrando 100 de {filteredRecords.length} registros. Exporta a Excel para ver todos.
                    </p>
                )}
            </div>
        </div>
    );
};

export default Reports;

