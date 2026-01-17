import React, { useState } from 'react';
import { Building, Plus, Edit2, Trash2, Save, X, MapPin, User } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';

const Warehouses = () => {
    const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse } = useInventoryContext();
    const [showForm, setShowForm] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        manager: '',
        active: true
    });

    const resetForm = () => {
        setFormData({
            name: '',
            location: '',
            manager: '',
            active: true
        });
        setEditingWarehouse(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingWarehouse) {
                await updateWarehouse(editingWarehouse.id, formData);
            } else {
                await addWarehouse(formData);
            }
            resetForm();
        } catch (error) {
            console.error('Error saving warehouse:', error);
            alert('Error al guardar el almacén');
        }
    };

    const handleEdit = (warehouse) => {
        setFormData({
            name: warehouse.name,
            location: warehouse.location || '',
            manager: warehouse.manager || '',
            active: warehouse.active !== false
        });
        setEditingWarehouse(warehouse);
        setShowForm(true);
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`¿Estás seguro de eliminar el almacén "${name}"?\n\nEsta acción no se puede deshacer.`)) {
            try {
                await deleteWarehouse(id);
            } catch (error) {
                console.error('Error deleting warehouse:', error);
                alert('Error al eliminar el almacén');
            }
        }
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1><Building size={32} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Almacenes / Tiendas</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Gestiona las ubicaciones físicas de tu inventario</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={20} /> Nuevo Almacén
                </button>
            </header>

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Almacenes</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{warehouses.length}</div>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Activos</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', color: 'var(--success)' }}>
                        {warehouses.filter(w => w.active !== false).length}
                    </div>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Inactivos</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', color: 'var(--warning)' }}>
                        {warehouses.filter(w => w.active === false).length}
                    </div>
                </div>
            </div>

            {/* Warehouses Table */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
                {warehouses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <Building size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <h3>No hay almacenes registrados</h3>
                        <p>Crea tu primer almacén para comenzar a gestionar inventario por ubicación</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowForm(true)}
                            style={{ marginTop: '1rem' }}
                        >
                            <Plus size={18} /> Crear Primer Almacén
                        </button>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Nombre</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Ubicación</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Encargado</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Estado</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {warehouses.map((warehouse) => (
                                <tr key={warehouse.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Building size={20} color="var(--accent-primary)" />
                                            <strong>{warehouse.name}</strong>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                        {warehouse.location ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <MapPin size={16} />
                                                {warehouse.location}
                                            </div>
                                        ) : (
                                            <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Sin ubicación</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                        {warehouse.manager ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <User size={16} />
                                                {warehouse.manager}
                                            </div>
                                        ) : (
                                            <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Sin asignar</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span className={warehouse.active !== false ? 'badge-success' : 'badge-warning'}
                                            style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                                            {warehouse.active !== false ? '✓ Activo' : '○ Inactivo'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handleEdit(warehouse)}
                                                style={{ padding: '0.5rem' }}
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => handleDelete(warehouse.id, warehouse.name)}
                                                style={{ padding: '0.5rem' }}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Form Modal */}
            {showForm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50
                }}>
                    <div className="glass-panel animate-fade-in" style={{
                        width: '100%',
                        maxWidth: '500px',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)',
                        position: 'relative'
                    }}>
                        <button
                            onClick={resetForm}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ marginBottom: '1.5rem' }}>
                            {editingWarehouse ? 'Editar Almacén' : 'Nuevo Almacén'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                    Nombre del Almacén *
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Tienda Centro"
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                    Ubicación / Dirección
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Ej: Av. Principal #123, Centro"
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                    Encargado / Responsable
                                </label>
                                <input
                                    type="text"
                                    value={formData.manager}
                                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.active}
                                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                    />
                                    <span>Almacén Activo</span>
                                </label>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                                    Los almacenes inactivos no aparecerán en los formularios
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={resetForm}
                                    style={{ flex: 1 }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    <Save size={18} />
                                    {editingWarehouse ? 'Actualizar' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Warehouses;
