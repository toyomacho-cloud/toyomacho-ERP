import React, { useState, useEffect } from 'react';
import { PackageCheck, Plus, Trash2, DollarSign, CreditCard, FileText, Download, X } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import { auth } from '../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateQuotePDF, downloadQuotePDF, generateSalesReportPDF, downloadSalesReportPDF } from '../utils/quote-generator';

const Sales = () => {
    const { products, sales, addSale } = useInventoryContext();

    // Force rebuild: Multi-Cart Implementation Active

    // Exchange rate state
    const [exchangeRate, setExchangeRate] = useState(0);
    const [exchangeRateInput, setExchangeRateInput] = useState('');
    const [lastRateUpdate, setLastRateUpdate] = useState('');
    const [exchangeRateSource, setExchangeRateSource] = useState('');
    const [loadingRate, setLoadingRate] = useState(false);

    // Multi-Cart State
    const [carts, setCarts] = useState([
        { id: 1, name: 'Venta 1', items: [], clientData: { name: '', phone: '', email: '', address: '' } }
    ]);
    const [activeCartId, setActiveCartId] = useState(1);

    // Helper to get active cart
    const activeCart = carts.find(c => c.id === activeCartId) || carts[0];

    // Helper to update active cart
    const updateActiveCart = (updates) => {
        setCarts(carts.map(c => c.id === activeCartId ? { ...c, ...updates } : c));
    };

    const [paymentType, setPaymentType] = useState('cash');
    const [paymentCurrency, setPaymentCurrency] = useState('USD');
    const [customUSD, setCustomUSD] = useState(0);
    const [customBs, setCustomBs] = useState(0);

    // Form state
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [priceUSD, setPriceUSD] = useState(0);

    // History filter
    const [historyDateFilter, setHistoryDateFilter] = useState(new Date().toISOString().split('T')[0]);

    // Report states
    const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Quote states
    const [showQuoteForm, setShowQuoteForm] = useState(false);

    // Load exchange rate from localStorage
    useEffect(() => {
        const savedRate = localStorage.getItem('exchangeRate');
        const savedDate = localStorage.getItem('exchangeRateDate');
        const savedSource = localStorage.getItem('exchangeRateSource');
        if (savedRate) {
            const parsedRate = parseFloat(savedRate);
            setExchangeRate(parsedRate);
            setExchangeRateInput(parsedRate.toFixed(2));
            setLastRateUpdate(savedDate || 'Desconocida');
            setExchangeRateSource(savedSource || 'Manual');
        }
    }, []);

    // Save exchange rate to localStorage and update input
    const handleExchangeRateUpdate = (newRate, source = 'Manual') => {
        const rate = parseFloat(newRate) || 0;
        const rounded = Math.round(rate * 100) / 100;

        setExchangeRate(rounded);
        setExchangeRateInput(rounded.toFixed(2));

        const now = new Date().toLocaleString('es-VE');
        localStorage.setItem('exchangeRate', rounded.toString());
        localStorage.setItem('exchangeRateDate', now);
        localStorage.setItem('exchangeRateSource', source);
        setLastRateUpdate(now);
        setExchangeRateSource(source);
    };

    // Handle manual input change
    const handleManualChange = (val) => {
        setExchangeRateInput(val);
        const rate = parseFloat(val);
        if (!isNaN(rate)) {
            setExchangeRate(rate);
        }
    };

    // Fetch exchange rate from BCV API
    const fetchExchangeRate = async () => {
        setLoadingRate(true);
        try {
            const response = await fetch('https://ve.dolarapi.com/v1/dolares');
            const data = await response.json();
            const oficialRate = data.find(item => item.fuente === 'oficial');

            if (oficialRate && oficialRate.promedio) {
                handleExchangeRateUpdate(oficialRate.promedio, 'BCV (Oficial)');
                alert(`✅ Tasa BCV actualizada: Bs ${oficialRate.promedio.toFixed(2)}/$`);
            } else {
                throw new Error('No se pudo obtener la tasa oficial');
            }
        } catch (error) {
            console.error('Error fetching exchange rate:', error);
            alert('⚠️ Error al obtener la tasa BCV. Verifica tu conexión a internet.');
        } finally {
            setLoadingRate(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.reference && p.reference.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Calculate cart totals
    const cartTotalUSD = activeCart.items.reduce((sum, item) => sum + (item.amountUSD || 0), 0);
    const cartTotalBs = activeCart.items.reduce((sum, item) => sum + (item.amountBs || 0), 0);


    // Multi-Cart Actions
    const addNewCart = () => {
        const newId = Math.max(...carts.map(c => c.id)) + 1;
        const newCart = {
            id: newId,
            name: `Venta ${newId}`,
            items: [],
            clientData: { name: '', phone: '', email: '', address: '' }
        };
        setCarts([...carts, newCart]);
        setActiveCartId(newId);
    };

    const closeCart = (cartId, e) => {
        e.stopPropagation();
        if (carts.length === 1) {
            alert("Debe haber al menos una venta activa.");
            return;
        }

        const cartToClose = carts.find(c => c.id === cartId);
        if (cartToClose.items.length > 0) {
            if (!window.confirm(`La venta "${cartToClose.name}" tiene productos. ¿Seguro que deseas cerrarla?`)) {
                return;
            }
        }

        const newCarts = carts.filter(c => c.id !== cartId);
        setCarts(newCarts);
        if (activeCartId === cartId) {
            setActiveCartId(newCarts[newCarts.length - 1].id);
        }
    };

    const addToCart = () => {
        if (!selectedProduct || quantity <= 0 || priceUSD <= 0) {
            alert('Por favor completa todos los campos');
            return;
        }

        if (exchangeRate <= 0) {
            alert('Por favor ingresa la tasa de cambio');
            return;
        }

        if (quantity > selectedProduct.quantity) {
            alert(`Stock insuficiente. Disponible: ${selectedProduct.quantity}`);
            return;
        }

        const totalUSD = parseFloat(priceUSD) * parseInt(quantity);
        const totalBs = totalUSD * exchangeRate;

        const cartItem = {
            productId: selectedProduct.id,
            sku: selectedProduct.sku,
            reference: selectedProduct.reference || '',
            description: selectedProduct.description,
            brand: selectedProduct.brand || '',
            quantity: parseInt(quantity),
            amountUSD: totalUSD,
            amountBs: totalBs
        };

        updateActiveCart({ items: [...activeCart.items, cartItem] });
        setSelectedProduct(null);
        setSearchTerm('');
        setQuantity(1);
        setPriceUSD(0);
    };

    const removeFromCart = (index) => {
        const newItems = activeCart.items.filter((_, i) => i !== index);
        updateActiveCart({ items: newItems });
    };

    const finalizeSale = () => {
        if (activeCart.items.length === 0) {
            alert('El carrito está vacío');
            return;
        }

        if (exchangeRate <= 0) {
            alert('Por favor ingresa la tasa de cambio');
            return;
        }

        const userName = auth.currentUser?.displayName || auth.currentUser?.email || 'Usuario';

        const saleItems = activeCart.items.map(item => {
            let finalAmountUSD = item.amountUSD;
            let finalAmountBs = item.amountBs;

            if (paymentCurrency === 'Combinado') {
                finalAmountUSD = customUSD;
                finalAmountBs = customBs;
            }

            return {
                ...item,
                amountUSD: finalAmountUSD,
                amountBs: finalAmountBs,
                date: saleDate,
                paymentType,
                paymentCurrency,
                exchangeRate
            };
        });

        addSale(saleItems, userName);

        // Reset current cart
        updateActiveCart({ items: [], clientData: { name: '', phone: '', email: '', address: '' } });
        setSaleDate(new Date().toISOString().split('T')[0]);
        setCustomUSD(0);
        setCustomBs(0);
        alert('Venta/Egreso registrado exitosamente');
    };

    const handleGenerateReport = () => {
        if (!reportStartDate || !reportEndDate) {
            alert('Seleccione el rango de fechas');
            return;
        }
        const doc = generateSalesReportPDF(sales, reportStartDate, reportEndDate);
        downloadSalesReportPDF(doc);
        alert('Reporte generado exitosamente');
    };

    const handleGenerateQuote = () => {
        if (!activeCart.clientData.name) {
            alert('Ingrese al menos el nombre del cliente');
            return;
        }
        if (activeCart.items.length === 0) {
            alert('Agregue productos al carrito');
            return;
        }
        if (exchangeRate <= 0) {
            alert('Ingrese la tasa de cambio');
            return;
        }
        const doc = generateQuotePDF(activeCart.items, activeCart.clientData, exchangeRate);
        downloadQuotePDF(doc);
        alert('Presupuesto generado exitosamente');
        setShowQuoteForm(false);
    };

    // Filter sales by selected date
    const filteredSales = sales.filter(sale => {
        if (!historyDateFilter) return true;
        return sale.date === historyDateFilter;
    });

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '2rem' }}>
                <h1>Ventas y Egresos</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Registro de salidas de inventario y ventas</p>
            </header>

            {/* Exchange Rate Section */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                        <h3 style={{ marginBottom: '0.5rem' }}>Tasa de Cambio del Día</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Ingrese la tasa BCV actual
                        </p>
                        {lastRateUpdate && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.25rem' }}>
                                Última actualización: {lastRateUpdate}
                                {exchangeRateSource && ` | Fuente: ${exchangeRateSource}`}
                            </p>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="number"
                            step="0.01"
                            value={exchangeRateInput}
                            onChange={(e) => handleManualChange(e.target.value)}
                            onBlur={() => handleExchangeRateUpdate(exchangeRateInput, 'Manual')}
                            placeholder="Tasa Bs/$"
                            style={{ width: '150px', textAlign: 'right', fontSize: '1.2rem', fontWeight: 'bold' }}
                        />
                        <span style={{ fontSize: '1.2rem' }}>Bs/$</span>
                        <button
                            onClick={fetchExchangeRate}
                            disabled={loadingRate}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', minWidth: '100px' }}
                            title="Obtener tasa oficial BCV del día"
                        >
                            {loadingRate ? '⏳ Cargando...' : '🔄 BCV'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Multi-Cart Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {carts.map(cart => (
                    <div
                        key={cart.id}
                        onClick={() => setActiveCartId(cart.id)}
                        style={{
                            padding: '0.75rem 1rem',
                            background: activeCartId === cart.id ? 'var(--accent-primary)' : 'var(--bg-card)',
                            color: activeCartId === cart.id ? 'white' : 'var(--text-secondary)',
                            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            border: '1px solid var(--glass-border)',
                            borderBottom: activeCartId === cart.id ? 'none' : '1px solid var(--glass-border)',
                            minWidth: '120px',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span style={{ fontWeight: '500' }}>{cart.name}</span>
                        {carts.length > 1 && (
                            <X
                                size={14}
                                onClick={(e) => closeCart(cart.id, e)}
                                style={{ opacity: 0.7, cursor: 'pointer' }}
                            />
                        )}
                    </div>
                ))}
                <button
                    onClick={addNewCart}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px' }}
                    title="Nueva Venta"
                >
                    <Plus size={18} />
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                {/* Sale Form */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: '0 var(--radius-lg) var(--radius-lg) var(--radius-lg)' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Nuevo Registro - {activeCart.name}</h3>

                    {/* Date and Payment Type */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Fecha</label>
                            <input
                                type="date"
                                value={saleDate}
                                onChange={(e) => setSaleDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tipo de Transacción</label>
                            <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                                <option value="cash">Venta Contado</option>
                                <option value="credit">Venta Crédito</option>
                            </select>
                        </div>
                    </div>

                    {/* Product Search */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Buscar Producto</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="SKU, Referencia o Descripción"
                        />

                        {searchTerm && filteredProducts.length > 0 && (
                            <div style={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                marginTop: '0.5rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-secondary)'
                            }}>
                                {filteredProducts.slice(0, 10).map(product => (
                                    <div
                                        key={product.id}
                                        onClick={() => {
                                            setSelectedProduct(product);
                                            setSearchTerm(product.description);
                                            setPriceUSD(product.price || 0);
                                        }}
                                        style={{
                                            padding: '0.75rem',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid var(--border-color)',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ fontWeight: '500' }}>{product.description}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            SKU: {product.sku} | Stock: {product.quantity} | ${product.price || 0}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quantity and Price */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cantidad</label>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                disabled={!selectedProduct}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Precio USD</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={priceUSD}
                                onChange={(e) => setPriceUSD(e.target.value)}
                                disabled={!selectedProduct}
                            />
                        </div>
                    </div>

                    {priceUSD > 0 && quantity > 0 && exchangeRate > 0 && (
                        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                Total:
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: '500' }}>
                                <span>${(priceUSD * quantity).toFixed(2)} USD</span>
                                <span>Bs. {(priceUSD * quantity * exchangeRate).toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <button
                        className="btn btn-primary"
                        onClick={addToCart}
                        disabled={!selectedProduct}
                        style={{ width: '100%' }}
                    >
                        <Plus size={18} /> Agregar al Carrito
                    </button>
                </div>

                {/* Cart Summary */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Carrito - {activeCart.name}</h3>

                    {activeCart.items.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                            El carrito está vacío
                        </p>
                    ) : (
                        <>
                            <div style={{ marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                {activeCart.items.map((item, index) => (
                                    <div key={index} style={{
                                        padding: '0.75rem',
                                        marginBottom: '0.5rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.875rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <strong>{item.description}</strong>
                                            <button
                                                onClick={() => removeFromCart(index)}
                                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)' }}>
                                            <div>Cant: {item.quantity} | ${item.amountUSD.toFixed(2)}</div>
                                            <div>Bs. {item.amountBs.toFixed(2)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Payment Currency Selector */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                    Moneda de Pago
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <button
                                        onClick={() => setPaymentCurrency('USD')}
                                        className={`btn ${paymentCurrency === 'USD' ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ fontSize: '0.875rem' }}
                                    >
                                        USD
                                    </button>
                                    <button
                                        onClick={() => setPaymentCurrency('Bs')}
                                        className={`btn ${paymentCurrency === 'Bs' ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ fontSize: '0.875rem' }}
                                    >
                                        Bs
                                    </button>
                                    <button
                                        onClick={() => {
                                            setPaymentCurrency('Combinado');
                                            setCustomUSD(cartTotalUSD);
                                            setCustomBs(cartTotalBs);
                                        }}
                                        className={`btn ${paymentCurrency === 'Combinado' ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ fontSize: '0.875rem' }}
                                    >
                                        Combinado
                                    </button>
                                </div>

                                {paymentCurrency === 'Combinado' && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem' }}>Monto USD</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={customUSD}
                                                    onChange={(e) => {
                                                        const usdValue = parseFloat(e.target.value) || 0;
                                                        setCustomUSD(usdValue);
                                                        const usdInBs = usdValue * exchangeRate;
                                                        const remaining = cartTotalBs - usdInBs;
                                                        setCustomBs(remaining > 0 ? remaining : 0);
                                                    }}
                                                    style={{ width: '100%' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem' }}>Monto Bs</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={customBs}
                                                    onChange={(e) => setCustomBs(parseFloat(e.target.value) || 0)}
                                                    style={{ width: '100%' }}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div style={{
                                padding: '1rem',
                                background: paymentType === 'cash' ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--warning-rgb), 0.1)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    {paymentType === 'cash' ? <DollarSign size={20} /> : <CreditCard size={20} />}
                                    <strong style={{ marginLeft: '0.5rem' }}>
                                        {paymentType === 'cash' ? 'Contado' : 'Crédito'}
                                    </strong>
                                </div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    {paymentCurrency === 'USD' ? (
                                        <div>Total: ${cartTotalUSD.toFixed(2)} USD</div>
                                    ) : paymentCurrency === 'Bs' ? (
                                        <div>Total: Bs. {cartTotalBs.toFixed(2)}</div>
                                    ) : (
                                        <>
                                            <div>${customUSD.toFixed(2)} USD</div>
                                            <div>Bs. {customBs.toFixed(2)}</div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={finalizeSale}
                                style={{ width: '100%' }}
                            >
                                <PackageCheck size={18} /> Finalizar
                            </button>

                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowQuoteForm(true)}
                                style={{ width: '100%', marginTop: '0.5rem' }}
                            >
                                <FileText size={18} /> Generar Presupuesto
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Sales Report Section */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Reportes</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Desde:</label>
                            <input
                                type="date"
                                value={reportStartDate}
                                onChange={(e) => setReportStartDate(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Hasta:</label>
                            <input
                                type="date"
                                value={reportEndDate}
                                onChange={(e) => setReportEndDate(e.target.value)}
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleGenerateReport}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        >
                            <Download size={16} /> Generar Reporte PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Sales History */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Historial de Ventas y Egresos</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Filtrar por fecha:</label>
                        <input
                            type="date"
                            value={historyDateFilter}
                            onChange={(e) => setHistoryDateFilter(e.target.value)}
                            style={{ width: '160px' }}
                        />
                        {historyDateFilter && (
                            <button
                                className="btn btn-secondary"
                                onClick={() => setHistoryDateFilter('')}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            >
                                Ver Todas
                            </button>
                        )}
                    </div>
                </div>

                {filteredSales.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                        No hay registros
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.875rem' }}>
                            <thead style={{ borderBottom: '2px solid var(--border-color)' }}>
                                <tr>
                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Fecha</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Producto</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>SKU</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Cant.</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tipo</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>USD</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Bolívares</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.slice(0, 50).map(sale => (
                                    <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.75rem' }}>{sale.date ? sale.date.split('-').reverse().join('/') : 'N/A'}</td>
                                        <td style={{ padding: '0.75rem' }}>{sale.description}</td>
                                        <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{sale.sku}</td>
                                        <td style={{ padding: '0.75rem' }}>{sale.quantity}</td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <span className={`badge ${sale.paymentType === 'cash' ? 'badge-success' : 'badge-warning'}`}>
                                                {sale.paymentType === 'cash' ? 'Contado' : 'Crédito'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                            {sale.paymentCurrency === 'USD' || sale.paymentCurrency === 'Combinado'
                                                ? `$${(sale.amountUSD || 0).toFixed(2)}`
                                                : '$0.00'}
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                            {sale.paymentCurrency === 'Bs' || sale.paymentCurrency === 'Combinado'
                                                ? `Bs ${(sale.amountBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                : 'Bs 0.00'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot style={{ borderTop: '2px solid var(--border-color)', fontWeight: 'bold' }}>
                                <tr>
                                    <td colSpan="5" style={{ padding: '0.75rem', textAlign: 'right' }}>TOTALES:</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                        ${filteredSales.reduce((sum, sale) => {
                                            if (sale.paymentCurrency === 'USD' || sale.paymentCurrency === 'Combinado') {
                                                return sum + (sale.amountUSD || 0);
                                            }
                                            return sum;
                                        }, 0).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                        Bs {filteredSales.reduce((sum, sale) => {
                                            if (sale.paymentCurrency === 'Bs' || sale.paymentCurrency === 'Combinado') {
                                                return sum + (sale.amountBs || 0);
                                            }
                                            return sum;
                                        }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
            {/* Quote Form Modal */}
            {showQuoteForm && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <h2>Datos para Presupuesto</h2>
                        <p className="text-secondary mb-4">Ingrese los datos del cliente para el encabezado del PDF</p>

                        <div className="form-group mb-3">
                            <label>Nombre del Cliente *</label>
                            <input
                                type="text"
                                className="form-control"
                                value={activeCart.clientData.name}
                                onChange={e => updateActiveCart({ clientData: { ...activeCart.clientData, name: e.target.value } })}
                                placeholder="Ej: Empresa C.A. o Nombre Personal"
                            />
                        </div>

                        <div className="form-group mb-3">
                            <label>Teléfono</label>
                            <input
                                type="text"
                                className="form-control"
                                value={activeCart.clientData.phone}
                                onChange={e => updateActiveCart({ clientData: { ...activeCart.clientData, phone: e.target.value } })}
                            />
                        </div>

                        <div className="form-group mb-3">
                            <label>Email</label>
                            <input
                                type="email"
                                className="form-control"
                                value={activeCart.clientData.email}
                                onChange={e => updateActiveCart({ clientData: { ...activeCart.clientData, email: e.target.value } })}
                            />
                        </div>

                        <div className="form-group mb-4">
                            <label>Dirección</label>
                            <textarea
                                className="form-control"
                                value={activeCart.clientData.address}
                                onChange={e => updateActiveCart({ clientData: { ...activeCart.clientData, address: e.target.value } })}
                                rows="2"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowQuoteForm(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleGenerateQuote}
                            >
                                <Download size={18} /> Descargar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;

