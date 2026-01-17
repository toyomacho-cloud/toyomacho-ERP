import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Plus } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';

const ProductForm = ({ isOpen, onClose, editProduct }) => {
    const { products, brands, categories, warehouses, addProduct, updateProduct, addBrand, addCategory } = useInventoryContext();
    const [formData, setFormData] = useState({
        sku: '',
        reference: '',
        description: '',
        category: '',
        brand: '',
        location: '',
        unit: '',
        stockByWarehouse: {},
        totalQuantity: 0,
        price: '',
        status: 'In Stock'
    });

    const [showBrandModal, setShowBrandModal] = useState(false);
    const [brandForm, setBrandForm] = useState({ name: '', code: '' });

    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [categoryForm, setCategoryForm] = useState({ name: '' });

    useEffect(() => {
        if (editProduct) {
            setFormData({
                ...editProduct,
                stockByWarehouse: editProduct.stockByWarehouse || {},
                totalQuantity: editProduct.totalQuantity || 0
            });
        } else {
            // Initialize with empty stock for all active warehouses
            const initialStock = {};
            warehouses.filter(w => w.active !== false).forEach(w => {
                initialStock[w.id] = 0;
            });

            setFormData({
                sku: '',
                reference: '',
                description: '',
                category: '',
                brand: '',
                location: '',
                unit: '',
                stockByWarehouse: initialStock,
                totalQuantity: 0,
                price: '',
                status: 'In Stock'
            });
        }
    }, [editProduct, isOpen, warehouses]);

    // Auto-generate SKU when Brand or Category changes (Only for new products)
    useEffect(() => {
        if (!editProduct && formData.brand && formData.category) {
            generateSku(false); // Pass false to suppress alerts
        }
    }, [formData.brand, formData.category, editProduct]);

    if (!isOpen) return null;

    const generateSku = (showAlert = true) => {
        if (!formData.brand || !formData.category) {
            if (showAlert) alert('Por favor seleccione la Marca y Categoría primero.');
            return;
        }

        // 1. Brand Code (From selected brand)
        const selectedBrand = brands.find(b => b.name === formData.brand);
        const brandCode = selectedBrand ? selectedBrand.code : formData.brand.substring(0, 3).toUpperCase();

        // 2. Category Code (From selected category)
        const selectedCategory = categories.find(c => c.name === formData.category);
        const catCode = selectedCategory ? selectedCategory.code : '999';

        // 3. Sequence
        const existingCount = products.filter(p =>
            p.brand === formData.brand &&
            p.category === formData.category
        ).length;

        const nextSeq = (existingCount + 1).toString().padStart(3, '0');

        const newSku = `${brandCode}-${catCode}-${nextSeq}`;
        setFormData(prev => ({ ...prev, sku: newSku }));
    };

    // Helper: Update stock for a specific warehouse
    const handleStockChange = (warehouseId, value) => {
        const newStock = {
            ...formData.stockByWarehouse,
            [warehouseId]: parseInt(value) || 0
        };

        const total = Object.values(newStock).reduce((sum, qty) => sum + parseInt(qty || 0), 0);

        setFormData(prev => ({
            ...prev,
            stockByWarehouse: newStock,
            totalQuantity: total
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const productData = {
            ...formData,
            price: parseFloat(formData.price) || 0,
            stockByWarehouse: formData.stockByWarehouse || {},
            totalQuantity: formData.totalQuantity || 0
        };

        if (editProduct) {
            updateProduct(editProduct.id, productData);
        } else {
            addProduct(productData);
        }
        onClose();
    };

    const handleBrandSubmit = (e) => {
        e.preventDefault();
        if (brandForm.name && brandForm.code) {
            addBrand({
                name: brandForm.name,
                code: brandForm.code.toUpperCase()
            });
            setBrandForm({ name: '', code: '' });
            setShowBrandModal(false);
        }
    };

    const handleCategorySubmit = (e) => {
        e.preventDefault();
        if (categoryForm.name) {
            // Auto-generate the next sequential category code (increments of 10)
            const maxCode = categories.reduce((max, cat) => {
                const numCode = parseInt(cat.code) || 0;
                return numCode > max ? numCode : max;
            }, 0);
            const nextCode = (maxCode + 10).toString().padStart(3, '0');

            addCategory({
                name: categoryForm.name,
                code: nextCode
            });
            setCategoryForm({ name: '' });
            setShowCategoryModal(false);
        }
    };

    return (
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
                maxWidth: '600px',
                padding: '2rem',
                borderRadius: 'var(--radius-lg)',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <button
                    onClick={onClose}
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

                <h2 style={{ marginBottom: '1.5rem' }}>{editProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                    {/* SKU & Reference */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>SKU</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                required
                                type="text"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                placeholder="SKU-001"
                                style={{ width: '100%' }}
                            />
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => generateSku(true)}
                                title="Generar SKU Automático"
                                style={{ padding: '0.5rem' }}
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            Referencia (Código del Fabricante/Proveedor)
                        </label>
                        <input
                            type="text"
                            value={formData.reference}
                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                            placeholder="Ej: REF-FAB-123"
                        />
                    </div>

                    {/* Description (Full Width) */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Descripción</label>
                        <input
                            required
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Nombre o descripción del producto"
                        />
                    </div>

                    {/* Category & Brand */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Categoría</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                style={{ width: '100%' }}
                            >
                                <option value="">Seleccionar...</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowCategoryModal(true)}
                                title="Nueva Categoría"
                                style={{ padding: '0.5rem' }}
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Marca</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                value={formData.brand}
                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                style={{ width: '100%' }}
                            >
                                <option value="">Seleccionar...</option>
                                {brands.map(b => (
                                    <option key={b.id} value={b.name}>{b.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowBrandModal(true)}
                                title="Nueva Marca"
                                style={{ padding: '0.5rem' }}
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Location & Quantity (Existencia) */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Ubicación</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Pasillo A-1"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Unidad de Medida</label>
                        <input
                            type="text"
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            placeholder="Ej: Unidad, Kg"
                        />
                    </div>

                    {/* Stock por Almacén (Full Width) */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 'bold' }}>
                            📦 Stock por Almacén
                        </label>

                        {editProduct && (
                            <div style={{
                                padding: '0.75rem',
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: '0.75rem',
                                fontSize: '0.875rem',
                                color: 'var(--accent-primary)'
                            }}>
                                ℹ️ El stock no puede editarse manualmente. Use Compras, Ventas o Transferencias para modificar el inventario.
                            </div>
                        )}

                        {warehouses.filter(w => w.active !== false).length === 0 ? (
                            <div style={{
                                padding: '1.5rem',
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: 'var(--radius-sm)',
                                textAlign: 'center',
                                color: 'var(--warning)'
                            }}>
                                ⚠️ No hay almacenes activos. Crea uno primero en el módulo de Almacenes.
                            </div>
                        ) : (
                            <div style={{
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                overflow: 'hidden'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--bg-secondary)' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                                Almacén
                                            </th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                                                Cantidad
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {warehouses.filter(w => w.active !== false).map((warehouse) => (
                                            <tr key={warehouse.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <div>
                                                        <strong>{warehouse.name}</strong>
                                                        {warehouse.location && (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                                📍 {warehouse.location}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={formData.stockByWarehouse[warehouse.id] || 0}
                                                        onChange={(e) => handleStockChange(warehouse.id, e.target.value)}
                                                        disabled={!!editProduct}
                                                        style={{
                                                            width: '100px',
                                                            textAlign: 'center',
                                                            fontWeight: 'bold',
                                                            cursor: editProduct ? 'not-allowed' : 'text',
                                                            opacity: editProduct ? 0.6 : 1
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                        <tr style={{ background: 'rgba(16, 185, 129, 0.1)', fontWeight: 'bold' }}>
                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                TOTAL:
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '1.25rem', color: 'var(--success)' }}>
                                                {formData.totalQuantity || 0}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Price & Status */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Precio ($)</label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Estado</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            style={{ width: '100%' }}
                        >
                            <option value="In Stock">En Stock</option>
                            <option value="Low Stock">Bajo Stock</option>
                            <option value="Out of Stock">Sin Stock</option>
                        </select>
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                            <Save size={20} /> Guardar Producto
                        </button>
                    </div>
                </form>
            </div>

            {/* Brand Modal */}
            {showBrandModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60
                }}>
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', width: '350px' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Nueva Marca</h3>
                        <form onSubmit={handleBrandSubmit}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nombre</label>
                                <input
                                    required
                                    type="text"
                                    value={brandForm.name}
                                    onChange={e => setBrandForm({ ...brandForm, name: e.target.value })}
                                    placeholder="Ej. Samsung"
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Código (3 Letras)</label>
                                <input
                                    required
                                    type="text"
                                    maxLength={3}
                                    value={brandForm.code}
                                    onChange={e => setBrandForm({ ...brandForm, code: e.target.value.toUpperCase() })}
                                    placeholder="Ej. SAM"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowBrandModal(false)} style={{ flex: 1 }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {showCategoryModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60
                }}>
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', width: '350px' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Nueva Categoría</h3>
                        <form onSubmit={handleCategorySubmit}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nombre</label>
                                <input
                                    required
                                    type="text"
                                    value={categoryForm.name}
                                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    placeholder="Ej. Electrónica"
                                />
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                💡 El código se asignará automáticamente
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCategoryModal(false)} style={{ flex: 1 }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductForm;
