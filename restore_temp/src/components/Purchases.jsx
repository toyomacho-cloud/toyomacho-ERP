import React, { useState, useEffect } from 'react';
import { ShoppingCart, Save, FileText, Plus, Edit2, UserPlus, Trash2, CheckCircle, Search } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import ProductForm from './ProductForm';

const Purchases = () => {
    const { products, purchases, providers, addPurchase, addProvider } = useInventoryContext();

    // Header State
    const [headerData, setHeaderData] = useState({
        providerId: '',
        invoiceNumber: ''
    });

    // Item Form State
    const [itemData, setItemData] = useState({
        productId: '',
        quantity: '',
        unit: 'Pza',
        cost: ''
    });

    // Search State
    const [searchQuery, setSearchQuery] = useState('');

    // Cart State
    const [cart, setCart] = useState([]);

    const [providerForm, setProviderForm] = useState({ name: '', contact: '' });
    const [showProviderModal, setShowProviderModal] = useState(false);

    // Product Modal State
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const selectedProduct = products.find(p => p.id === parseInt(itemData.productId));
    const selectedProvider = providers.find(p => p.id === parseInt(headerData.providerId));

    // Filter products based on search query
    const filteredProducts = products.filter(p =>
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.reference.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Auto-select if only one match
    useEffect(() => {
        if (searchQuery && filteredProducts.length === 1) {
            setItemData(prev => ({ ...prev, productId: filteredProducts[0].id }));
        }
    }, [searchQuery, filteredProducts]);

    const handleAddItem = () => {
        if (!itemData.productId || !itemData.quantity || !itemData.cost) return;

        const newItem = {
            ...itemData,
            tempId: Date.now(),
            productName: selectedProduct.description,
            productSku: selectedProduct.sku,
            total: (parseFloat(itemData.cost) || 0) * parseInt(itemData.quantity)
        };

        setCart([...cart, newItem]);
        setItemData({
            productId: '',
            quantity: '',
            unit: 'Pza',
            cost: ''
        });
        setSearchQuery(''); // Reset search
    };

    const handleRemoveItem = (tempId) => {
        setCart(cart.filter(item => item.tempId !== tempId));
    };

    const handleFinalizePurchase = () => {
        if (!headerData.providerId || !headerData.invoiceNumber) {
            alert('Por favor complete los datos del proveedor y factura.');
            return;
        }
        if (cart.length === 0) {
            alert('Agregue al menos un producto a la lista.');
            return;
        }

        const purchaseBatch = cart.map(item => ({
            providerId: headerData.providerId,
            providerName: selectedProvider.name,
            invoiceNumber: headerData.invoiceNumber,
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            quantity: item.quantity,
            unit: item.unit,
            cost: item.cost,
            total: item.total
        }));

        addPurchase(purchaseBatch);

        // Reset all
        setCart([]);
        setHeaderData({ providerId: '', invoiceNumber: '' });
        alert('Compra registrada exitosamente.');
    };

    const handleProviderSubmit = (e) => {
        e.preventDefault();
        addProvider(providerForm);
        setProviderForm({ name: '', contact: '' });
        setShowProviderModal(false);
    };

    const handleNewProduct = () => {
        setEditingProduct(null);
        setShowProductModal(true);
    };

    const handleEditProduct = () => {
        if (selectedProduct) {
            setEditingProduct(selectedProduct);
            setShowProductModal(true);
        }
    };

    const cartTotal = cart.reduce((acc, item) => acc + item.total, 0);

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '2rem' }}>
                <h1>Compras</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Registro de adquisiciones multi-producto.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>

                {/* Left Column: Form */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>1. Datos de Compra</h3>

                    {/* Header Fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Proveedor</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <select
                                    value={headerData.providerId}
                                    onChange={(e) => setHeaderData({ ...headerData, providerId: e.target.value })}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Seleccionar...</option>
                                    {providers.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowProviderModal(true)}>
                                    <UserPlus size={18} />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>No. Factura</label>
                            <input
                                type="text"
                                value={headerData.invoiceNumber}
                                onChange={(e) => setHeaderData({ ...headerData, invoiceNumber: e.target.value })}
                                placeholder="F-12345"
                            />
                        </div>
                    </div>

                    <h3 style={{ marginBottom: '1.5rem' }}>2. Agregar Productos</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'end' }}>

                        {/* Search Field */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Búsqueda Rápida (Teclado)</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Escribe SKU, Referencia o Nombre..."
                                    style={{ paddingLeft: '2.2rem', width: '100%' }}
                                />
                            </div>
                        </div>

                        {/* Product Selection */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Producto Seleccionado</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <select
                                    value={itemData.productId}
                                    onChange={(e) => setItemData({ ...itemData, productId: e.target.value })}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">
                                        {filteredProducts.length === 0 ? 'No se encontraron productos' : 'Seleccionar de la lista...'}
                                    </option>
                                    {filteredProducts.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.sku} / {p.reference} - {p.description}
                                        </option>
                                    ))}
                                </select>
                                <button type="button" className="btn btn-secondary" onClick={handleNewProduct}><Plus size={18} /></button>
                                <button type="button" className="btn btn-secondary" onClick={handleEditProduct} disabled={!itemData.productId}><Edit2 size={18} /></button>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cantidad</label>
                            <input
                                type="number" min="1"
                                value={itemData.quantity}
                                onChange={(e) => setItemData({ ...itemData, quantity: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Unidad</label>
                            <select
                                value={itemData.unit}
                                onChange={(e) => setItemData({ ...itemData, unit: e.target.value })}
                                style={{ width: '100%' }}
                            >
                                <option value="Pza">Pieza</option>
                                <option value="Caja">Caja</option>
                                <option value="Kg">Kg</option>
                                <option value="Lt">Litro</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Costo U.</label>
                            <input
                                type="number" step="0.01"
                                value={itemData.cost}
                                onChange={(e) => setItemData({ ...itemData, cost: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>

                        <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                            <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={handleAddItem}>
                                <Plus size={18} /> Agregar a la Lista
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Cart & Summary */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Resumen de Compra</h3>

                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', minHeight: '200px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                        {cart.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <tr>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Prod.</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Cant.</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total</th>
                                        <th style={{ padding: '0.5rem' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map(item => (
                                        <tr key={item.tempId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.5rem' }}>{item.productName}</td>
                                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>{item.quantity} {item.unit}</td>
                                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>${item.total.toFixed(2)}</td>
                                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                                <button onClick={() => handleRemoveItem(item.tempId)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                Lista vacía
                            </div>
                        )}
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                            <span>Total:</span>
                            <span>${cartTotal.toFixed(2)}</span>
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            onClick={handleFinalizePurchase}
                            disabled={cart.length === 0}
                        >
                            <CheckCircle size={20} /> Finalizar Compra
                        </button>
                    </div>
                </div>
            </div>

            {/* History Table (Below) */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={20} /> Historial Detallado
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Fecha</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Proveedor</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Factura</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Producto</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Cant.</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map((p) => (
                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                        {new Date(p.date).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '1rem' }}>{p.providerName}</td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{p.invoiceNumber}</td>
                                    <td style={{ padding: '1rem' }}>{p.productName}</td>
                                    <td style={{ padding: '1rem' }}>{p.quantity} {p.unit}</td>
                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--success)' }}>
                                        ${p.total.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {showProviderModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60
                }}>
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', width: '400px' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Nuevo Proveedor</h3>
                        <form onSubmit={handleProviderSubmit}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nombre</label>
                                <input required type="text" value={providerForm.name} onChange={e => setProviderForm({ ...providerForm, name: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Contacto</label>
                                <input type="text" value={providerForm.contact} onChange={e => setProviderForm({ ...providerForm, contact: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowProviderModal(false)} style={{ flex: 1 }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ProductForm
                isOpen={showProductModal}
                onClose={() => setShowProductModal(false)}
                editProduct={editingProduct}
            />
        </div>
    );
};

export default Purchases;
