import React, { useState, useEffect, useMemo } from 'react';
import {
    Package, User, FileText, CheckCircle, Search, Plus, Minus, Trash2,
    ChevronRight, ChevronLeft, ShoppingCart, DollarSign, RefreshCw,
    UserPlus, Users, Receipt, FileCheck, X, MapPin, Phone, Mail, ClipboardList, Calendar
} from '../utils/icons';
import DailySalesModal from './DailySalesModal';
import InvoiceDocument from './InvoiceDocument';
import { useInventoryContext } from '../context/InventoryContext';
import { useCompany } from '../context/CompanyContext';
import { auth, db } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const POS = () => {
    const { products, addSale, sales, customers, addCustomer } = useInventoryContext();
    const { currentCompany } = useCompany();
    const [showSalesModal, setShowSalesModal] = useState(false);

    // Wizard step
    const [step, setStep] = useState(1);
    const steps = [
        { id: 1, label: 'Productos', icon: Package },
        { id: 2, label: 'Cliente', icon: User },
        { id: 3, label: 'Tipo Venta', icon: FileText },
        { id: 4, label: 'Documento', icon: Receipt },
        { id: 5, label: 'Listo', icon: CheckCircle }
    ];

    // Exchange rates
    const [bcvRate, setBcvRate] = useState(0);
    const [binanceRate, setBinanceRate] = useState(0);
    const [exchangeRate, setExchangeRate] = useState(0); // Currently selected rate
    const [selectedRateType, setSelectedRateType] = useState('bcv'); // bcv or binance
    const [loadingRates, setLoadingRates] = useState(false);

    // Cart
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Customer
    const [customerType, setCustomerType] = useState('quick'); // quick, existing, new
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');
    // const [customers, setCustomers] = useState([]); // REMOVED: Using context customers
    const [newCustomer, setNewCustomer] = useState({
        type: 'V', name: '', rif: '', phone: '', address: ''
    });

    // Sale type
    const [saleType, setSaleType] = useState('contado'); // contado, credito
    const [posMode, setPosMode] = useState('sale'); // sale, quote (presupuesto)
    const [creditDays, setCreditDays] = useState(30);
    const [customCreditDays, setCustomCreditDays] = useState('');

    // Document type
    const [documentType, setDocumentType] = useState('pedido'); // pedido, factura

    // Completed sale for document view
    const [completedSale, setCompletedSale] = useState(null);
    const [documentNumber, setDocumentNumber] = useState('');

    // Fetch BCV rate
    const fetchBcvRate = async () => {
        try {
            const response = await fetch('https://ve.dolarapi.com/v1/dolares');
            const data = await response.json();
            const oficialRate = data.find(item => item.fuente === 'oficial');
            if (oficialRate?.promedio) {
                const rate = Math.round(oficialRate.promedio * 100) / 100;
                setBcvRate(rate);
                localStorage.setItem('bcvRate', rate.toString());
                return rate;
            }
        } catch (error) {
            console.error('Error fetching BCV rate:', error);
        }
        return null;
    };

    // Fetch Binance P2P real rate (USDT/VES) using the search endpoint via local proxy
    const fetchBinanceRate = async () => {
        try {
            // Updated to use our new Vite proxy configured in vite.config.js
            const binanceProxyUrl = '/api-binance/bapi/c2c/v2/friendly/c2c/adv/search';

            const response = await fetch(binanceProxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': '*/*',
                },
                body: JSON.stringify({
                    asset: 'USDT',
                    fiat: 'VES',
                    merchantCheck: true,
                    page: 1,
                    rows: 10,
                    tradeType: 'SELL'
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            if (data?.data && data.data.length > 0) {
                // We take the average of the top 10 advertisers
                const prices = data.data.map(ad => parseFloat(ad.adv.price));
                const avgRate = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;

                setBinanceRate(avgRate);
                localStorage.setItem('binanceRate', avgRate.toString());
                return avgRate;
            } else {
                console.warn('No data received from Binance API through proxy');
                throw new Error('No data from Binance');
            }
        } catch (error) {
            console.error('Error fetching Binance rate via proxy:', error);

            // Fallback: load last saved or try dolarapi if proxy fails
            const saved = localStorage.getItem('binanceRate');
            if (saved) {
                const rate = parseFloat(saved);
                setBinanceRate(rate);
                return rate;
            }

            // Ultimate fallback to Paralelo if nothing else works
            try {
                const response = await fetch('https://ve.dolarapi.com/v1/dolares');
                const data = await response.json();
                const paraleloRate = data.find(item => item.fuente === 'paralelo');
                if (paraleloRate?.promedio) {
                    const rate = Math.round(paraleloRate.promedio * 100) / 100;
                    setBinanceRate(rate);
                    return rate;
                }
            } catch (e) {
                console.error('Total fallback failed:', e);
            }
        }
        return null;
    };

    // Fetch all rates
    const fetchAllRates = async () => {
        setLoadingRates(true);
        await Promise.all([fetchBcvRate(), fetchBinanceRate()]);
        setLoadingRates(false);
    };

    // Auto-update rates on mount and every 5 minutes
    useEffect(() => {
        // Load saved rates
        const savedBcv = localStorage.getItem('bcvRate');
        const savedBinance = localStorage.getItem('binanceRate');
        const savedType = localStorage.getItem('selectedRateType') || 'bcv';

        if (savedBcv) setBcvRate(parseFloat(savedBcv));
        if (savedBinance) setBinanceRate(parseFloat(savedBinance));
        setSelectedRateType(savedType);

        // Fetch fresh rates
        fetchAllRates();

        // Auto-update every 5 minutes
        const interval = setInterval(fetchAllRates, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Update exchangeRate when selection changes
    useEffect(() => {
        const rate = selectedRateType === 'bcv' ? bcvRate : binanceRate;
        setExchangeRate(rate);
        localStorage.setItem('selectedRateType', selectedRateType);
    }, [selectedRateType, bcvRate, binanceRate]);

    // Filter products with useMemo to avoid recalculation on every render
    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;
        const term = searchTerm.toLowerCase();
        return products.filter(p =>
            p.sku?.toLowerCase().includes(term) ||
            p.description?.toLowerCase().includes(term) ||
            p.reference?.toLowerCase().includes(term)
        );
    }, [products, searchTerm]);

    // Cart calculations
    const subtotal = cart.reduce((sum, item) => sum + (item.priceUSD * item.qty), 0);
    const iva = documentType === 'factura' ? subtotal * 0.16 : 0;
    const total = subtotal + iva;
    const totalBs = total * exchangeRate;

    // Add to cart
    const addToCart = (product) => {
        const existing = cart.find(item => item.productId === product.id);
        const isQuote = posMode === 'quote';

        if (existing) {
            setCart(cart.map(item =>
                item.productId === product.id
                    // In quote mode, no stock limit
                    ? { ...item, qty: isQuote ? item.qty + 1 : Math.min(item.qty + 1, product.quantity) }
                    : item
            ));
        } else {
            setCart([...cart, {
                productId: product.id,
                sku: product.sku,
                reference: product.reference || product.sku,
                description: product.description,
                brand: product.brand || '',
                location: product.location || '',
                priceUSD: product.price || 0,
                qty: 1,
                maxQty: isQuote ? 9999 : product.quantity // No limit in quote mode
            }]);
        }
    };

    // Update cart item
    const updateCartItem = (index, field, value) => {
        setCart(cart.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
    };

    // Remove from cart
    const removeFromCart = (index) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    /* REMOVED: Customers loaded via context
    // Load customers
    const loadCustomers = async () => {
        ...
    };

    useEffect(() => {
        if (step === 2) loadCustomers();
    }, [step, currentCompany?.id]);
    */

    // Create customer
    const createCustomer = async () => {
        if (!newCustomer.name || !currentCompany?.id) {
            alert('Por favor ingresa al menos el nombre del cliente');
            return;
        }
        try {
            const id = await addCustomer(newCustomer);
            const created = { id, ...newCustomer, companyId: currentCompany.id };
            setSelectedCustomer(created);
            setCustomerType('existing');
            // Context will auto-update customers list

            // Reset form
            setNewCustomer({
                type: 'V', name: '', rif: '', phone: '', address: ''
            });
            alert(`Cliente "${created.name}" creado exitosamente`);
        } catch (err) {
            console.error('Error creating customer:', err);
            alert('Error al crear el cliente. Por favor intenta de nuevo.');
        }
    };

    // Finalize sale
    const finalizeSale = async () => {
        if (cart.length === 0) return;

        const userName = auth.currentUser?.displayName || auth.currentUser?.email || 'Usuario';
        const isQuote = posMode === 'quote';

        // Calculate due date for credit sales
        const today = new Date();
        const dueDate = saleType === 'credito'
            ? new Date(today.getTime() + (creditDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
            : null;

        // For quotes: set expiration at midnight Venezuela time (UTC-4)
        let expiresAt = null;
        if (isQuote) {
            const midnight = new Date();
            midnight.setHours(23, 59, 59, 999); // End of today
            expiresAt = midnight.toISOString();
        }

        // Generate document number (simple sequential based on today's sales count)
        const todaySales = sales.filter(s => s.date === today.toISOString().split('T')[0]);
        const prefix = isQuote ? 'PR-' : '';
        const newDocNumber = prefix + String(todaySales.length + 1).padStart(6, '0');

        const saleItems = cart.map(item => ({
            productId: item.productId,
            sku: item.sku,
            reference: item.reference || item.sku,
            description: item.description,
            quantity: item.qty,
            unitPrice: item.priceUSD,
            amountUSD: item.priceUSD * item.qty,
            amountBs: item.priceUSD * item.qty * exchangeRate,
            date: today.toISOString().split('T')[0],
            paymentType: isQuote ? 'presupuesto' : saleType,
            creditDays: saleType === 'credito' ? creditDays : null,
            dueDate,
            paymentCurrency: 'USD',
            exchangeRate,
            documentType: isQuote ? 'presupuesto' : documentType,
            documentNumber: newDocNumber,
            hasIVA: documentType === 'factura' && !isQuote,
            ivaAmount: (documentType === 'factura' && !isQuote) ? (item.priceUSD * item.qty) * 0.16 : 0,
            customer: customerType === 'quick' ? null : selectedCustomer,
            customerId: customerType === 'quick' ? null : selectedCustomer?.id,
            // Quote specific fields
            isQuote,
            expiresAt,
            // For accounts receivable
            status: isQuote ? 'pending' : (saleType === 'credito' ? 'pending' : 'paid'),
            paidAmount: (saleType === 'credito' || isQuote) ? 0 : (item.priceUSD * item.qty),
            remainingAmount: (saleType === 'credito' || isQuote) ? (item.priceUSD * item.qty) : 0
        }));

        await addSale(saleItems, userName);

        // Prepare completed sale data for document view
        setCompletedSale({
            items: cart.map(item => ({
                ...item,
                reference: item.reference || item.sku
            })),
            customer: customerType === 'quick' ? null : selectedCustomer,
            documentType: isQuote ? 'presupuesto' : documentType,
            paymentType: isQuote ? 'presupuesto' : saleType,
            creditDays: saleType === 'credito' ? creditDays : null,
            dueDate,
            subtotal,
            iva: isQuote ? 0 : iva,
            total: isQuote ? subtotal : total,
            totalBs: isQuote ? subtotal * exchangeRate : totalBs,
            exchangeRate,
            date: today.toISOString(),
            isQuote,
            expiresAt
        });
        setDocumentNumber(newDocNumber);

        // Move to document view step
        setStep(5);
    };

    // Reset and start new sale
    const startNewSale = () => {
        setCart([]);
        setStep(1);
        setSelectedCustomer(null);
        setCustomerType('quick');
        setSaleType('contado');
        setCreditDays(30);
        setDocumentType('pedido');
        setCompletedSale(null);
        setDocumentNumber('');
    };

    return (
        <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShoppingCart size={28} /> Punto de Venta
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Mode Selector */}
                        <div style={{
                            display: 'flex',
                            background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            padding: '3px',
                            gap: '2px'
                        }}>
                            <button
                                onClick={() => { setPosMode('sale'); setCart([]); }}
                                style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    background: posMode === 'sale' ? 'var(--primary)' : 'transparent',
                                    color: posMode === 'sale' ? 'white' : 'var(--text-secondary)',
                                    fontWeight: 500,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                💰 Venta
                            </button>
                            <button
                                onClick={() => { setPosMode('quote'); setCart([]); }}
                                style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    background: posMode === 'quote' ? '#f59e0b' : 'transparent',
                                    color: posMode === 'quote' ? 'white' : 'var(--text-secondary)',
                                    fontWeight: 500,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                📋 Presupuesto
                            </button>
                        </div>
                        <button
                            onClick={() => setShowSalesModal(true)}
                            className="btn btn-secondary"
                            style={{
                                padding: '0.25rem 0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.75rem',
                                height: 'auto'
                            }}
                        >
                            <ClipboardList size={14} />
                            <span>Ventas del Día</span>
                        </button>
                    </div>
                </div>

                {/* Exchange Rates Display */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* BCV Rate */}
                    <div
                        onClick={() => setSelectedRateType('bcv')}
                        style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            background: selectedRateType === 'bcv' ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg-card)',
                            border: selectedRateType === 'bcv' ? '2px solid #22c55e' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 'bold', textTransform: 'uppercase' }}>BCV</div>
                        <div style={{ fontWeight: 'bold', color: '#22c55e', fontSize: '1rem' }}>
                            {bcvRate.toFixed(2)} <span style={{ fontSize: '0.7rem' }}>Bs/$</span>
                        </div>
                    </div>

                    {/* Binance Rate - Editable */}
                    <div
                        onClick={() => setSelectedRateType('binance')}
                        style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            background: selectedRateType === 'binance' ? 'rgba(234, 179, 8, 0.2)' : 'var(--bg-card)',
                            border: selectedRateType === 'binance' ? '2px solid #eab308' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ fontSize: '0.65rem', color: '#eab308', fontWeight: 'bold', textTransform: 'uppercase' }}>BINANCE</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <input
                                type="number"
                                step="0.01"
                                value={binanceRate}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                    const newRate = parseFloat(e.target.value) || 0;
                                    setBinanceRate(newRate);
                                    localStorage.setItem('binanceRate', newRate.toString());
                                }}
                                style={{
                                    width: '70px',
                                    textAlign: 'right',
                                    fontWeight: 'bold',
                                    color: '#eab308',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: '1px dashed #eab308',
                                    fontSize: '1rem',
                                    padding: '0'
                                }}
                            />
                            <span style={{ fontSize: '0.7rem', color: '#eab308' }}>Bs/$</span>
                        </div>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={fetchAllRates}
                        disabled={loadingRates}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem' }}
                        title="Actualizar tasas"
                    >
                        <RefreshCw size={16} className={loadingRates ? 'spin' : ''} />
                    </button>
                </div>
            </header>

            {/* Progress Steps */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {steps.map((s, i) => {
                    const StepIcon = s.icon;
                    const isActive = step === s.id;
                    const isCompleted = step > s.id;
                    return (
                        <div
                            key={s.id}
                            onClick={() => s.id < step && setStep(s.id)}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                background: isActive ? 'var(--accent-primary)' : isCompleted ? 'rgba(34,197,94,0.2)' : 'var(--bg-card)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: s.id < step ? 'pointer' : 'default',
                                color: isActive ? 'white' : isCompleted ? 'var(--success)' : 'var(--text-secondary)',
                                border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`
                            }}
                        >
                            <StepIcon size={20} />
                            <span style={{ fontWeight: isActive ? 'bold' : 'normal' }}>{s.label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: step === 1 ? '1fr 350px' : '1fr', gap: '1rem', minHeight: 0 }}>

                {/* Step 1: Products */}
                {step === 1 && (
                    <>
                        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 280px)' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Buscar por SKU, descripción o referencia..."
                                        style={{ paddingLeft: '2.5rem', width: '100%' }}
                                    />
                                </div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                                        <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Referencia</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Descripción</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Marca</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Precio</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map(product => (
                                            <tr
                                                key={product.id}
                                                onClick={() => product.quantity > 0 && addToCart(product)}
                                                style={{
                                                    borderBottom: '1px solid var(--border-color)',
                                                    cursor: product.quantity > 0 ? 'pointer' : 'not-allowed',
                                                    opacity: product.quantity > 0 ? 1 : 0.5,
                                                    transition: 'background 0.2s'
                                                }}
                                                className="hover:bg-slate-800"
                                            >
                                                <td style={{ padding: '0.75rem', fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                                    {product.reference || '-'}
                                                </td>
                                                <td style={{ padding: '0.75rem', fontSize: '0.9rem', fontWeight: '500' }}>
                                                    {product.description}
                                                </td>
                                                <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    {product.brand || '-'}
                                                </td>
                                                <td style={{ padding: '0.75rem', fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--success)', textAlign: 'right' }}>
                                                    ${product.price?.toFixed(2) || '0.00'}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600',
                                                        background: product.quantity > 10 ? 'rgba(16, 185, 129, 0.15)' :
                                                            product.quantity > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                        color: product.quantity > 10 ? 'var(--success)' :
                                                            product.quantity > 0 ? 'var(--warning)' : 'var(--danger)'
                                                    }}>
                                                        {product.quantity}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Cart */}
                        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ShoppingCart size={20} /> Carrito ({cart.length})
                            </h3>
                            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                                {cart.length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>Carrito vacío</p>
                                ) : cart.map((item, index) => (
                                    <div key={index} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <strong style={{ fontSize: '0.8rem' }}>{item.description}</strong>
                                            <button onClick={() => removeFromCart(index)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        {/* Precio unitario */}
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                            P/U: <span style={{ color: 'var(--success)' }}>${item.priceUSD.toFixed(2)}</span> | <span style={{ color: 'var(--accent-primary)' }}>Bs {(item.priceUSD * exchangeRate).toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <button onClick={() => updateCartItem(index, 'qty', Math.max(1, item.qty - 1))} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
                                                <Minus size={12} />
                                            </button>
                                            <span style={{ minWidth: '30px', textAlign: 'center' }}>{item.qty}</span>
                                            <button onClick={() => updateCartItem(index, 'qty', Math.min(item.maxQty, item.qty + 1))} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
                                                <Plus size={12} />
                                            </button>
                                            <span style={{ marginLeft: 'auto' }}>×</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.priceUSD}
                                                onChange={(e) => updateCartItem(index, 'priceUSD', parseFloat(e.target.value) || 0)}
                                                style={{ width: '70px', textAlign: 'right', padding: '0.25rem' }}
                                            />
                                        </div>
                                        {/* Total por ítem en USD y Bs */}
                                        <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                                            <div style={{ color: 'var(--success)', fontWeight: 'bold' }}>${(item.priceUSD * item.qty).toFixed(2)}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bs {(item.priceUSD * item.qty * exchangeRate).toFixed(2)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span>Subtotal:</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                {documentType === 'factura' && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--warning)' }}>
                                        <span>IVA (16%):</span>
                                        <span>${iva.toFixed(2)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    <span>Total:</span>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: 'var(--success)' }}>${total.toFixed(2)}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bs {totalBs.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Step 2: Customer - Streamlined Design */}
                {step === 2 && (
                    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>Cliente</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            Busca un cliente existente o continúa como Venta Rápida
                        </p>

                        {/* Smart Search Input */}
                        <div className="input-group" style={{ marginBottom: '1rem' }}>
                            <Search className="input-icon" size={18} />
                            <input
                                type="text"
                                value={customerSearch}
                                onChange={(e) => {
                                    setCustomerSearch(e.target.value);
                                    if (!e.target.value) {
                                        setSelectedCustomer(null);
                                        setCustomerType('quick');
                                    }
                                }}
                                placeholder="Buscar por nombre o cédula/RIF..."
                                style={{ width: '100%' }}
                                autoFocus
                            />
                            {customerSearch && (
                                <button
                                    onClick={() => { setCustomerSearch(''); setSelectedCustomer(null); setCustomerType('quick'); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--text-secondary)' }}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Search Results */}
                        {customerSearch && (
                            <div style={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                marginBottom: '1rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                {customers.filter(c =>
                                    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                    c.rif?.toLowerCase().includes(customerSearch.toLowerCase())
                                ).length > 0 ? (
                                    customers.filter(c =>
                                        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                        c.rif?.toLowerCase().includes(customerSearch.toLowerCase())
                                    ).map(customer => (
                                        <div
                                            key={customer.id}
                                            onClick={() => {
                                                setSelectedCustomer(customer);
                                                setCustomerType('existing');
                                            }}
                                            style={{
                                                padding: '0.75rem 1rem',
                                                background: selectedCustomer?.id === customer.id ? 'rgba(220,38,38,0.1)' : 'transparent',
                                                borderBottom: '1px solid var(--border-color)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                transition: 'background 0.2s'
                                            }}
                                            className="hover:bg-slate-800"
                                        >
                                            <div style={{
                                                width: '36px', height: '36px', borderRadius: '50%',
                                                background: selectedCustomer?.id === customer.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: selectedCustomer?.id === customer.id ? 'white' : 'var(--text-secondary)',
                                                fontWeight: 'bold', fontSize: '0.9rem'
                                            }}>
                                                {customer.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '500' }}>{customer.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    {customer.type}-{customer.rif || 'S/I'} {customer.phone && `• ${customer.phone}`}
                                                </div>
                                            </div>
                                            {selectedCustomer?.id === customer.id && (
                                                <CheckCircle size={20} style={{ color: 'var(--accent-primary)' }} />
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                            No se encontraron clientes con "{customerSearch}"
                                        </p>
                                        <button
                                            onClick={() => {
                                                setNewCustomer({ ...newCustomer, name: customerSearch });
                                                setCustomerType('new');
                                            }}
                                            className="btn btn-secondary"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                                        >
                                            <UserPlus size={16} /> Crear "{customerSearch.substring(0, 20)}..."
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Selected Customer Badge or Quick Sale Badge */}
                        <div style={{
                            padding: '1rem',
                            background: selectedCustomer ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            border: `1px solid ${selectedCustomer ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem'
                        }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                background: selectedCustomer ? '#10B981' : '#3B82F6',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white'
                            }}>
                                {selectedCustomer ? <User size={20} /> : <ShoppingCart size={20} />}
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                    {selectedCustomer ? selectedCustomer.name : 'Venta Rápida'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {selectedCustomer
                                        ? `${selectedCustomer.type}-${selectedCustomer.rif || 'S/I'}`
                                        : 'Cliente casual sin datos fiscales'}
                                </div>
                            </div>
                            {selectedCustomer && (
                                <button
                                    onClick={() => { setSelectedCustomer(null); setCustomerType('quick'); setCustomerSearch(''); }}
                                    className="btn btn-ghost"
                                    style={{ marginLeft: 'auto', padding: '0.5rem' }}
                                    title="Cambiar a Venta Rápida"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Inline New Customer Form (appears when customerType is 'new') */}
                        {customerType === 'new' && (
                            <div style={{
                                padding: '1.5rem',
                                background: 'var(--bg-card)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                marginBottom: '1.5rem'
                            }}>
                                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <UserPlus size={18} /> Crear Nuevo Cliente
                                </h4>
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '0.5rem' }}>
                                        <select
                                            value={newCustomer.type}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, type: e.target.value })}
                                            style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
                                        >
                                            <option value="V">V</option>
                                            <option value="E">E</option>
                                            <option value="J">J</option>
                                            <option value="G">G</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={newCustomer.rif}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, rif: e.target.value })}
                                            placeholder="Cédula / RIF"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={newCustomer.name}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                        placeholder="Nombre o Razón Social *"
                                    />
                                    <input
                                        type="text"
                                        value={newCustomer.phone}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                        placeholder="Teléfono"
                                    />
                                    <input
                                        type="text"
                                        value={newCustomer.address}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                        placeholder="Dirección fiscal"
                                    />
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                        <button
                                            onClick={() => {
                                                setCustomerType('quick');
                                                setNewCustomer({ type: 'V', name: '', rif: '', phone: '', address: '' });
                                            }}
                                            className="btn btn-secondary"
                                            style={{ flex: 1 }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={createCustomer}
                                            className="btn btn-primary"
                                            style={{ flex: 1 }}
                                            disabled={!newCustomer.name}
                                        >
                                            <UserPlus size={16} /> Crear y Seleccionar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Sale Type */}
                {step === 3 && (
                    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Tipo de Venta</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <button
                                onClick={() => setSaleType('contado')}
                                className={`btn ${saleType === 'contado' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '2rem', flexDirection: 'column', gap: '0.5rem' }}
                            >
                                <DollarSign size={32} />
                                <span style={{ fontSize: '1.1rem' }}>CONTADO</span>
                            </button>
                            <button
                                onClick={() => setSaleType('credito')}
                                className={`btn ${saleType === 'credito' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '2rem', flexDirection: 'column', gap: '0.5rem' }}
                            >
                                <Calendar size={32} />
                                <span style={{ fontSize: '1.1rem' }}>CRÉDITO</span>
                            </button>
                        </div>

                        {/* Credit Days Selector - Only when Credit is selected */}
                        {saleType === 'credito' && (
                            <div style={{
                                padding: '1.5rem',
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <Calendar size={18} style={{ color: '#f59e0b' }} />
                                    <strong style={{ color: '#f59e0b' }}>Días de Crédito</strong>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                    {[15, 30, 45, 60, 90].map(days => (
                                        <button
                                            key={days}
                                            onClick={() => { setCreditDays(days); setCustomCreditDays(''); }}
                                            className={`btn ${creditDays === days && !customCreditDays ? 'btn-primary' : 'btn-secondary'}`}
                                            style={{ padding: '0.5rem 1rem', minWidth: '60px' }}
                                        >
                                            {days}
                                        </button>
                                    ))}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Otro:</span>
                                        <input
                                            type="number"
                                            value={customCreditDays}
                                            onChange={(e) => {
                                                setCustomCreditDays(e.target.value);
                                                if (e.target.value) setCreditDays(parseInt(e.target.value) || 30);
                                            }}
                                            placeholder="Días"
                                            style={{ width: '70px', padding: '0.5rem', textAlign: 'center' }}
                                            min="1"
                                            max="365"
                                        />
                                    </div>
                                </div>

                                <div style={{
                                    fontSize: '0.9rem',
                                    padding: '0.75rem',
                                    background: 'rgba(0,0,0,0.1)',
                                    borderRadius: 'var(--radius-sm)'
                                }}>
                                    <strong>Fecha de Vencimiento: </strong>
                                    <span style={{ color: '#f59e0b' }}>
                                        {new Date(Date.now() + (creditDays * 24 * 60 * 60 * 1000)).toLocaleDateString('es-VE')}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Preview */}
                        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                            <h4 style={{ marginBottom: '1rem' }}>Resumen</h4>
                            <div style={{ fontSize: '0.9rem' }}>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <strong>Cliente:</strong> {customerType === 'quick' ? 'Venta Rápida' : selectedCustomer?.name || 'No seleccionado'}
                                </div>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <strong>Ítems:</strong> {cart.length} ({cart.reduce((s, i) => s + i.qty, 0)} unidades)
                                </div>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <strong>Tipo:</strong> {saleType === 'contado' ? 'Contado' : `Crédito (${creditDays} días)`}
                                </div>
                                <div>
                                    <strong>Total:</strong> ${total.toFixed(2)} / Bs {totalBs.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Finish */}
                {step === 4 && (
                    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Generar Documento</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                            <button
                                onClick={() => setDocumentType('pedido')}
                                className={`btn ${documentType === 'pedido' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '2rem', flexDirection: 'column', gap: '0.5rem' }}
                            >
                                <Receipt size={32} />
                                <span style={{ fontSize: '1.1rem' }}>📋 PEDIDO</span>
                                <span style={{ fontSize: '0.75rem', color: documentType === 'pedido' ? 'white' : 'var(--text-secondary)' }}>Sin IVA</span>
                            </button>
                            <button
                                onClick={() => setDocumentType('factura')}
                                className={`btn ${documentType === 'factura' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '2rem', flexDirection: 'column', gap: '0.5rem' }}
                            >
                                <FileCheck size={32} />
                                <span style={{ fontSize: '1.1rem' }}>🧾 FACTURA</span>
                                <span style={{ fontSize: '0.75rem', color: documentType === 'factura' ? 'white' : 'var(--text-secondary)' }}>Con IVA 16%</span>
                            </button>
                        </div>

                        {/* Final Summary */}
                        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span>Subtotal:</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            {documentType === 'factura' && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--warning)' }}>
                                    <span>IVA (16%):</span>
                                    <span>${iva.toFixed(2)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                                <span>TOTAL:</span>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: 'var(--success)' }}>${total.toFixed(2)}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Bs {totalBs.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>

                        <button onClick={finalizeSale} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                            <CheckCircle size={20} /> Confirmar {documentType === 'pedido' ? 'Pedido' : 'Factura'}
                        </button>
                    </div>
                )}

                {/* Step 5: Document View */}
                {step === 5 && completedSale && (
                    <InvoiceDocument
                        sale={completedSale}
                        documentNumber={documentNumber}
                        onNewSale={startNewSale}
                        onPrint={() => window.print()}
                    />
                )}
            </div>

            {/* Navigation - Hidden on step 5 */}
            {step < 5 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button
                        onClick={() => setStep(step - 1)}
                        disabled={step === 1}
                        className="btn btn-secondary"
                        style={{ visibility: step === 1 ? 'hidden' : 'visible' }}
                    >
                        <ChevronLeft size={18} /> Anterior
                    </button>
                    <button
                        onClick={() => setStep(step + 1)}
                        disabled={step === 4 || cart.length === 0}
                        className="btn btn-primary"
                        style={{ visibility: step === 4 ? 'hidden' : 'visible' }}
                    >
                        Siguiente <ChevronRight size={18} />
                    </button>
                </div>
            )}
            {/* Daily Sales Modal */}
            <DailySalesModal
                isOpen={showSalesModal}
                onClose={() => setShowSalesModal(false)}
                sales={sales}
                products={products}
            />
        </div>
    );
};

export default POS;

