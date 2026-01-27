/**
 * ProductSearch Component
 * Buscador de productos con dropdown de resultados
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Search, X, Package, Plus } from 'lucide-react';
import { buscarProductos, debounce } from '../services/salesService';

const ProductSearch = ({ productos, onAgregarProducto }) => {
    const [terminoBusqueda, setTerminoBusqueda] = useState('');
    const [resultados, setResultados] = useState([]);

    // Busqueda con debounce
    const busquedaDebounce = useMemo(() =>
        debounce((termino) => {
            const results = buscarProductos(termino, productos);
            setResultados(results);
        }, 300),
        [productos]
    );

    const manejarCambioBusqueda = useCallback((e) => {
        const termino = e.target.value;
        setTerminoBusqueda(termino);
        busquedaDebounce(termino);
    }, [busquedaDebounce]);

    const manejarSeleccionProducto = useCallback((producto) => {
        onAgregarProducto(producto);
        // Mantener el buscador abierto para agregar mas productos
    }, [onAgregarProducto]);

    const limpiarBusqueda = useCallback(() => {
        setTerminoBusqueda('');
        setResultados([]);
    }, []);

    return (
        <div className="glass-panel" style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
            border: 'none',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'visible',
            zIndex: 50,
            borderRadius: 'var(--radius-lg)'
        }}>
            {/* Campo de busqueda */}
            <div style={{ padding: '1.5rem', position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                    <Search
                        size={20}
                        style={{
                            position: 'absolute',
                            left: '16px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-secondary)'
                        }}
                    />
                    <input
                        type="text"
                        placeholder="🔍 Buscar producto por Codigo, Nombre o Referencia..."
                        value={terminoBusqueda}
                        onChange={manejarCambioBusqueda}
                        autoFocus
                        style={{
                            width: '100%',
                            padding: '1rem 1rem 1rem 3rem',
                            borderRadius: '12px',
                            border: '2px solid #e2e8f0',
                            background: '#f8fafc',
                            color: 'var(--text-primary)',
                            boxShadow: 'none',
                            fontSize: '1rem',
                            transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                    {terminoBusqueda && (
                        <button
                            onClick={limpiarBusqueda}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                color: '#94a3b8'
                            }}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Dropdown de resultados */}
                {terminoBusqueda.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '1.5rem',
                        right: '1.5rem',
                        background: 'white',
                        borderRadius: '0 0 12px 12px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        border: '1px solid #e2e8f0',
                        borderTop: 'none',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        zIndex: 100
                    }}>
                        {resultados.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                                <Package size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                <div>No se encontraron productos</div>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{
                                        background: '#f8fafc',
                                        borderBottom: '1px solid #e2e8f0',
                                        color: '#64748b',
                                        fontSize: '0.8rem',
                                        textAlign: 'left'
                                    }}>
                                        <th style={{ padding: '0.75rem 1rem' }}>Descripcion</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>SKU / Ref</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Precio</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Stock</th>
                                        <th style={{ padding: '0.75rem 1rem' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resultados.map(producto => (
                                        <tr
                                            key={producto.id}
                                            onClick={() => manejarSeleccionProducto(producto)}
                                            style={{
                                                borderBottom: '1px solid #f1f5f9',
                                                cursor: 'pointer',
                                                transition: 'background 0.1s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                        >
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#1e293b' }}>
                                                {producto.description}
                                                {producto.brand && (
                                                    <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '500' }}>
                                                        {producto.brand}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
                                                <div>{producto.sku}</div>
                                                {producto.reference && (
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                        Ref: {producto.reference}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{
                                                padding: '0.75rem 1rem',
                                                textAlign: 'right',
                                                fontWeight: 'bold',
                                                color: 'var(--success)'
                                            }}>
                                                ${(producto.price || 0).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                <span
                                                    className={`badge ${producto.quantity > 0 ? 'badge-success' : 'badge-danger'}`}
                                                    style={{ fontSize: '0.75rem' }}
                                                >
                                                    {producto.quantity}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                                <button
                                                    className="btn-sm btn-primary"
                                                    style={{ borderRadius: '20px', padding: '0.2rem 0.8rem' }}
                                                >
                                                    <Plus size={14} /> Agregar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Estado vacio */}
            {terminoBusqueda.length === 0 && (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    opacity: 0.6,
                    padding: '3rem'
                }}>
                    <div style={{ background: '#f1f5f9', padding: '2rem', borderRadius: '50%', marginBottom: '1rem' }}>
                        <Search size={48} />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                        Buscador de Productos
                    </h3>
                    <p style={{ maxWidth: '300px', textAlign: 'center', fontSize: '0.9rem' }}>
                        Escriba el nombre, codigo o referencia del producto para buscar y agregar al carrito.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ProductSearch;
