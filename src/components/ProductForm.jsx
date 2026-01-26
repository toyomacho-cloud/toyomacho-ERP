import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Plus } from 'lucide-react';

const ProductForm = ({
    isOpen,
    onClose,
    editProduct,
    products = [],
    brands = [],
    categories = [],
    addProduct,
    updateProduct,
    addBrand,
    addCategory
}) => {
    // Fallback: Extract unique brands from products if brands table is empty
    const effectiveBrands = brands.length > 0 ? brands :
        [...new Set(products.map(p => p.brand).filter(Boolean))]
            .map((name, idx) => ({ id: idx + 1, name, code: name.substring(0, 3).toUpperCase() }));

    // Fallback: Extract unique categories from products if categories table is empty
    const effectiveCategories = categories.length > 0 ? categories :
        [...new Set(products.map(p => p.category).filter(Boolean))]
            .map((name, idx) => ({ id: idx + 1, name, code: String((idx + 1) * 10).padStart(3, '0') }));

    // Context removed - using props
    const [formData, setFormData] = useState({
        sku: '',
        reference: '',
        description: '',
        category: '',
        brand: '',
        location: '',
        warehouse: 'PRINCIPAL',
        unit: '',
        quantity: 0,
        minStock: 5,
        price: '',
        status: 'In Stock'
    });

    const [showBrandModal, setShowBrandModal] = useState(false);
    const [brandForm, setBrandForm] = useState({ name: '', code: '' });

    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [categoryForm, setCategoryForm] = useState({ name: '' });

    // Searchable category dropdown state
    const [categorySearchTerm, setCategorySearchTerm] = useState('');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    // Searchable brand dropdown state
    const [brandSearchTerm, setBrandSearchTerm] = useState('');
    const [showBrandDropdown, setShowBrandDropdown] = useState(false);

    // Duplicate SKU detection
    const [isDuplicateSKU, setIsDuplicateSKU] = useState(false);

    // Filter categories based on search term
    const filteredCategories = categorySearchTerm
        ? effectiveCategories.filter(c => c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()))
        : effectiveCategories;

    // Filter brands based on search term
    const filteredBrands = brandSearchTerm
        ? effectiveBrands.filter(b => b.name.toLowerCase().includes(brandSearchTerm.toLowerCase()))
        : effectiveBrands;

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
                warehouse: 'PRINCIPAL',
                unit: '',
                quantity: 0,
                minStock: 5,
                price: '',
                status: 'In Stock'
            });
        }
    }, [editProduct, isOpen]);

    // Auto-generate SKU when Brand or Category changes (Only for new products)
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

        // 3. Sequence (Fix: Find Max Sequence + 1)
        const relatedProducts = products.filter(p =>
            p.brand === formData.brand &&
            p.category === formData.category
        );

        let maxSequence = 0;

        relatedProducts.forEach(p => {
            if (p.sku) {
                const parts = p.sku.split('-');
                // Assuming format BBB-CCC-NNN
                if (parts.length >= 3) {
                    const seq = parseInt(parts[parts.length - 1]);
                    if (!isNaN(seq) && seq > maxSequence) {
                        maxSequence = seq;
                    }
                }
            }
        });

        const nextSeq = (maxSequence + 1).toString().padStart(3, '0');

        const newSku = `${brandCode}-${catCode}-${nextSeq}`;
        setFormData(prev => ({ ...prev, sku: newSku }));
    };

    // Auto-generate SKU when Brand or Category changes (Only for new products)
    useEffect(() => {
        // STRICT CHECK: Only generate if NOT editing AND we have both brand and category
        if (!editProduct && formData.brand && formData.category) {
            generateSku(false);
        }
        // CRITICAL: Dependency array MUST ONLY contain brand, category, and editProduct.
        // Do NOT add formData (entire object) or other fields like location.
    }, [formData.brand, formData.category, editProduct]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const productData = {
            ...formData,
            price: parseFloat(formData.price) || 0,
            quantity: parseInt(formData.quantity) || 0,
            minStock: parseInt(formData.minStock) || 0
        };

        const action = editProduct
            ? updateProduct(editProduct.id, productData)
            : addProduct(productData);

        action
            .then(() => {
                console.log(editProduct ? '✅ Producto actualizado' : '✅ Producto agregado');
                onClose();
            })
            .catch((error) => {
                console.error('❌ Error guardando producto:', error);
                alert(`Error al guardar el producto: ${error.message || 'Error desconocido'}`);
            });
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

    // Si no está abierto, no renderizar nada
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
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
                                style={{
                                    width: '100%',
                                    borderColor: isDuplicateSKU ? 'var(--danger)' : undefined,
                                    boxShadow: isDuplicateSKU ? '0 0 0 2px rgba(239, 68, 68, 0.3)' : undefined
                                }}
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
                        {isDuplicateSKU && (
                            <p style={{
                                color: 'var(--danger)',
                                fontSize: '0.75rem',
                                marginTop: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}>
                                ⚠️ Este SKU ya existe. Usa otro código.
                            </p>
                        )}
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
                            <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                    type="text"
                                    value={categorySearchTerm || formData.category}
                                    onChange={(e) => {
                                        setCategorySearchTerm(e.target.value);
                                        setShowCategoryDropdown(true);
                                        if (!e.target.value) {
                                            setFormData({ ...formData, category: '' });
                                        }
                                    }}
                                    onFocus={() => setShowCategoryDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                                    placeholder="Buscar categoría..."
                                    style={{ width: '100%' }}
                                />
                                {showCategoryDropdown && filteredCategories.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        zIndex: 100,
                                        marginTop: '0.25rem'
                                    }}>
                                        {filteredCategories.map(c => (
                                            <div
                                                key={c.id}
                                                onMouseDown={() => {
                                                    setFormData({ ...formData, category: c.name });
                                                    setCategorySearchTerm('');
                                                    setShowCategoryDropdown(false);
                                                }}
                                                style={{
                                                    padding: '0.75rem',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {c.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
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
                            <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                    type="text"
                                    value={brandSearchTerm || formData.brand}
                                    onChange={(e) => {
                                        setBrandSearchTerm(e.target.value);
                                        setShowBrandDropdown(true);
                                        if (!e.target.value) {
                                            setFormData({ ...formData, brand: '' });
                                        }
                                    }}
                                    onFocus={() => setShowBrandDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)}
                                    placeholder="Buscar marca..."
                                    style={{ width: '100%' }}
                                />
                                {showBrandDropdown && filteredBrands.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        zIndex: 100,
                                        marginTop: '0.25rem'
                                    }}>
                                        {filteredBrands.map(b => (
                                            <div
                                                key={b.id}
                                                onMouseDown={() => {
                                                    setFormData({ ...formData, brand: b.name });
                                                    setBrandSearchTerm('');
                                                    setShowBrandDropdown(false);
                                                }}
                                                style={{
                                                    padding: '0.75rem',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid var(--border-color)'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {b.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
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
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Almacén</label>
                        <input
                            type="text"
                            value={formData.warehouse}
                            onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                            placeholder="Ej: Principal"
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
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Precio ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Stock Mínimo</label>
                        <input
                            type="number"
                            value={formData.minStock}
                            onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                            placeholder="5"
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ flex: 1, opacity: isDuplicateSKU ? 0.5 : 1 }}
                            disabled={isDuplicateSKU}
                            title={isDuplicateSKU ? 'Corrige el SKU duplicado para guardar' : ''}
                        >
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
