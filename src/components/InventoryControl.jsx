import React, { useState, useMemo } from 'react';
import { ClipboardList, History, ArrowUpRight, ArrowDownRight, RefreshCw, Check, X, Clock, Plus, Settings, Edit2, Trash2 } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import MovementForm from './MovementForm';
import ProductForm from './ProductForm';

const InventoryControl = () => {
    const { movements, products, approveMovement, rejectMovement, categories = [], updateCategory, deleteCategory } = useInventoryContext();
    const { isAdmin } = useAuth();

    // Create a map for quick product lookup by id
    const productMap = useMemo(() => {
        const map = new Map();
        products.forEach(p => map.set(p.id, p));
        return map;
    }, [products]);

    // Helper to get product info from movement
    const getProductInfo = (movement) => {
        const product = productMap.get(movement.product_id || movement.productId);
        return {
            name: movement.productName || product?.description || 'Producto no encontrado',
            location: movement.location || product?.location || '-',
            sku: movement.sku || product?.sku || product?.reference || '-'
        };
    };
    const [filterType, setFilterType] = useState('All');
    const [showProductModal, setShowProductModal] = useState(false);

    // Category Manager State
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null); // { id, name }
    const [editName, setEditName] = useState('');

    const handleEditCategory = (cat) => {
        setEditingCategory(cat);
        setEditName(cat.name);
    };

    const handleSaveCategory = async () => {
        if (!editName.trim()) return;
        try {
            await updateCategory(editingCategory.id, editingCategory.name, editName.trim());
            setEditingCategory(null);
            setEditName('');
            alert('Categoría actualizada exitosamente');
        } catch (error) {
            console.error('Error updating category:', error);
            alert('Error al actualizar categoría');
        }
    };

    const handleDeleteCategory = async (id) => {
        if (window.confirm('¿Está seguro de eliminar esta categoría? Esta acción es irreversible.')) {
            try {
                await deleteCategory(id);
                alert('Categoría eliminada');
            } catch (error) {
                console.error('Error deleting category:', error);
                alert('Error al eliminar categoría');
            }
        }
    };

    // Filter pending movements (Admin only)
    const pendingMovements = movements.filter(m => m.status === 'pending');

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
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Control de Inventario</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Gestión de movimientos de stock y ubicación.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => setShowCategoryManager(true)}>
                        <Settings size={20} /> Categorías
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowProductModal(true)}>
                        <Plus size={20} /> Nuevo Producto
                    </button>
                </div>
            </header>

            <MovementForm />

            {/* Pending Requests Section (Admin Only) */}
            {isAdmin() && pendingMovements.length > 0 && (
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem', border: '1px solid var(--warning)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', marginTop: 0 }}>
                        <Clock size={20} /> Solicitudes Pendientes ({pendingMovements.length})
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '0.75rem' }}>Fecha</th>
                                    <th style={{ padding: '0.75rem' }}>Producto</th>
                                    <th style={{ padding: '0.75rem' }}>Tipo</th>
                                    <th style={{ padding: '0.75rem' }}>Cant.</th>
                                    <th style={{ padding: '0.75rem' }}>Solicitante</th>
                                    <th style={{ padding: '0.75rem' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingMovements.map(m => {
                                    const productInfo = getProductInfo(m);
                                    return (
                                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{new Date(m.date).toLocaleString()}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ fontWeight: 'bold' }}>{productInfo.sku}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{productInfo.name}</div>
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>{m.type}</td>
                                            <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{m.quantity}</td>
                                            <td style={{ padding: '0.75rem' }}>{m.createdBy}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('¿Aprobar solicitud?')) approveMovement(m);
                                                        }}
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                                    >
                                                        <Check size={14} style={{ marginRight: '4px' }} /> Aprobar
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('¿Rechazar solicitud?')) rejectMovement(m.id);
                                                        }}
                                                        className="btn btn-danger"
                                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                                    >
                                                        <X size={14} style={{ marginRight: '4px' }} /> Rechazar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', position: 'relative', zIndex: 10 }}>
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
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', width: '140px' }}>Fecha</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', width: '100px' }}>Tipo</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', width: '100px' }}>SKU</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Producto</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', width: '80px', textAlign: 'center' }}>Cant.</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', width: '80px', textAlign: 'center' }}>Stock</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', width: '100px' }}>Ubicación</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', width: '100px' }}>Status</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', width: '150px' }}>Usuario</th>
                                <th style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>Motivo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMovements.length > 0 ? (
                                filteredMovements.map((m) => {
                                    const productInfo = getProductInfo(m);
                                    return (
                                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {new Date(m.date).toLocaleDateString()} <small>{new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {getTypeIcon(m.type)} {m.type}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{productInfo.sku}</td>
                                            <td style={{ padding: '0.75rem', fontWeight: 500 }}>{productInfo.name}</td>
                                            <td style={{ padding: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>
                                                {m.type === 'Salida' ? '-' : m.type === 'Entrada' ? '+' : ''}{m.quantity}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{m.new_qty ?? m.newQty ?? '-'}</td>
                                            <td style={{ padding: '0.75rem' }}>{productInfo.location}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.7rem',
                                                    background: m.status === 'pending' ? 'var(--warning-bg)' :
                                                        m.status === 'rejected' ? 'var(--danger-bg)' : 'var(--success-bg)',
                                                    color: m.status === 'pending' ? 'var(--warning)' :
                                                        m.status === 'rejected' ? 'var(--danger)' : 'var(--success)',
                                                    border: `1px solid ${m.status === 'pending' ? 'var(--warning)' :
                                                        m.status === 'rejected' ? 'var(--danger)' : 'var(--success)'}`
                                                }}>
                                                    {m.status === 'pending' ? 'Pendiente' :
                                                        m.status === 'rejected' ? 'Recha.' : 'Apro.'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{
                                                        width: '20px', height: '20px', borderRadius: '50%',
                                                        background: 'var(--accent-primary)', color: 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.65rem', fontWeight: 'bold', flexShrink: 0
                                                    }}>
                                                        {m.createdBy ? m.createdBy.charAt(0).toUpperCase() : 'S'}
                                                    </div>
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>
                                                        {m.createdBy || 'Sistema'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {m.reason}
                                            </td>
                                        </tr>
                                    );
                                })
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

            <ProductForm
                isOpen={showProductModal}
                onClose={() => setShowProductModal(false)}
                editProduct={null}
            />

            {/* Category Manager Modal */}
            {showCategoryManager && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Gestionar Categorías</h2>
                            <button onClick={() => setShowCategoryManager(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {categories.length === 0 ? (
                                <p className="text-secondary text-center">No hay categorías registradas</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {[...categories].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(cat => (
                                        <div key={cat.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 'var(--radius-md)' }}>
                                            {editingCategory && editingCategory.id === cat.id ? (
                                                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <button className="btn btn-success btn-sm" onClick={handleSaveCategory}><Check size={16} /></button>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingCategory(null)}><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontWeight: '500' }}>{cat.name}</span>
                                                        {cat.code && (
                                                            <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                                                                {cat.code}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => handleEditCategory(cat)}
                                                            title="Editar nombre"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => handleDeleteCategory(cat.id)}
                                                            title="Eliminar categoría"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryControl;
