import React, { useState, useEffect } from 'react';
import { ShoppingCart, Save, FileText, Plus, Edit2, UserPlus, Trash2, CheckCircle, Tag } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useInventoryContext } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import ProductForm from './ProductForm';
import LabelGenerator from './LabelGenerator';

const Purchases = () => {
    const { products, purchases, providers, brands, categories, addPurchase, addProvider, updateProvider, deletePurchasesByDate, addProduct, updateProduct, addBrand, addCategory } = useInventoryContext();
    const { userProfile } = useAuth();

    // Header State
    const [headerData, setHeaderData] = useState({
        providerId: '',
        invoiceNumber: '',
        documentType: 'factura'
    });

    // Item Form State
    const [itemData, setItemData] = useState({
        productId: '',
        quantity: '',
        unit: 'Pza',
        cost: ''
    });

    // Product Search State (Sales-style)
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [selectedProductObj, setSelectedProductObj] = useState(null);

    // History State
    const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);

    // Cart State
    const [cart, setCart] = useState([]);

    const [providerForm, setProviderForm] = useState({ name: '', contact: '' });
    const [showProviderModal, setShowProviderModal] = useState(false);
    const [editingProvider, setEditingProvider] = useState(null);

    // Product Modal State
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Label Generator State
    const [showLabelGenerator, setShowLabelGenerator] = useState(false);

    const selectedProduct = selectedProductObj || products.find(p => p.id === parseInt(itemData.productId));
    const selectedProvider = providers.find(p => String(p.id) === String(headerData.providerId));

    // Filter products based on search term - only when search term exists
    const filteredProducts = productSearchTerm ? products.filter(p => {
        const term = productSearchTerm.toLowerCase();
        const reference = (p.reference || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        return reference.includes(term) || description.includes(term) || sku.includes(term);
    }) : [];


    // Handle product selection from dropdown
    const handleSelectProduct = (product) => {
        setSelectedProductObj(product);
        setItemData(prev => ({
            ...prev,
            productId: product.id,
            cost: product.price || '' // Auto-fill cost with product price
        }));
        setProductSearchTerm('');
    };

    const handleAddItem = () => {
        if (!itemData.productId || !itemData.quantity || !itemData.cost) return;

        const newItem = {
            ...itemData,
            tempId: Date.now(),
            productName: selectedProduct.description,
            productSku: selectedProduct.sku,
            productReference: selectedProduct.reference,
            total: (parseFloat(itemData.cost) || 0) * parseInt(itemData.quantity)
        };

        setCart([...cart, newItem]);
        setItemData({
            productId: '',
            quantity: '',
            unit: 'Pza',
            cost: ''
        });
        setSelectedProductObj(null); // Reset selected product
    };

    const handleRemoveItem = (tempId) => {
        setCart(cart.filter(item => item.tempId !== tempId));
    };

    const handleFinalizePurchase = async () => {
        if (!headerData.providerId || !headerData.invoiceNumber) {
            alert('Por favor complete los datos del proveedor y factura.');
            return;
        }
        if (cart.length === 0) {
            alert('Agregue al menos un producto a la lista.');
            return;
        }
        if (!selectedProvider) {
            alert('Proveedor no encontrado. Por favor seleccione un proveedor válido.');
            return;
        }

        try {
            const purchaseBatch = cart.map(item => ({
                providerId: headerData.providerId,
                providerName: selectedProvider.name,
                invoiceNumber: headerData.invoiceNumber,
                productId: String(item.productId), // Ensure string
                productName: item.productName,
                productSku: item.productSku,
                productReference: item.productReference,
                quantity: item.quantity,
                unit: item.unit,
                cost: item.cost,
                total: item.total
            }));

            console.log('Purchase batch:', purchaseBatch);

            const userName = userProfile?.displayName || userProfile?.email || 'Usuario';
            await addPurchase(purchaseBatch, userName);

            // Option 1: Auto-prompt for label generation
            const generateLabels = window.confirm('✅ Compra registrada exitosamente.\n\n¿Desea generar etiquetas para estos productos?');

            if (generateLabels) {
                setShowLabelGenerator(true);
            }

            // Reset cart only - keep provider and invoice for corrections/continued purchases
            setCart([]);
        } catch (error) {
            console.error('Error al finalizar compra:', error);
            alert(`Error al registrar la compra: ${error.message}`);
        }
    };

    const handleProviderSubmit = (e) => {
        e.preventDefault();
        if (editingProvider) {
            updateProvider(editingProvider.id, providerForm);
        } else {
            addProvider(providerForm);
        }
        setProviderForm({ name: '', contact: '' });
        setEditingProvider(null);
        setShowProviderModal(false);
    };

    const handleEditProvider = () => {
        const provider = providers.find(p => String(p.id) === String(headerData.providerId));
        if (provider) {
            setEditingProvider(provider);
            setProviderForm({ name: provider.name || '', contact: provider.contact || '' });
            setShowProviderModal(true);
        }
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

    // Option 2: Generate labels from history
    const handleGenerateLabelsFromHistory = async (purchase) => {
        // Simply open the label generator - it already has access to purchases
        setShowLabelGenerator(true);
    };

    const generatePDF = async () => {
        const doc = new jsPDF();
        const reportDate = new Date(historyDate).toLocaleDateString('es-VE', { timeZone: 'UTC' });

        // Filter purchases for selected date
        const dailyPurchases = purchases.filter(purchase => purchase.date.startsWith(historyDate));

        if (dailyPurchases.length === 0) {
            alert('No hay compras registradas para la fecha seleccionada.');
            return;
        }

        // Title
        doc.setFontSize(18);
        doc.text(`Reporte de Compras - ${reportDate}`, 14, 22);

        // Table Data
        const tableColumn = ["Fecha", "Proveedor", "Factura", "Producto", "Ref", "Cant.", "Total (USD)"];
        const tableRows = [];

        dailyPurchases.forEach(purchase => {
            const purchaseData = [
                new Date(purchase.date).toLocaleDateString('es-VE'),
                purchase.providerName,
                purchase.invoiceNumber,
                purchase.productName,
                purchase.productReference || '-',
                `${purchase.quantity} ${purchase.unit}`,
                `$${purchase.total.toFixed(2)}`
            ];
            tableRows.push(purchaseData);
        });

        // Calculate Total
        const totalAmount = dailyPurchases.reduce((sum, purchase) => sum + (purchase.total || 0), 0);

        // Add Totals Row
        tableRows.push([
            "", "", "", "", "",
            { content: "TOTAL:", styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `$${totalAmount.toFixed(2)}`, styles: { fontStyle: 'bold' } }
        ]);

        // Generate Table
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 20 }, // Fecha
                6: { halign: 'right' }  // Total
            }
        });

        doc.save(`reporte_compras_${historyDate}.pdf`);

        // Delete purchases and revert inventory for the date
        await deletePurchasesByDate(historyDate);

        alert('Reporte generado y registros limpiados exitosamente.');
    };

    const cartTotal = cart.reduce((acc, item) => acc + item.total, 0);

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Compras</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Registro de adquisiciones multi-producto.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        console.log('🔘 Botón Generar Etiquetas clickeado');
                        setShowLabelGenerator(true);
                        console.log('🔘 showLabelGenerator ahora es true');
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Tag size={20} />
                    Generar Etiquetas
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>

                {/* Left Column: Form */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>1. Datos de Compra</h3>

                    {/* Header Fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                Proveedor
                                <Edit2 size={14} style={{ color: 'var(--accent-primary)', cursor: 'pointer' }} title="Campo editable" />
                            </label>
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
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleEditProvider}
                                    disabled={!headerData.providerId}
                                    title="Editar proveedor seleccionado"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => { setEditingProvider(null); setProviderForm({ name: '', contact: '' }); setShowProviderModal(true); }} title="Nuevo proveedor">
                                    <UserPlus size={18} />
                                </button>
                            </div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <select
                                    value={headerData.documentType}
                                    onChange={(e) => setHeaderData({ ...headerData, documentType: e.target.value })}
                                    style={{
                                        width: 'auto',
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.875rem',
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="factura">No. Factura</option>
                                    <option value="nota">Nota de Entrega</option>
                                </select>
                            </div>
                            <input
                                type="text"
                                value={headerData.invoiceNumber}
                                onChange={(e) => setHeaderData({ ...headerData, invoiceNumber: e.target.value })}
                                placeholder={headerData.documentType === 'factura' ? 'F-12345' : 'NE-12345'}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}>2. Agregar Productos</h3>
                        <button type="button" className="btn btn-primary" onClick={handleNewProduct} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Plus size={18} /> Nuevo Producto
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'end' }}>

                        {/* Product Search - Sales Style */}
                        <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Buscar Producto</label>
                            <input
                                type="text"
                                value={productSearchTerm}
                                onChange={(e) => setProductSearchTerm(e.target.value)}
                                placeholder="Buscar por descripción, SKU o referencia..."
                            />
                            {productSearchTerm && filteredProducts.length > 0 && (
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
                                    zIndex: 10,
                                    marginTop: '0.25rem'
                                }}>
                                    {filteredProducts.map(product => (
                                        <div
                                            key={product.id}
                                            onClick={() => handleSelectProduct(product)}
                                            style={{
                                                padding: '0.75rem',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid var(--border-color)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ fontWeight: '500' }}>{product.description}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                Marca: {product.brand || 'N/A'} | Ref: {product.reference || 'N/A'} | Ubicación: {product.location || 'N/A'} | Stock: {product.quantity}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Product Display */}
                        {selectedProduct && (
                            <div style={{
                                gridColumn: '1 / -1',
                                padding: '1rem',
                                background: 'rgba(var(--primary-rgb), 0.05)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>{selectedProduct.description}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        <div>Ref: {selectedProduct.reference} | Ubicación: {selectedProduct.location || 'N/A'}</div>
                                        <div>Stock disponible: {selectedProduct.quantity}</div>
                                    </div>
                                </div>
                                <button type="button" className="btn btn-secondary" onClick={handleEditProduct} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Edit2 size={18} /> Editar
                                </button>
                            </div>
                        )}

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
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Ref.</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Cant.</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total</th>
                                        <th style={{ padding: '0.5rem' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map(item => (
                                        <tr key={item.tempId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.5rem' }}>{item.productName}</td>
                                            <td style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.productReference || 'N/A'}</td>
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

            {/* History Section - Sales Style */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Historial de Compras</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input
                            type="date"
                            value={historyDate}
                            onChange={(e) => setHistoryDate(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                        />
                        <button
                            onClick={generatePDF}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                        >
                            <FileText size={16} /> Generar Reporte PDF
                        </button>
                    </div>
                </div>

                {(() => {
                    const dailyPurchases = historyDate ? purchases.filter(p => p.date.startsWith(historyDate)) : [];
                    const dailyTotal = dailyPurchases.reduce((sum, p) => sum + (p.total || 0), 0);

                    return dailyPurchases.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                            No hay registros para la fecha seleccionada
                        </p>
                    ) : (
                        <>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '2px solid var(--border-color)' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Fecha</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Proveedor</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Factura</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Producto</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)' }}>Ref.</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cant.</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dailyPurchases.map((p) => (
                                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                                    {new Date(p.date).toLocaleDateString()}
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>{p.providerName}</td>
                                                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>{p.invoiceNumber}</td>
                                                <td style={{ padding: '0.75rem' }}>{p.productName}</td>
                                                <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.productReference || 'N/A'}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{p.quantity} {p.unit}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                                                    ${p.total.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid var(--border-color)', background: 'rgba(var(--success-rgb), 0.1)' }}>
                                            <td colSpan="6" style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                                                TOTAL DEL DÍA:
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--success)' }}>
                                                ${dailyTotal.toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* Modals */}
            {
                showProviderModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60
                    }}>
                        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', width: '400px' }}>
                            <h3 style={{ marginBottom: '1rem' }}>{editingProvider ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
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
                                    <button type="button" className="btn btn-secondary" onClick={() => { setShowProviderModal(false); setEditingProvider(null); setProviderForm({ name: '', contact: '' }); }} style={{ flex: 1 }}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingProvider ? 'Actualizar' : 'Guardar'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }


            <ProductForm
                isOpen={showProductModal}
                onClose={() => setShowProductModal(false)}
                editProduct={editingProduct}
                products={products}
                brands={brands}
                categories={categories}
                addProduct={addProduct}
                updateProduct={updateProduct}
                addBrand={addBrand}
                addCategory={addCategory}
            />

            <LabelGenerator
                isOpen={showLabelGenerator}
                onClose={() => setShowLabelGenerator(false)}
                purchases={purchases}
                products={products}
            />
        </div >
    );
};

export default React.memo(Purchases);
