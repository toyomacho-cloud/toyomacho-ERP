import React, { useState } from 'react';
import { Send, CheckCircle, Search, AlertTriangle } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import { useAuth, ROLES } from '../context/AuthContext';

const MovementForm = () => {
    const { products, addMovement } = useInventoryContext();
    const { userProfile, isAdmin } = useAuth();

    const [formData, setFormData] = useState({
        productId: '',
        type: 'Entrada',
        quantity: '',
        reason: '',
        location: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const isAlmacenista = userProfile?.role === ROLES.ALMACENISTA;
    const canApprove = isAdmin(); // Admin auto-approves

    // Filter products for search
    const filteredProducts = products.filter(p => {
        const term = searchTerm.toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const ref = (p.reference || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        return desc.includes(term) || ref.includes(term) || sku.includes(term);
    }).slice(0, 5); // Limit to 5 results

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProduct) {
            setMessage({ type: 'error', text: 'Seleccione un producto' });
            return;
        }

        setLoading(true);
        try {
            const status = canApprove ? 'approved' : 'pending';

            await addMovement({
                ...formData,
                productId: selectedProduct.id,
                status: status,
                userName: userProfile.displayName || userProfile.email || 'Usuario'
            });

            setMessage({
                type: 'success',
                text: status === 'approved'
                    ? 'Movimiento registrado exitosamente'
                    : 'Solicitud enviada para aprobación'
            });

            // Reset form
            setFormData({
                productId: '',
                type: 'Entrada',
                quantity: '',
                reason: '',
                location: ''
            });
            setSelectedProduct(null);
            setSearchTerm('');

            // Clear message after 3 seconds
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        }
        setLoading(false);
    };

    if (!isAlmacenista && !canApprove) {
        return null; // Hide for unauthorized users (Vendedor)
    }

    return (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', borderRadius: 'var(--radius-lg)', position: 'relative', zIndex: 20 }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {canApprove ? <CheckCircle size={20} /> : <Send size={20} />}
                {canApprove ? 'Registrar Movimiento' : 'Solicitar Movimiento'}
            </h3>

            {message.text && (
                <div className={`alert alert-${message.type}`} style={{ marginBottom: '1rem' }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', overflow: 'visible' }}>

                    {/* Product Search */}
                    <div style={{ position: 'relative', zIndex: 50 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Producto *</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Buscar por Referencia o Descripción..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    if (selectedProduct && e.target.value !== selectedProduct.description) {
                                        setSelectedProduct(null);
                                    }
                                }}
                                style={{ paddingRight: '2.5rem' }}
                                required={!selectedProduct}
                            />
                            <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        </div>

                        {/* Search Results Dropdown */}
                        {searchTerm && !selectedProduct && filteredProducts.length > 0 && (
                            <div className="glass-panel" style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 100,
                                padding: '0.5rem',
                                marginTop: '5px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                            }}>
                                {filteredProducts.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => {
                                            setSelectedProduct(p);
                                            setSearchTerm(p.description);
                                        }}
                                        style={{
                                            padding: '0.5rem',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid var(--border-color)',
                                            fontSize: '0.9rem'
                                        }}
                                        onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseOut={(e) => e.target.style.background = 'transparent'}
                                    >
                                        <div style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{p.reference || p.sku}</div>
                                        <div style={{ fontSize: '0.85em' }}>{p.description}</div>
                                        <div style={{ fontSize: '0.75em', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>SKU: {p.sku}</span>
                                            <span style={{ color: p.quantity > 0 ? 'var(--success)' : 'var(--danger)' }}>Stock: {p.quantity}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Type */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tipo *</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            required
                        >
                            <option value="Entrada">Entrada (+)</option>
                            <option value="Salida">Salida (-)</option>
                            <option value="Ajuste">Ajuste (=)</option>
                        </select>
                    </div>

                    {/* Quantity */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cantidad *</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            required
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Ubicación</label>
                        <input
                            type="text"
                            placeholder="Ej: Estante A-1"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>

                    {/* Reason */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Motivo / Observación</label>
                        <input
                            type="text"
                            placeholder="Ej: Reposición de inventario"
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        />
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '150px' }}>
                        {loading ? 'Procesando...' : (canApprove ? 'Registrar Movimiento' : 'Solicitar Aprobación')}
                    </button>
                </div>

                {!canApprove && (
                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={14} color="var(--warning)" />
                        Nota: Su solicitud quedará pendiente de aprobación por un administrador.
                    </div>
                )}
            </form>
        </div>
    );
};

export default MovementForm;
