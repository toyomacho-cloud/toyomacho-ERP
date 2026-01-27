/**
 * CartTable Component
 * Tabla del carrito con controles de cantidad
 */
import React from 'react';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { formatearUSD, formatearBs } from '../utils/salesCalculations';

const CartTable = ({
    carrito,
    tasaCambio,
    subtotal,
    total,
    totalBs,
    onEliminarProducto,
    onActualizarCantidad,
    onActualizarPrecio,
    onLimpiarCarrito,
    onSiguiente
}) => {
    return (
        <div className="glass-panel" style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'white',
            border: 'none',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-lg)'
        }}>
            {/* Header */}
            <div style={{
                padding: '1.25rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    margin: 0
                }}>
                    <ShoppingCart size={20} /> Carrito ({carrito.length})
                </h3>
                <button
                    onClick={onLimpiarCarrito}
                    style={{
                        color: 'var(--danger)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.4rem',
                        borderRadius: '8px'
                    }}
                    title="Vaciar Carrito"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Lista de productos */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                {carrito.map((item, indice) => (
                    <div
                        key={indice}
                        style={{
                            marginBottom: '1rem',
                            paddingBottom: '1rem',
                            borderBottom: '1px solid #f1f5f9'
                        }}
                    >
                        {/* Nombre y eliminar */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.5rem',
                            alignItems: 'flex-start'
                        }}>
                            <span style={{
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                color: '#334155',
                                lineHeight: '1.4'
                            }}>
                                {item.descripcion}
                            </span>
                            <button
                                onClick={() => onEliminarProducto(indice)}
                                style={{
                                    color: '#ef4444',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0',
                                    marginLeft: '0.5rem'
                                }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* Precio, cantidad y subtotal */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            {/* Precio unitario editable */}
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>P/U:</span>
                                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={item.precioUSD}
                                        onChange={(e) => onActualizarPrecio && onActualizarPrecio(indice, parseFloat(e.target.value) || 0)}
                                        style={{
                                            width: '70px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            color: 'var(--success)',
                                            background: '#f8fafc',
                                            textAlign: 'right'
                                        }}
                                        title="Editar precio"
                                    />
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                        | {formatearBs(item.precioUSD * tasaCambio)}
                                    </span>
                                </div>
                            </div>

                            {/* Controles de cantidad */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                    onClick={() => onActualizarCantidad(indice, Math.max(1, item.cantidad - 1))}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        border: '1px solid #cbd5e1',
                                        background: 'white',
                                        color: '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Minus size={14} />
                                </button>
                                <input
                                    type="number"
                                    value={item.cantidad}
                                    onChange={(e) => onActualizarCantidad(indice, parseInt(e.target.value) || 1)}
                                    style={{
                                        width: '40px',
                                        textAlign: 'center',
                                        border: 'none',
                                        fontWeight: 'bold',
                                        fontSize: '0.9rem',
                                        padding: '0',
                                        background: 'transparent'
                                    }}
                                />
                                <button
                                    onClick={() => onActualizarCantidad(indice, item.cantidad + 1)}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        border: '1px solid #cbd5e1',
                                        background: 'white',
                                        color: '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            {/* Subtotal del item */}
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 'bold', color: 'var(--success)', fontSize: '0.95rem' }}>
                                    {formatearUSD(item.precioUSD * item.cantidad)}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                    {formatearBs(item.precioUSD * item.cantidad * tasaCambio)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Estado vacio */}
                {carrito.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        <ShoppingCart size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                        <div>Carrito vacio</div>
                    </div>
                )}
            </div>

            {/* Footer con totales */}
            <div style={{ padding: '1.25rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.25rem',
                    fontSize: '0.9rem',
                    color: '#64748b'
                }}>
                    <span>Subtotal:</span>
                    <span>{formatearUSD(subtotal)}</span>
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    color: '#1e293b'
                }}>
                    <span>Total:</span>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--success)' }}>{formatearUSD(total)}</div>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
                            {formatearBs(totalBs)}
                        </div>
                    </div>
                </div>

                <button
                    onClick={onSiguiente}
                    disabled={carrito.length === 0}
                    className="btn btn-primary"
                    style={{
                        width: '100%',
                        padding: '1rem',
                        fontSize: '1rem',
                        fontWeight: '600',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}
                >
                    Siguiente →
                </button>
            </div>
        </div>
    );
};

export default CartTable;
