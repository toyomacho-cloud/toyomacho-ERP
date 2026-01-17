import React, { useState } from 'react';
import { ClipboardList, History, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import MovementForm from './MovementForm';

const InventoryControl = () => {
    const { movements } = useInventoryContext();
    const [filterType, setFilterType] = useState('All');

    const filteredMovements = filterType === 'All'
        ? movements
        : movements.filter(m => m.type === filterType);

    const getTypeIcon = (type) => {
        switch (type) {
            case 'Entrada': return <ArrowUpRight size={16} color="var(--success)" />;
            case 'Salida': return <ArrowDownRight size={16} color="var(--danger)" />;
            case 'Ajuste': return <RefreshCw size={16} color="var(--warning)" />;
            default: return null;
        }
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '2rem' }}>
                <h1>Control de Inventario</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Gestión de movimientos de stock y ubicación.</p>
            </header>

            <MovementForm />

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <History size={20} /> Historial de Movimientos
                    </h3>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{ width: 'auto' }}
                    >
                        <option value="All">Todos</option>
                        <option value="Entrada">Entradas</option>
                        <option value="Salida">Salidas</option>
                        <option value="Ajuste">Ajustes</option>
                    </select>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Fecha</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Tipo</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>SKU</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Producto</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Cant.</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Stock Final</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Ubicación</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Motivo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMovements.length > 0 ? (
                                filteredMovements.map((m) => (
                                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                            {new Date(m.date).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {getTypeIcon(m.type)} {m.type}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{m.sku}</td>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{m.productName}</td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                                            {m.type === 'Salida' ? '-' : m.type === 'Entrada' ? '+' : ''}{m.quantity}
                                        </td>
                                        <td style={{ padding: '1rem' }}>{m.newQuantity}</td>
                                        <td style={{ padding: '1rem' }}>{m.location}</td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{m.reason}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No hay movimientos registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InventoryControl;
