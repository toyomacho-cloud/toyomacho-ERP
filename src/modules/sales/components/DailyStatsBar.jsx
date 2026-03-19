/**
 * DailyStatsBar Component
 * Barra de estadisticas diarias de ventas con panel expandible
 */
import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { formatearUSD } from '../utils/salesCalculations';

const DailyStatsBar = ({ estadisticas, ventas = [] }) => {
    const { ventasHoy = 0, porCobrar = 0, ventasTotales = 0 } = estadisticas || {};
    const [expandido, setExpandido] = useState(false);

    // Filtrar ventas del dia
    const ventasDelDia = useMemo(() => {
        const inicioDia = new Date();
        inicioDia.setHours(0, 0, 0, 0);
        const finDia = new Date();
        finDia.setHours(23, 59, 59, 999);

        return ventas
            .filter(venta => {
                const fechaVenta = new Date(venta.createdAt || venta.created_at);
                return fechaVenta >= inicioDia && fechaVenta <= finDia;
            })
            .sort((a, b) => {
                const fechaA = new Date(a.createdAt || a.created_at);
                const fechaB = new Date(b.createdAt || b.created_at);
                return fechaB - fechaA; // Mas recientes primero
            });
    }, [ventas]);

    // Formatear hora
    const formatearHora = (fecha) => {
        const date = new Date(fecha);
        return date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Barra de estadisticas */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem'
            }}>
                {/* Ventas Hoy - Clickeable */}
                <div
                    onClick={() => setExpandido(!expandido)}
                    style={{
                        background: expandido ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.06)',
                        border: `2px solid ${expandido ? '#2563eb' : 'rgba(59, 130, 246, 0.15)'}`,
                        padding: '0.75rem 1rem',
                        borderRadius: expandido ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: '#1e293b',
                            marginBottom: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            📋 VENTAS HOY
                            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {ventasHoy} operaciones • Click para ver
                        </div>
                    </div>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#1e293b',
                        background: 'rgba(30, 41, 59, 0.08)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px'
                    }}>
                        {ventasHoy}
                    </div>
                </div>

                {/* Por Cobrar */}
                <div style={{
                    background: 'rgba(180, 83, 9, 0.07)',
                    border: '1px solid rgba(180, 83, 9, 0.15)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: '#b45309',
                            marginBottom: '0.25rem'
                        }}>
                            💳 POR COBRAR
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Creditos pendientes
                        </div>
                    </div>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#b45309'
                    }}>
                        {formatearUSD(porCobrar)}
                    </div>
                </div>

                {/* Ventas Totales */}
                <div style={{
                    background: 'white',
                    border: '1px solid var(--border-color)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: 'var(--text-secondary)',
                            marginBottom: '0.25rem'
                        }}>
                            💵 VENTAS TOTALES
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Total del dia
                        </div>
                    </div>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: 'var(--text-primary)'
                    }}>
                        {formatearUSD(ventasTotales)}
                    </div>
                </div>
            </div>

            {/* Panel expandible de ventas */}
            {expandido && (
                <div style={{
                    background: 'white',
                    border: '2px solid #2563eb',
                    borderTop: 'none',
                    borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                    padding: '1rem',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    animation: 'slideDown 0.2s ease-out'
                }}>
                    {ventasDelDia.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '2rem',
                            color: 'var(--text-secondary)'
                        }}>
                            <Clock size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                            <div>No hay ventas registradas hoy</div>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{
                                    borderBottom: '2px solid #e2e8f0',
                                    color: '#64748b',
                                    fontSize: '0.75rem',
                                    textTransform: 'uppercase'
                                }}>
                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Hora</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Producto</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Cant</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Monto</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ventasDelDia.map((venta, index) => {
                                    const esPagado = venta.status === 'paid' || venta.payment_status === 'paid';
                                    const esCredito = venta.payment_type === 'credito' || venta.status === 'pending';

                                    return (
                                        <tr
                                            key={venta.id || index}
                                            style={{
                                                borderBottom: '1px solid #f1f5f9',
                                                transition: 'background 0.1s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{
                                                padding: '0.75rem 0.5rem',
                                                color: '#64748b',
                                                fontWeight: '500'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Clock size={12} />
                                                    {formatearHora(venta.createdAt || venta.created_at)}
                                                </div>
                                            </td>
                                            <td style={{
                                                padding: '0.75rem 0.5rem',
                                                fontWeight: '600',
                                                color: '#1e293b',
                                                maxWidth: '200px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {venta.description || venta.product_name || `Venta #${venta.id}`}
                                            </td>
                                            <td style={{
                                                padding: '0.75rem 0.5rem',
                                                textAlign: 'center',
                                                fontWeight: '600'
                                            }}>
                                                {venta.quantity || 1}
                                            </td>
                                            <td style={{
                                                padding: '0.75rem 0.5rem',
                                                textAlign: 'right',
                                                fontWeight: 'bold',
                                                color: '#059669'
                                            }}>
                                                {formatearUSD(venta.total || venta.amount_usd || 0)}
                                            </td>
                                            <td style={{
                                                padding: '0.75rem 0.5rem',
                                                textAlign: 'center'
                                            }}>
                                                {esPagado ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        background: 'rgba(16, 185, 129, 0.1)',
                                                        color: '#059669',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        <CheckCircle size={12} /> Pagado
                                                    </span>
                                                ) : esCredito ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        background: 'rgba(180, 83, 9, 0.08)',
                                                        color: '#b45309',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        <AlertCircle size={12} /> Credito
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        background: 'rgba(100, 116, 139, 0.1)',
                                                        color: '#64748b',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        Pendiente
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {/* Resumen al final */}
                    {ventasDelDia.length > 0 && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            background: '#f8fafc',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.9rem'
                        }}>
                            <span style={{ color: '#64748b' }}>
                                Total: {ventasDelDia.length} ventas
                            </span>
                            <span style={{ fontWeight: 'bold', color: '#059669' }}>
                                {formatearUSD(ventasTotales)}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* CSS para animacion */}
            <style>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};

export default DailyStatsBar;
