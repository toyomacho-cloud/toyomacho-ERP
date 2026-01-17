import React, { useState, useEffect } from 'react';
import { Save, MapPin } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';

const MovementForm = () => {
    const { products, addMovement } = useInventoryContext();
    const [formData, setFormData] = useState({
        productId: '',
        type: 'Entrada',
        quantity: '',
        location: '',
        reason: ''
    });

    const selectedProduct = products.find(p => p.id === parseInt(formData.productId));

    useEffect(() => {
        if (selectedProduct) {
            setFormData(prev => ({ ...prev, location: selectedProduct.location }));
        }
    }, [selectedProduct]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.productId || !formData.quantity) return;

        addMovement({
            ...formData,
            quantity: parseInt(formData.quantity)
        });

        // Reset form but keep type for convenience
        setFormData({
            productId: '',
            type: formData.type,
            quantity: '',
            location: '',
            reason: ''
        });
        alert('Movimiento registrado exitosamente');
    };

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Registrar Movimiento</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>

                <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Producto</label>
                    <select
                        required
                        value={formData.productId}
                        onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                        style={{ width: '100%' }}
                    >
                        <option value="">Seleccionar Producto...</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.sku} - {p.description} (Stock: {p.quantity})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tipo de Movimiento</label>
                    <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        style={{ width: '100%' }}
                    >
                        <option value="Entrada">Entrada (+)</option>
                        <option value="Salida">Salida (-)</option>
                        <option value="Ajuste">Ajuste (=)</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cantidad</label>
                    <input
                        required
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="0"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Ubicación</label>
                    <div style={{ position: 'relative' }}>
                        <MapPin size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Actualizar ubicación"
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Motivo / Notas</label>
                    <input
                        type="text"
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        placeholder="Ej. Compra de proveedor, Merma, Inventario inicial..."
                    />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        <Save size={20} /> Registrar
                    </button>
                </div>

            </form>
        </div>
    );
};

export default MovementForm;
