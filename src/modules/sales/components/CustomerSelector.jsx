/**
 * CustomerSelector Component
 * Selector de cliente con busqueda inteligente, creacion inline y venta rapida
 */
import React, { useState, useMemo } from 'react';
import { User, X, Search, UserPlus, ArrowLeft, ArrowRight, Phone, MapPin, FileText } from 'lucide-react';

const CustomerSelector = ({
    clientes,
    clienteSeleccionado,
    tipoCliente,
    onSeleccionarCliente,
    onVentaRapida,
    onCrearCliente,
    onAnterior,
    onSiguiente
}) => {
    const [terminoBusqueda, setTerminoBusqueda] = useState('');
    const [modoCrear, setModoCrear] = useState(false);
    const [nuevoCliente, setNuevoCliente] = useState({
        tipoDoc: 'V',
        documento: '',
        nombre: '',
        telefono: '',
        direccion: ''
    });
    const [guardando, setGuardando] = useState(false);

    // Busqueda inteligente: nombre, telefono, RIF, cedula
    const clientesFiltrados = useMemo(() => {
        if (!terminoBusqueda.trim()) {
            return clientes.slice(0, 15);
        }
        const termino = terminoBusqueda.toLowerCase().trim();
        return clientes.filter(c => {
            const nombre = (c.name || c.nombre || '').toLowerCase();
            const rif = (c.rif || '').toLowerCase();
            const telefono = (c.phone || c.telefono || '');
            const cedula = (c.cedula || c.documento || '').toLowerCase();

            return nombre.includes(termino) ||
                rif.includes(termino) ||
                telefono.includes(termino) ||
                cedula.includes(termino);
        }).slice(0, 15);
    }, [clientes, terminoBusqueda]);

    const handleCrearCliente = async () => {
        if (!nuevoCliente.nombre.trim()) {
            alert('El nombre es requerido');
            return;
        }
        if (!nuevoCliente.documento.trim()) {
            alert('El documento es requerido');
            return;
        }

        setGuardando(true);
        try {
            const clienteData = {
                name: nuevoCliente.nombre.trim(),
                rif: `${nuevoCliente.tipoDoc}-${nuevoCliente.documento}`,
                phone: nuevoCliente.telefono,
                address: nuevoCliente.direccion
            };

            // Llamar al callback de crear si existe
            if (onCrearCliente) {
                await onCrearCliente(clienteData);
            }

            // Seleccionar el cliente recien creado (simulado)
            onSeleccionarCliente({
                ...clienteData,
                id: Date.now() // ID temporal
            });

            setModoCrear(false);
            setNuevoCliente({ tipoDoc: 'V', documento: '', nombre: '', telefono: '', direccion: '' });
        } catch (error) {
            console.error('Error creando cliente:', error);
            alert('Error al crear cliente');
        }
        setGuardando(false);
    };

    const nombreCliente = tipoCliente === 'rapida'
        ? 'Venta Rapida (Sin Cliente)'
        : clienteSeleccionado?.name || clienteSeleccionado?.nombre || 'Sin seleccionar';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            maxWidth: '650px',
            margin: '0 auto'
        }}>
            {/* Header */}
            <div className="glass-panel" style={{
                padding: '1.5rem',
                background: 'white',
                borderRadius: 'var(--radius-lg)'
            }}>
                <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem' }}>
                    <User size={22} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Seleccionar Cliente
                </h2>

                {/* Cliente actual seleccionado */}
                <div style={{
                    padding: '1rem',
                    border: tipoCliente === 'rapida' ? '2px solid #94a3b8' : '2px solid var(--primary)',
                    borderRadius: '12px',
                    background: tipoCliente === 'rapida' ? '#f8fafc' : 'rgba(59, 130, 246, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '45px',
                            height: '45px',
                            borderRadius: '50%',
                            background: tipoCliente === 'rapida' ? '#94a3b8' : 'var(--primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <User size={22} />
                        </div>
                        <div>
                            <div style={{ fontWeight: '700', fontSize: '1.05rem' }}>{nombreCliente}</div>
                            {clienteSeleccionado && (
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                    {clienteSeleccionado.rif || 'Sin RIF'} • {clienteSeleccionado.phone || clienteSeleccionado.telefono || 'Sin telefono'}
                                </div>
                            )}
                        </div>
                    </div>
                    {tipoCliente !== 'rapida' && (
                        <button
                            onClick={onVentaRapida}
                            style={{
                                color: '#64748b',
                                background: '#f1f5f9',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                borderRadius: '8px'
                            }}
                            title="Quitar cliente"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Busqueda o Formulario Crear */}
            <div className="glass-panel" style={{
                padding: '1.5rem',
                background: 'white',
                borderRadius: 'var(--radius-lg)'
            }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button
                        onClick={() => setModoCrear(false)}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: !modoCrear ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                            borderRadius: '8px',
                            background: !modoCrear ? 'rgba(59, 130, 246, 0.1)' : 'white',
                            cursor: 'pointer',
                            fontWeight: !modoCrear ? '600' : '400',
                            color: !modoCrear ? 'var(--primary)' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Search size={16} /> Buscar Existente
                    </button>
                    <button
                        onClick={() => setModoCrear(true)}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: modoCrear ? '2px solid #16a34a' : '1px solid #e2e8f0',
                            borderRadius: '8px',
                            background: modoCrear ? 'rgba(22, 163, 74, 0.1)' : 'white',
                            cursor: 'pointer',
                            fontWeight: modoCrear ? '600' : '400',
                            color: modoCrear ? '#16a34a' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <UserPlus size={16} /> Crear Nuevo
                    </button>
                </div>

                {!modoCrear ? (
                    <>
                        {/* Campo de busqueda */}
                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                            <Search
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#94a3b8'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, RIF, telefono o cedula..."
                                value={terminoBusqueda}
                                onChange={(e) => setTerminoBusqueda(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.85rem 1rem 0.85rem 2.75rem',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.95rem',
                                    background: '#f8fafc'
                                }}
                            />
                        </div>

                        {/* Lista de clientes */}
                        <div style={{
                            maxHeight: '280px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                        }}>
                            {clientesFiltrados.map(cliente => (
                                <div
                                    key={cliente.id}
                                    onClick={() => onSeleccionarCliente(cliente)}
                                    style={{
                                        padding: '0.85rem 1rem',
                                        borderRadius: '10px',
                                        border: clienteSeleccionado?.id === cliente.id
                                            ? '2px solid var(--primary)'
                                            : '1px solid #e2e8f0',
                                        cursor: 'pointer',
                                        background: clienteSeleccionado?.id === cliente.id
                                            ? 'rgba(59, 130, 246, 0.05)'
                                            : 'white',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#1e293b' }}>
                                            {cliente.name || cliente.nombre}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            {cliente.rif || 'Sin RIF'}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'right' }}>
                                        {cliente.phone || cliente.telefono || ''}
                                    </div>
                                </div>
                            ))}

                            {clientesFiltrados.length === 0 && (
                                <div style={{
                                    padding: '2rem',
                                    textAlign: 'center',
                                    color: '#94a3b8'
                                }}>
                                    No se encontraron clientes
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* Formulario crear cliente */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Tipo y numero de documento */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                value={nuevoCliente.tipoDoc}
                                onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipoDoc: e.target.value })}
                                style={{
                                    width: '80px',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc'
                                }}
                            >
                                <option value="V">V</option>
                                <option value="J">J</option>
                                <option value="E">E</option>
                                <option value="G">G</option>
                                <option value="P">P</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Numero de documento *"
                                value={nuevoCliente.documento}
                                onChange={(e) => setNuevoCliente({ ...nuevoCliente, documento: e.target.value })}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc'
                                }}
                            />
                        </div>

                        {/* Nombre */}
                        <div style={{ position: 'relative' }}>
                            <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Nombre o Razon Social *"
                                value={nuevoCliente.nombre}
                                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc'
                                }}
                            />
                        </div>

                        {/* Telefono */}
                        <div style={{ position: 'relative' }}>
                            <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="tel"
                                placeholder="Telefono"
                                value={nuevoCliente.telefono}
                                onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc'
                                }}
                            />
                        </div>

                        {/* Direccion */}
                        <div style={{ position: 'relative' }}>
                            <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Direccion (opcional)"
                                value={nuevoCliente.direccion}
                                onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc'
                                }}
                            />
                        </div>

                        <button
                            onClick={handleCrearCliente}
                            disabled={guardando}
                            className="btn btn-primary"
                            style={{ padding: '0.85rem', marginTop: '0.5rem' }}
                        >
                            <UserPlus size={18} style={{ marginRight: '0.5rem' }} />
                            {guardando ? 'Guardando...' : 'Crear y Seleccionar Cliente'}
                        </button>
                    </div>
                )}
            </div>

            {/* Boton Venta Rapida */}
            <button
                onClick={onVentaRapida}
                style={{
                    padding: '1rem',
                    border: tipoCliente === 'rapida' ? '2px solid #16a34a' : '2px solid #e2e8f0',
                    borderRadius: '12px',
                    background: tipoCliente === 'rapida' ? '#dcfce7' : 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                    color: tipoCliente === 'rapida' ? '#16a34a' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                }}
            >
                <User size={20} />
                Continuar sin Cliente (Venta Rapida)
            </button>

            {/* Navegacion */}
            <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                    onClick={onAnterior}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '1rem' }}
                >
                    <ArrowLeft size={18} style={{ marginRight: '0.5rem' }} />
                    Atras
                </button>
                <button
                    onClick={onSiguiente}
                    className="btn btn-primary"
                    style={{ flex: 2, padding: '1rem', fontWeight: '700' }}
                >
                    Continuar al Pago
                    <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                </button>
            </div>
        </div>
    );
};

export default CustomerSelector;
