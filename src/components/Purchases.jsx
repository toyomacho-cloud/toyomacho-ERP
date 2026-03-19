import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Save, FileText, Plus, Edit2, UserPlus, Trash2, CheckCircle, Tag, Search, X, Eye, ChevronLeft, Calendar, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useInventoryContext } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import ProductForm from './ProductForm';
import LabelGenerator from './LabelGenerator';

const Purchases = () => {
    const { products, purchases, providers, brands, categories, addPurchase, addProvider, updateProvider, deletePurchasesByDate, addProduct, updateProduct, addBrand, updateBrand, deleteBrand, addCategory } = useInventoryContext();
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

    // Tab State
    const [activeView, setActiveView] = useState('register');

    // History State
    const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
    const [historySearchInvoice, setHistorySearchInvoice] = useState('');
    const [historySearchProvider, setHistorySearchProvider] = useState('');

    // Documents Tab State
    const [docDateFrom, setDocDateFrom] = useState('');
    const [docDateTo, setDocDateTo] = useState('');
    const [docSearchNumber, setDocSearchNumber] = useState('');
    const [docSearchProvider, setDocSearchProvider] = useState('');
    const [selectedDocument, setSelectedDocument] = useState(null);

    // Cart State
    const [cart, setCart] = useState([]);

    const [providerForm, setProviderForm] = useState({ name: '', contact: '' });
    const [showProviderModal, setShowProviderModal] = useState(false);
    const [editingProvider, setEditingProvider] = useState(null);

    // Provider Search State (Autocomplete)
    const [providerSearchTerm, setProviderSearchTerm] = useState('');
    const [showProviderDropdown, setShowProviderDropdown] = useState(false);
    const providerDropdownRef = useRef(null);

    // Product Modal State
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Label Generator State
    const [showLabelGenerator, setShowLabelGenerator] = useState(false);

    const selectedProduct = selectedProductObj || products.find(p => p.id === parseInt(itemData.productId));
    const selectedProvider = providers.find(p => String(p.id) === String(headerData.providerId));

    // Filter providers based on search term
    const filteredProviders = providerSearchTerm
        ? providers.filter(p => (p.name || '').toLowerCase().includes(providerSearchTerm.toLowerCase()))
        : providers;

    // Handle provider selection from autocomplete
    const handleSelectProviderFromSearch = (provider) => {
        setHeaderData({ ...headerData, providerId: provider.id });
        setProviderSearchTerm(provider.name);
        setShowProviderDropdown(false);
    };

    // Close provider dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (providerDropdownRef.current && !providerDropdownRef.current.contains(event.target)) {
                setShowProviderDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync provider search term when provider is selected externally (e.g. after edit)
    useEffect(() => {
        if (selectedProvider && providerSearchTerm !== selectedProvider.name) {
            setProviderSearchTerm(selectedProvider.name);
        }
    }, [selectedProvider]);

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
            alert('Proveedor no encontrado. Por favor seleccione un proveedor vÃ¡lido.');
            return;
        }

        try {
            const purchaseBatch = cart.map(item => ({
                providerId: headerData.providerId,
                providerName: selectedProvider.name,
                invoiceNumber: headerData.invoiceNumber,
                documentType: headerData.documentType || 'factura',
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
            const generateLabels = window.confirm('âœ… Compra registrada exitosamente.\n\nÂ¿Desea generar etiquetas para estos productos?');

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

    const handleProviderSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingProvider) {
                console.log('ðŸ“ Updating provider:', editingProvider.id, providerForm);
                await updateProvider(editingProvider.id, providerForm);
                console.log('âœ… Provider updated successfully');
            } else {
                console.log('âž• Adding new provider:', providerForm);
                await addProvider(providerForm);
                console.log('âœ… Provider added successfully');
            }
            setProviderForm({ name: '', contact: '' });
            setEditingProvider(null);
            setShowProviderModal(false);
        } catch (error) {
            console.error('âŒ Error en proveedor:', error);
            alert(`Error al ${editingProvider ? 'actualizar' : 'crear'} proveedor: ${error.message}`);
        }
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

    // Helper: filtrar compras segun los filtros activos del historial
    const getFilteredPurchases = () => {
        const hasSearch = historySearchInvoice.trim() || historySearchProvider.trim();
        let filtered = purchases;

        // Si hay busqueda activa, ignorar filtro de fecha
        if (!hasSearch) {
            filtered = filtered.filter(p => (p.date || '').startsWith(historyDate));
        }

        // Filtro por factura/nota de entrega
        if (historySearchInvoice.trim()) {
            const term = historySearchInvoice.trim().toLowerCase();
            filtered = filtered.filter(p => {
                const inv = (p.invoice_number || p.invoiceNumber || '').toLowerCase();
                return inv.includes(term);
            });
        }

        // Filtro por proveedor
        if (historySearchProvider.trim()) {
            const term = historySearchProvider.trim().toLowerCase();
            filtered = filtered.filter(p => {
                const prov = (p.provider_name || p.providerName || '').toLowerCase();
                return prov.includes(term);
            });
        }

        return filtered;
    };

    const generatePDF = async () => {
        const doc = new jsPDF();
        const hasSearch = historySearchInvoice.trim() || historySearchProvider.trim();
        const reportDate = new Date(historyDate).toLocaleDateString('es-VE', { timeZone: 'UTC' });

        // Usar la misma logica de filtrado del historial
        const filteredPurchases = getFilteredPurchases();

        if (filteredPurchases.length === 0) {
            alert('No hay compras registradas para los filtros seleccionados.');
            return;
        }

        // Title
        doc.setFontSize(18);
        let title = `Reporte de Compras`;
        if (hasSearch) {
            const parts = [];
            if (historySearchInvoice.trim()) parts.push(`Factura: ${historySearchInvoice.trim()}`);
            if (historySearchProvider.trim()) parts.push(`Proveedor: ${historySearchProvider.trim()}`);
            title += ` - ${parts.join(' | ')}`;
        } else {
            title += ` - ${reportDate}`;
        }
        doc.text(title, 14, 22);

        // Table Data
        const tableColumn = ["Fecha", "Proveedor", "Factura", "Producto", "Ref", "Cant.", "Total (USD)"];
        const tableRows = [];
        let totalAmount = 0;

        filteredPurchases.forEach(purchase => {
            const providerName = purchase.provider_name || purchase.providerName || 'N/A';
            const invoiceNumber = purchase.invoice_number || purchase.invoiceNumber || 'N/A';
            const items = purchase.items || [];

            if (items.length > 0) {
                // Nueva estructura con items JSONB
                items.forEach(item => {
                    tableRows.push([
                        new Date(purchase.date).toLocaleDateString('es-VE'),
                        providerName,
                        invoiceNumber,
                        item.productName || 'N/A',
                        item.productReference || item.productSku || '-',
                        `${item.quantity || 0} ${item.unit || 'Pza'}`,
                        `$${(parseFloat(item.total) || 0).toFixed(2)}`
                    ]);
                    totalAmount += parseFloat(item.total) || 0;
                });
            } else {
                // Estructura antigua
                tableRows.push([
                    new Date(purchase.date).toLocaleDateString('es-VE'),
                    providerName,
                    invoiceNumber,
                    purchase.productName || 'N/A',
                    purchase.productReference || '-',
                    `${purchase.quantity || 0} ${purchase.unit || 'Pza'}`,
                    `$${(parseFloat(purchase.total) || 0).toFixed(2)}`
                ]);
                totalAmount += parseFloat(purchase.total) || 0;
            }
        });

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

        const filename = hasSearch ? `reporte_compras_busqueda` : `reporte_compras_${historyDate}`;
        doc.save(`${filename}.pdf`);

        // Solo limpiar registros cuando se filtra por fecha (no en busqueda)
        if (!hasSearch) {
            await deletePurchasesByDate(historyDate);
            alert('Reporte generado y registros limpiados exitosamente.');
        } else {
            alert('Reporte generado exitosamente.');
        }
    };

    const cartTotal = cart.reduce((acc, item) => acc + item.total, 0);

    // ========== DOCUMENTOS TAB: Logica ==========
    // Agrupar compras por numero de documento
    const getGroupedDocuments = () => {
        let filtered = [...purchases];

        // Filtro por rango de fechas
        if (docDateFrom) {
            filtered = filtered.filter(p => (p.date || '') >= docDateFrom);
        }
        if (docDateTo) {
            filtered = filtered.filter(p => (p.date || '').substring(0, 10) <= docDateTo);
        }

        // Filtro por numero de documento
        if (docSearchNumber.trim()) {
            const term = docSearchNumber.trim().toLowerCase();
            filtered = filtered.filter(p => {
                const inv = (p.invoice_number || p.invoiceNumber || '').toLowerCase();
                return inv.includes(term);
            });
        }

        // Filtro por proveedor
        if (docSearchProvider.trim()) {
            const term = docSearchProvider.trim().toLowerCase();
            filtered = filtered.filter(p => {
                const prov = (p.provider_name || p.providerName || '').toLowerCase();
                return prov.includes(term);
            });
        }

        // Agrupar por invoice_number
        const grouped = {};
        filtered.forEach(purchase => {
            const invNum = purchase.invoice_number || purchase.invoiceNumber || 'SIN-NUMERO';
            if (!grouped[invNum]) {
                grouped[invNum] = {
                    invoiceNumber: invNum,
                    providerName: purchase.provider_name || purchase.providerName || 'N/A',
                    date: purchase.date,
                    documentType: (invNum.toUpperCase().startsWith('NE') || invNum.toUpperCase().startsWith('N-')) ? 'Nota de Entrega' : 'Factura',
                    items: [],
                    total: 0,
                    purchaseIds: []
                };
            }
            grouped[invNum].purchaseIds.push(purchase.id);
            const items = purchase.items || [];
            if (items.length > 0) {
                items.forEach(item => {
                    grouped[invNum].items.push({
                        productName: item.productName || 'N/A',
                        productReference: item.productReference || item.productSku || 'N/A',
                        productSku: item.productSku || 'N/A',
                        quantity: item.quantity || 0,
                        unit: item.unit || 'Pza',
                        cost: parseFloat(item.cost) || 0,
                        total: parseFloat(item.total) || 0
                    });
                    grouped[invNum].total += parseFloat(item.total) || 0;
                });
            } else {
                grouped[invNum].items.push({
                    productName: purchase.productName || 'N/A',
                    productReference: purchase.productReference || 'N/A',
                    productSku: purchase.productSku || 'N/A',
                    quantity: purchase.quantity || 0,
                    unit: purchase.unit || 'Pza',
                    cost: parseFloat(purchase.cost) || 0,
                    total: parseFloat(purchase.total) || 0
                });
                grouped[invNum].total += parseFloat(purchase.total) || 0;
            }
        });

        return Object.values(grouped).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    };

    // PDF de documento individual
    const generateDocumentPDF = (doc) => {
        const pdf = new jsPDF();
        const reportDate = new Date(doc.date).toLocaleDateString('es-VE', { timeZone: 'UTC' });

        pdf.setFontSize(16);
        pdf.text(`${doc.documentType}: ${doc.invoiceNumber}`, 14, 20);
        pdf.setFontSize(10);
        pdf.text(`Proveedor: ${doc.providerName}`, 14, 28);
        pdf.text(`Fecha: ${reportDate}`, 14, 34);

        const tableColumn = ['Producto', 'Referencia', 'Cantidad', 'Unidad', 'Costo U.', 'Total'];
        const tableRows = doc.items.map(item => [
            item.productName,
            item.productReference,
            item.quantity,
            item.unit,
            `$${item.cost.toFixed(2)}`,
            `$${item.total.toFixed(2)}`
        ]);

        tableRows.push([
            '', '', '', '',
            { content: 'TOTAL:', styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `$${doc.total.toFixed(2)}`, styles: { fontStyle: 'bold' } }
        ]);

        autoTable(pdf, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 8 },
            columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' } }
        });

        pdf.save(`${doc.documentType.replace(/ /g, '_')}_${doc.invoiceNumber}.pdf`);
    };

    const clearDocFilters = () => {
        setDocDateFrom('');
        setDocDateTo('');
        setDocSearchNumber('');
        setDocSearchProvider('');
    };

    const hasDocFilters = docDateFrom || docDateTo || docSearchNumber.trim() || docSearchProvider.trim();

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Compras</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Registro de adquisiciones multi-producto.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowLabelGenerator(true)}
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
                    <div style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                        {/* Proveedor - full width */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                Proveedor
                                <Edit2 size={14} style={{ color: 'var(--accent-primary)', cursor: 'pointer' }} title="Campo editable" />
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }} ref={providerDropdownRef}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <input
                                        type="text"
                                        value={providerSearchTerm}
                                        onChange={(e) => {
                                            setProviderSearchTerm(e.target.value);
                                            setShowProviderDropdown(true);
                                            if (!e.target.value) {
                                                setHeaderData({ ...headerData, providerId: '' });
                                            }
                                        }}
                                        onFocus={() => setShowProviderDropdown(true)}
                                        placeholder="Buscar proveedor..."
                                        style={{ width: '100%' }}
                                    />
                                    {showProviderDropdown && filteredProviders.length > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            minWidth: '350px',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            maxHeight: '250px',
                                            overflowY: 'auto',
                                            zIndex: 10,
                                            marginTop: '0.25rem',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                        }}>
                                            {filteredProviders.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => handleSelectProviderFromSearch(p)}
                                                    style={{
                                                        padding: '0.75rem',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid var(--border-color)',
                                                        background: String(p.id) === String(headerData.providerId) ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.1)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = String(p.id) === String(headerData.providerId) ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent'}
                                                >
                                                    <div style={{ fontWeight: '500' }}>{p.name}</div>
                                                    {p.contact && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                            Contacto: {p.contact}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
                        {/* Factura / Nota - row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                                placeholder="Buscar por descripciÃ³n, SKU o referencia..."
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
                                                Marca: {product.brand || 'N/A'} | Ref: {product.reference || 'N/A'} | UbicaciÃ³n: {product.location || 'N/A'} | Stock: {product.quantity}
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
                                        <div>Ref: {selectedProduct.reference} | UbicaciÃ³n: {selectedProduct.location || 'N/A'}</div>
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
                                Lista vacÃ­a
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

            {/* Historial - Vista unificada agrupada por documento */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Historial de Compras</h3>
                    <button
                        onClick={generatePDF}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                    >
                        <FileText size={16} /> Generar Reporte PDF
                    </button>
                </div>

                {/* Filtros de busqueda */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: 'rgba(var(--primary-rgb), 0.03)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                            <Calendar size={12} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} /> Fecha
                        </label>
                        <input
                            type="date"
                            value={historyDate}
                            onChange={(e) => setHistoryDate(e.target.value)}
                            disabled={!!(historySearchInvoice.trim() || historySearchProvider.trim())}
                            style={{
                                width: '100%', padding: '0.5rem',
                                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                                opacity: (historySearchInvoice.trim() || historySearchProvider.trim()) ? 0.5 : 1
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                            <Search size={12} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} /> Factura / Nota de Entrega
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                value={historySearchInvoice}
                                onChange={(e) => setHistorySearchInvoice(e.target.value)}
                                placeholder="Ej: F-12345, NE-001..."
                                style={{ width: '100%', padding: '0.5rem', paddingRight: historySearchInvoice ? '2rem' : '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                            />
                            {historySearchInvoice && (
                                <button onClick={() => setHistorySearchInvoice('')} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.15rem', display: 'flex' }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                            <Search size={12} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} /> Proveedor
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                value={historySearchProvider}
                                onChange={(e) => setHistorySearchProvider(e.target.value)}
                                placeholder="Nombre del proveedor..."
                                style={{ width: '100%', padding: '0.5rem', paddingRight: historySearchProvider ? '2rem' : '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                            />
                            {historySearchProvider && (
                                <button onClick={() => setHistorySearchProvider('')} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.15rem', display: 'flex' }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Indicador de busqueda activa */}
                {(historySearchInvoice.trim() || historySearchProvider.trim()) && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem',
                        padding: '0.5rem 0.75rem', background: 'rgba(var(--primary-rgb), 0.08)',
                        borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--accent-primary)'
                    }}>
                        <Search size={14} />
                        <span>Buscando en todo el historial</span>
                        <button
                            onClick={() => { setHistorySearchInvoice(''); setHistorySearchProvider(''); }}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', fontSize: '0.8rem', textDecoration: 'underline' }}
                        >
                            Limpiar filtros
                        </button>
                    </div>
                )}

                {/* Listado de documentos */}
                {(() => {
                    const filteredPurchases = getFilteredPurchases();
                    const hasSearch = historySearchInvoice.trim() || historySearchProvider.trim();

                    // Los purchases ya vienen como headers con items[] desde el hook
                    const documents = filteredPurchases.map(purchase => ({
                        id: purchase.id,
                        invoiceNumber: purchase.invoice_number || 'SIN-NUMERO',
                        providerName: purchase.provider_name || 'N/A',
                        date: purchase.date,
                        documentType: purchase.document_type === 'nota_entrega' ? 'Nota de Entrega' : 'Factura',
                        items: (purchase.items || []).map(item => ({
                            productName: item.productName || 'N/A',
                            productReference: item.productReference || item.productSku || 'N/A',
                            quantity: item.quantity || 0,
                            unit: item.unit || 'Pza',
                            cost: parseFloat(item.cost || item.unitCost) || 0,
                            total: parseFloat(item.total) || 0
                        })),
                        total: parseFloat(purchase.total) || 0
                    }));

                    const grandTotal = documents.reduce((sum, d) => sum + d.total, 0);

                    return documents.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                            {hasSearch ? 'No se encontraron resultados para la busqueda' : 'No hay registros para la fecha seleccionada'}
                        </p>
                    ) : (
                        <>
                            <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {documents.length} documento{documents.length !== 1 ? 's' : ''} encontrado{documents.length !== 1 ? 's' : ''}
                            </div>

                            {documents.map((doc) => {
                                const isExpanded = selectedDocument && selectedDocument.invoiceNumber === doc.invoiceNumber;
                                return (
                                    <div key={doc.invoiceNumber} style={{
                                        marginBottom: '0.75rem',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        overflow: 'hidden',
                                        background: isExpanded ? 'rgba(var(--primary-rgb), 0.03)' : 'transparent'
                                    }}>
                                        {/* Fila del documento - clickeable */}
                                        <div
                                            onClick={() => setSelectedDocument(isExpanded ? null : doc)}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '100px 110px 1fr 1fr 80px 100px 60px',
                                                gap: '0.5rem',
                                                padding: '0.75rem 1rem',
                                                cursor: 'pointer',
                                                alignItems: 'center',
                                                fontSize: '0.875rem',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.04)'; }}
                                            onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                {new Date(doc.date).toLocaleDateString('es-VE', { timeZone: 'UTC' })}
                                            </span>
                                            <span>
                                                <span style={{
                                                    padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '500',
                                                    background: doc.documentType === 'Factura' ? 'rgba(59,130,246,0.15)' : 'rgba(234,179,8,0.15)',
                                                    color: doc.documentType === 'Factura' ? '#3b82f6' : '#ca8a04'
                                                }}>
                                                    {doc.documentType}
                                                </span>
                                            </span>
                                            <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{doc.invoiceNumber}</span>
                                            <span>{doc.providerName}</span>
                                            <span style={{ textAlign: 'center' }}>
                                                <span style={{ background: 'rgba(var(--primary-rgb), 0.1)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                                                    {doc.items.length} prod.
                                                </span>
                                            </span>
                                            <span style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>${doc.total.toFixed(2)}</span>
                                            <span style={{ textAlign: 'center', color: 'var(--accent-primary)' }}>
                                                <ChevronRight size={16} style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                            </span>
                                        </div>

                                        {/* Detalle expandido del documento */}
                                        {isExpanded && (
                                            <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                                                        Productos ({doc.items.length})
                                                    </span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); generateDocumentPDF(doc); }}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                                    >
                                                        <FileText size={14} /> PDF
                                                    </button>
                                                </div>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                            <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500' }}>#</th>
                                                            <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500' }}>Producto</th>
                                                            <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500' }}>Referencia</th>
                                                            <th style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '500' }}>Cant.</th>
                                                            <th style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '500' }}>Unidad</th>
                                                            <th style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '500' }}>Costo U.</th>
                                                            <th style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '500' }}>Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {doc.items.map((item, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                                <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                                                                <td style={{ padding: '0.5rem', fontWeight: '500' }}>{item.productName}</td>
                                                                <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.productReference}</td>
                                                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{item.quantity}</td>
                                                                <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{item.unit}</td>
                                                                <td style={{ padding: '0.5rem', textAlign: 'right' }}>${item.cost.toFixed(2)}</td>
                                                                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '500', color: 'var(--success)' }}>${item.total.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                                                            <td colSpan="6" style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>TOTAL:</td>
                                                            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>${doc.total.toFixed(2)}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Total general */}
                            <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(var(--success-rgb), 0.1)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold' }}>{hasSearch ? 'TOTAL ENCONTRADO:' : 'TOTAL DEL DIA:'}</span>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--success)' }}>${grandTotal.toFixed(2)}</span>
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
                updateBrand={updateBrand}
                deleteBrand={deleteBrand}
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
