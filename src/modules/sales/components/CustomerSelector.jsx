/**
 * CustomerSelector Component
 * Selector de cliente con busqueda y opcion de venta rapida
 */
import React, { useState, useMemo } from 'react';
import { User, X, Search, UserPlus } from 'lucide-react';

const CustomerSelector = ({
    clientes,
    clienteSeleccionado,
    tipoCliente,
    onSeleccionarCliente,
    onVentaRapida,
    onAnterior,
    onSiguiente
}) => {
    const [terminoBusqueda, setTerminoBusqueda] = useState('');

    // Filtrar clientes por busqueda
    const clientesFiltrados = useMemo(() => {
        if (!terminoBusqueda.trim()) {
            return clientes.slice(0, 10);
        }
        const termino = terminoBusqueda.toLowerCase();
        return clientes.filter(c =>
            (c.name || c.nombre || '').toLowerCase().includes(termino) ||
            (c.rif || '').toLowerCase().includes(termino) ||
            (c.phone || c.telefono || '').includes(termino)
        ).slice(0, 10);
    }, [clientes, terminoBusqueda]);

    const clienteActual = clienteSeleccionado;
    const nombreCliente = tipoCliente === 'rapida'
        ? 'Venta Rapida'
        : clienteActual?.name || clienteActual?.nombre || 'Nuevo Cliente';
    const rifCliente = tipoCliente === 'rapida'
        ? 'Sin registro fiscal'
        : clienteActual?.rif || 'N/A';

    return (
        <div className="glass-panel" style={{
            padding: '2rem',
            maxWidth: '600px',
            margin: '0 auto',
            width: '100%',
            alignSelf: 'start',
            borderRadius: 'var(--radius-lg)'
        }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Seleccionar Cliente</h2>

            {/* Tarjeta de cliente actual */}
            <div style={{
                padding: '1rem',
                border: '1px solid var(--primary)',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.1)',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <User size={20} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 'bold' }}>{nombreCliente}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {rifCliente}
                        </div>
                    </div>
                </div>
                {tipoCliente !== 'rapida' && (
                    <button
                        onClick={onVentaRapida}
                        style={{
                            color: 'var(--text-secondary)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Buscar clientes */}
            <div style={{ marginBottom: '1rem', position: 'relative' }}>
                <Search
                    size={18}
                    style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-secondary)'
                    }}
                />
                <input
                    type="text"
                    placeholder="Buscar cliente por nombre, RIF o telefono..."
                    value={terminoBusqueda}
                    onChange={(e) => setTerminoBusqueda(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                    }}
                />
            </div>

            {/* Lista de clientes */}
            <div style={{
                display: 'grid',
                gap: '0.5rem',
                maxHeight: '300px',
                overflowY: 'auto',
                marginBottom: '1rem'
            }}>
                {clientesFiltrados.map(cliente => (
                    <div
                        key={cliente.id}
                        onClick={() => onSeleccionarCliente(cliente)}
                        style={{
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            border: clienteSeleccionado?.id === cliente.id
                                ? '2px solid var(--primary)'
                                : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            background: clienteSeleccionado?.id === cliente.id
                                ? 'rgba(59, 130, 246, 0.05)'
                                : 'transparent',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                            if (clienteSeleccionado?.id !== cliente.id) {
                                e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (clienteSeleccionado?.id !== cliente.id) {
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                    >
                        <span style={{ fontWeight: clienteSeleccionado?.id === cliente.id ? '600' : '400' }}>
                            {cliente.name || cliente.nombre}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            {cliente.rif || 'Sin RIF'}
                        </span>
                    </div>
                ))}

                {clientesFiltrados.length === 0 && (
                    <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: 'var(--text-secondary)'
                    }}>
                        No se encontraron clientes
                    </div>
                )}
            </div>

            {/* Opcion de venta rapida */}
            <button
                onClick={onVentaRapida}
                className={`btn ${tipoCliente === 'rapida' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                    width: '100%',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                }}
            >
                <User size={18} />
                Continuar como Venta Rapida
            </button>

            {/* Botones de navegacion */}
            <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                    onClick={onAnterior}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                >
                    ← Atras
                </button>
                <button
                    onClick={onSiguiente}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                >
                    Continuar →
                </button>
            </div>
        </div>
    );
};

export default CustomerSelector;
