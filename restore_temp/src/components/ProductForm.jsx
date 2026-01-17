import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Plus } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';

const ProductForm = ({ isOpen, onClose, editProduct }) => {
    const { products, brands, categories, addProduct, updateProduct, addBrand, addCategory } = useInventoryContext();
    const [formData, setFormData] = useState({
        sku: '',
        reference: '',
        description: '',
        category: '',
        brand: '',
        location: '',
        quantity: '',
        price: '',
        status: 'In Stock'
    });

    const [showBrandModal, setShowBrandModal] = useState(false);
    const [brandForm, setBrandForm] = useState({ name: '', code: '' });

    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [categoryForm, setCategoryForm] = useState({ name: '' });

    useEffect(() => {
        if (editProduct) {
            setFormData(editProduct);
        } else {
            setFormData({
                sku: '',
                reference: '',
                description: '',
                category: '',
                brand: '',
                location: '',
                quantity: '',
                price: '',
                status: 'In Stock'
            });
        }
    }, [editProduct, isOpen]);

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

        const newSku = `${brandCode}${catCode}-${nextSeq}`;
        setFormData(prev => ({ ...prev, sku: newSku }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const productData = {
            ...formData,
            price: parseFloat(formData.price) || 0,
            quantity: parseInt(formData.quantity) || 0
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
            // Auto-generate the next sequential category code
            const maxCode = categories.reduce((max, cat) => {
                const numCode = parseInt(cat.code) || 0;
                return numCode > max ? numCode : max;
            }, 0);
            const nextCode = (maxCode + 1).toString().padStart(3, '0');

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
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Referencia</label>
                        <input
                            type="text"
                            value={formData.reference}
                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                            placeholder="REF-123"
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
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Existencia</label>
                        <input
                            required
                            type="number"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            placeholder="0"
                        />
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

                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
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
