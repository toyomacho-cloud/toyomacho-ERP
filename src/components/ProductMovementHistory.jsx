import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, RefreshCw, Filter, Calendar } from 'lucide-react';

const ProductMovementHistory = ({ product, onClose, getProductMovementHistory }) => {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        if (product?.id) {
            loadHistory();
        }
    }, [product?.id]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await getProductMovementHistory(product.id);
            setMovements(data);
        } catch (error) {
            console.error('Error loading movement history:', error);
        }
        setLoading(false);
    };

    const filteredMovements = useMemo(() => {
        let filtered = [...movements];

        // Filter by type
        if (filterType !== 'all') {
            filtered = filtered.filter(m =>
                (m.type || '').toLowerCase() === filterType.toLowerCase()
            );
        }

        // Filter by date range
        if (dateFrom) {
            const from = new Date(dateFrom);
            filtered = filtered.filter(m => new Date(m.date) >= from);
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59);
            filtered = filtered.filter(m => new Date(m.date) <= to);
        }

        return filtered;
    }, [movements, filterType, dateFrom, dateTo]);

    // Summary stats
    const stats = useMemo(() => {
        const entradas = movements.filter(m => (m.type || '').toLowerCase() === 'entrada');
        const salidas = movements.filter(m => (m.type || '').toLowerCase() === 'salida');
        const ajustes = movements.filter(m => (m.type || '').toLowerCase() === 'ajuste');

        return {
            totalEntradas: entradas.reduce((sum, m) => sum + (parseFloat(m.quantity) || 0), 0),
            totalSalidas: salidas.reduce((sum, m) => sum + (parseFloat(m.quantity) || 0), 0),
            totalAjustes: ajustes.length,
            countEntradas: entradas.length,
            countSalidas: salidas.length,
            countAjustes: ajustes.length
        };
    }, [movements]);

    const getTypeStyles = (type) => {
        const t = (type || '').toLowerCase();
        if (t === 'entrada') return { bg: 'rgba(16, 185, 129, 0.1)', color: '#059669', icon: <ArrowDownCircle size={16} />, label: 'Entrada' };
        if (t === 'salida') return { bg: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', icon: <ArrowUpCircle size={16} />, label: 'Salida' };
        return { bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706', icon: <RefreshCw size={16} />, label: 'Ajuste' };
    };

    const getStatusBadge = (status) => {
        if (status === 'approved') return { bg: 'rgba(16, 185, 129, 0.1)', color: '#059669', label: 'Aprobado' };
        if (status === 'pending') return { bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706', label: 'Pendiente' };
        if (status === 'rejected') return { bg: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', label: 'Rechazado' };
        return { bg: 'rgba(100, 116, 139, 0.1)', color: '#64748b', label: status || '-' };
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '950px', width: '95%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Historial de Movimientos</h3>
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                            <span style={{ fontWeight: 600 }}>{product?.description || 'Producto'}</span>
                            <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>SKU: {product?.sku || '-'}</span>
                            <span style={{
                                padding: '0.15rem 0.5rem',
                                borderRadius: '999px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                background: (product?.quantity || 0) > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: (product?.quantity || 0) > 0 ? '#059669' : '#dc2626'
                            }}>
                                Stock: {product?.quantity || 0}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Entradas</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>{stats.totalEntradas}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{stats.countEntradas} movimientos</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase' }}>Salidas</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>{stats.totalSalidas}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{stats.countSalidas} movimientos</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600, textTransform: 'uppercase' }}>Ajustes</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>{stats.countAjustes}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{stats.countAjustes} movimientos</div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                            <Filter size={12} style={{ verticalAlign: 'middle' }} /> Tipo
                        </label>
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ minWidth: '140px' }}>
                            <option value="all">Todos</option>
                            <option value="entrada">Entradas</option>
                            <option value="salida">Salidas</option>
                            <option value="ajuste">Ajustes</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                            <Calendar size={12} style={{ verticalAlign: 'middle' }} /> Desde
                        </label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ minWidth: '140px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                            <Calendar size={12} style={{ verticalAlign: 'middle' }} /> Hasta
                        </label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ minWidth: '140px' }} />
                    </div>
                    {(filterType !== 'all' || dateFrom || dateTo) && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => { setFilterType('all'); setDateFrom(''); setDateTo(''); }}
                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                        >
                            <X size={14} /> Limpiar
                        </button>
                    )}
                    <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {filteredMovements.length} de {movements.length} movimientos
                    </div>
                </div>

                {/* Table */}
                <div style={{ flex: 1, overflowY: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Cargando historial...
                        </div>
                    ) : filteredMovements.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {movements.length === 0
                                ? 'Este producto no tiene movimientos registrados.'
                                : 'No se encontraron movimientos con los filtros aplicados.'}
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.9rem' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', backdropFilter: 'blur(10px)', zIndex: 5 }}>
                                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Fecha</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>Tipo</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>Cantidad</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>Stock Resultado</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Motivo</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Usuario</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMovements.map((mov) => {
                                    const typeStyle = getTypeStyles(mov.type);
                                    const statusStyle = getStatusBadge(mov.status);
                                    return (
                                        <tr key={mov.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                                                {mov.date ? new Date(mov.date).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                    {mov.date ? new Date(mov.date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                    padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                                                    background: typeStyle.bg, color: typeStyle.color
                                                }}>
                                                    {typeStyle.icon} {typeStyle.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', color: typeStyle.color }}>
                                                {(mov.type || '').toLowerCase() === 'entrada' ? '+' : (mov.type || '').toLowerCase() === 'salida' ? '-' : '='}{mov.quantity}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 500 }}>
                                                {mov.new_qty !== null && mov.new_qty !== undefined ? mov.new_qty : '-'}
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={mov.reason}>
                                                {mov.reason || '-'}
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                                                {mov.user_name || '-'}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                                                    background: statusStyle.bg, color: statusStyle.color
                                                }}>
                                                    {statusStyle.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductMovementHistory;
