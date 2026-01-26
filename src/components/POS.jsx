import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Search,
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    User,
    List,
    Grid,
    CheckCircle,
    X,
    UserPlus,
    ChevronRight,
    ChevronLeft,
    DollarSign,
    RefreshCw,
    Package,
    Receipt,
    FileCheck,
    CreditCard,
    Smartphone,
    Building,
    Printer,
    Download
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../hooks/useInventory';
import { useExchangeRates } from '../context/ExchangeRateContext';
import InvoiceDocument from './InvoiceDocument';
import DailySalesModal from './DailySalesModal';

// Simple debounce implementation to avoid lodash dependency
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

// Icons for payment methods
const PAYMENT_METHODS = {
    cash_usd: { label: 'Efectivo USD', icon: DollarSign, currency: 'USD' },
    cash_bs: { label: 'Efectivo Bs', icon: DollarSign, currency: 'Bs' },
    punto: { label: 'Punto de Venta', icon: CreditCard, currency: 'USD', requiresRef: true }, // Usually processed in Bs, but amount input is USD equiv often
    transfer_usd: { label: 'Transferencia USD', icon: Building, currency: 'USD', requiresRef: true },
    transfer_bs: { label: 'Transferencia Bs', icon: Building, currency: 'Bs', requiresRef: true },
    zelle: { label: 'Zelle', icon: Smartphone, currency: 'USD', requiresRef: true },
    pago_movil: { label: 'Pago Móvil', icon: Smartphone, currency: 'Bs', requiresRef: true }
};

const POS = () => {
    const { currentCompany } = useCompany();
    const { currentUser } = useAuth();
    const { products, sales, customers, addSale, addCustomer, cashSession } = useInventory(currentCompany?.id);
    const { bcvRate, usdtRate: binanceRate, loading: loadingRates, refreshRates } = useExchangeRates();

    // Local State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [activeCartId, setActiveCartId] = useState(1);
    const [showSalesModal, setShowSalesModal] = useState(false);
    const [posMode, setPosMode] = useState('sale'); // 'sale' or 'quote'

    // Exchange Rate State (Global for POS)
    const [exchangeRate, setExchangeRate] = useState(36.5);
    const [selectedRateType, setSelectedRateType] = useState(() => localStorage.getItem('selectedRateType') || 'bcv');

    // Stats Calculation
    const dailyStats = useMemo(() => {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        return sales.reduce((acc, sale) => {
            const saleDate = new Date(sale.createdAt || sale.created_at);
            if (saleDate >= startOfDay && saleDate <= endOfDay) {
                const isPending = sale.status === 'pending' || sale.payment_status === 'pending';
                const amountUSD = parseFloat(sale.total || sale.amount_usd) || 0;

                acc.totalUSD += amountUSD;
                if (isPending) {
                    acc.pendingCount++;
                    acc.pendingUSD += amountUSD;
                } else {
                    acc.processedCount++;
                    acc.processedUSD += amountUSD;
                }
            }
            return acc;
        }, { totalUSD: 0, pendingCount: 0, pendingUSD: 0, processedCount: 0, processedUSD: 0 });
    }, [sales]);

    // Carts State
    const createEmptyCart = (id) => ({
        id,
        label: `Carrito ${id}`,
        items: [],
        customer: null,
        newCustomer: { type: 'V', name: '', rif: '', phone: '', address: '' },
        customerType: 'quick', // 'quick', 'existing', 'new'
        customerSearch: '',
        step: 1, // 1: Products, 2: Customer, 3: Sale Type, 4: Payment, 5: Document
        saleType: 'contado', // 'contado', 'credito'
        creditDays: 30,
        customCreditDays: '',
        documentType: 'pedido', // 'pedido', 'factura'
        paymentMethods: [] // [{ method: 'cash_usd', amount: 10, ... }]
    });

    const [carts, setCarts] = useState(() => {
        try {
            const saved = localStorage.getItem('pos_carts');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Normalize carts to ensure 'items' and 'paymentMethods' exist
                    return parsed.map(c => ({
                        ...createEmptyCart(c.id), // Start with default structure
                        ...c, // Override with saved data
                        items: Array.isArray(c.items) ? c.items : [], // Force array
                        paymentMethods: Array.isArray(c.paymentMethods) ? c.paymentMethods : [] // Force array
                    }));
                }
            }
        } catch (e) {
            console.error('Error parsing pos_carts:', e);
        }
        return [createEmptyCart(1)];
    });

    const activeCart = carts.find(c => c.id === activeCartId) || carts[0];
    // Safeguard against missing properties (stale localStorage)
    const {
        step = 1,
        items: activeCartItems = [], // Default to empty array if undefined
        customer = null,
        newCustomer = { type: 'V', name: '', rif: '', phone: '', address: '' },
        customerType = 'quick',
        customerSearch = '',
        saleType = 'contado',
        documentType = 'pedido',
        creditDays = 30,
        customCreditDays = '',
        paymentMethods = [] // Default to empty array
    } = activeCart || {};

    // Completed Sale State (for viewing/printing)
    const [completedSale, setCompletedSale] = useState(null);
    const [documentNumber, setDocumentNumber] = useState('');

    // --- Effects ---

    useEffect(() => {
        const rate = selectedRateType === 'bcv' ? bcvRate : binanceRate;
        setExchangeRate(rate);
        localStorage.setItem('selectedRateType', selectedRateType);
    }, [selectedRateType, bcvRate, binanceRate]);

    useEffect(() => {
        localStorage.setItem('pos_carts', JSON.stringify(carts));
    }, [carts]);

    useEffect(() => {
        localStorage.setItem('pos_active_cart_id', activeCartId.toString());
    }, [activeCartId]);



    // --- Actions ---

    const addNewCart = () => {
        if (carts.length >= 5) {
            alert('Máximo 5 carritos simultáneos permitidos');
            return;
        }
        const newId = Math.max(...carts.map(c => c.id), 0) + 1;
        const newCart = createEmptyCart(newId);
        setCarts([...carts, newCart]);
        setActiveCartId(newId);
    };

    const switchCart = (cartId) => {
        setActiveCartId(cartId);
    };

    const closeCart = (cartId) => {
        const cartToClose = carts.find(c => c.id === cartId);
        if (cartToClose?.items.length > 0) {
            if (!window.confirm(`¿Cerrar carrito con ${cartToClose.items.length} producto(s)?`)) return;
        }

        if (carts.length === 1) {
            setCarts([createEmptyCart(1)]);
            setActiveCartId(1);
            return;
        }

        const remaining = carts.filter(c => c.id !== cartId);
        setCarts(remaining);
        if (activeCartId === cartId) setActiveCartId(remaining[0].id);
    };

    const updateActiveCart = (updates) => {
        setCarts(carts.map(c => c.id === activeCartId ? { ...c, ...updates } : c));
    };

    // --- Search & Filters ---

    const debouncedPOSSearch = useCallback(
        debounce((term) => {
            if (!term || !term.trim()) {
                setSearchResults([]);
                return;
            }
            const termLower = term.toLowerCase().trim();
            const results = products.filter(p => {
                const desc = (p.description || '').toLowerCase();
                const sku = (p.sku || '').toLowerCase();
                const ref = (p.reference || '').toLowerCase();
                return desc.includes(termLower) || sku.includes(termLower) || ref.includes(termLower);
            });
            setSearchResults(results.slice(0, 100));
        }, 300),
        [products]
    );

    const handleSearchChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        debouncedPOSSearch(term);
    };

    const filteredProducts = useMemo(() => {
        if (searchTerm) return searchResults;
        return products;
    }, [products, searchTerm, searchResults]);

    // --- Calculations ---

    const subtotal = activeCartItems.reduce((sum, item) => sum + ((item.priceUSD || 0) * (item.qty || 0)), 0);
    const iva = documentType === 'factura' ? subtotal * 0.16 : 0;
    const total = subtotal + iva;
    const totalBs = total * (exchangeRate || 0);

    const totalPaid = paymentMethods.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remainingToPay = total - totalPaid;
    const isFullyPaid = totalPaid >= total - 0.01; // Small tolerance

    // Automatic recovery from corrupted state
    useEffect(() => {
        if (Number.isNaN(total) || Number.isNaN(totalBs)) {
            console.warn('⚠️ Detected NaN values in POS. Resetting state...');
            try {
                // Only reset if things are truly broken
                updateActiveCart({ items: [], paymentMethods: [] });
            } catch (e) {
                console.error(e);
            }
        }
    }, [total, totalBs]);

    // --- Cart Management ---

    const addToCart = (product) => {
        const existing = activeCart.items.find(item => item.productId === product.id);
        const isQuote = posMode === 'quote';

        if (existing) {
            const updatedItems = activeCart.items.map(item =>
                item.productId === product.id
                    ? { ...item, qty: isQuote ? item.qty + 1 : Math.min(item.qty + 1, product.quantity) }
                    : item
            );
            updateActiveCart({ items: updatedItems });
        } else {
            const newItem = {
                productId: product.id,
                sku: product.sku,
                reference: product.reference || product.sku,
                description: product.description,
                brand: product.brand || '',
                location: product.location || '',
                priceUSD: product.price || 0,
                qty: 1,
                maxQty: isQuote ? 9999 : product.quantity
            };
            updateActiveCart({ items: [...activeCart.items, newItem] });
        }
    };

    const updateCartItem = (index, field, value) => {
        const updatedItems = activeCart.items.map((item, i) => i === index ? { ...item, [field]: value } : item);
        updateActiveCart({ items: updatedItems });
    };

    const removeFromCart = (index) => {
        const updatedItems = activeCart.items.filter((_, i) => i !== index);
        updateActiveCart({ items: updatedItems });
    };

    // --- Customer Management ---

    const createCustomer = async () => {
        if (!newCustomer.name || !currentCompany?.id) return alert('Nombre requerido');
        try {
            const id = await addCustomer(newCustomer);
            const created = { id, ...newCustomer, companyId: currentCompany.id };
            updateActiveCart({ customer: created, customerType: 'existing', newCustomer: { type: 'V', name: '', rif: '', phone: '', address: '' } });
            alert(`Cliente "${created.name}" creado`);
        } catch (err) {
            console.error(err);
            alert('Error al crear cliente');
        }
    };

    // --- Payment Management ---

    const addPaymentMethod = (method) => {
        const remaining = Math.max(0, remainingToPay);
        const newPayment = {
            method,
            amount: remaining,
            currency: PAYMENT_METHODS[method].currency,
            reference: ''
        };
        updateActiveCart({ paymentMethods: [...paymentMethods, newPayment] });
    };

    const updatePayment = (index, field, value) => {
        const updated = [...paymentMethods];
        updated[index] = { ...updated[index], [field]: value };
        updateActiveCart({ paymentMethods: updated });
    };

    const removePayment = (index) => {
        updateActiveCart({ paymentMethods: paymentMethods.filter((_, i) => i !== index) });
    };

    // --- Finalize Sale ---

    const finalizeSale = async () => {
        if (activeCartItems.length === 0) return;
        // Logic to validate payment if 'contado'
        if (saleType === 'contado' && !isFullyPaid && !posMode === 'quote') {
            alert('El monto pagado debe cubrir el total de la venta.');
            return;
        }

        const isQuote = posMode === 'quote';
        // Date calc
        const today = new Date();
        const dueDate = saleType === 'credito'
            ? new Date(today.getTime() + (creditDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
            : null;

        let expiresAt = null;
        if (isQuote) {
            const midnight = new Date();
            midnight.setHours(23, 59, 59, 999);
            expiresAt = midnight.toISOString();
        }

        // Generate ID
        const todaySales = sales.filter(s => s.date === today.toISOString().split('T')[0]);
        const prefix = isQuote ? 'PR-' : '';
        const newDocNumber = prefix + String(todaySales.length + 1).padStart(6, '0');

        const saleItems = activeCartItems.map(item => ({
            product_id: item.productId,
            sku: item.sku,
            reference: item.reference || '',
            description: item.description,
            quantity: item.qty,
            unit_price: item.priceUSD,
            amount_usd: item.priceUSD * item.qty,
            amount_bs: item.priceUSD * item.qty * exchangeRate,
            date: today.toISOString().split('T')[0],
            payment_type: isQuote ? 'presupuesto' : saleType,
            credit_days: saleType === 'credito' ? creditDays : null,
            due_date: dueDate,
            payment_currency: 'USD',
            exchange_rate: exchangeRate,
            document_type: isQuote ? 'presupuesto' : documentType,
            document_number: newDocNumber,
            has_iva: documentType === 'factura' && !isQuote,
            iva_amount: (documentType === 'factura' && !isQuote) ? (item.priceUSD * item.qty) * 0.16 : 0,
            customer_id: customerType === 'quick' ? null : customer?.id,
            is_quote: isQuote,
            expires_at: expiresAt,
            status: isQuote ? 'pending' : (saleType === 'credito' ? 'pending' : 'paid'),
            payment_status: isQuote ? 'pending' : (saleType === 'credito' ? 'pending' : 'paid'),
            paid_amount: (saleType === 'credito' || isQuote) ? 0 : (item.priceUSD * item.qty),
            remaining_amount: (saleType === 'credito' || isQuote) ? (item.priceUSD * item.qty) : 0
        }));

        try {
            // Add sales and payments
            for (const item of saleItems) {
                // Pass payment methods only for the first item (or handle batch logic on backend, keep simple here)
                // NOTE: `addSale` implementation handles creating cash_transactions if paymentMethods provided
                // We should only pass payment methods once per "Ticket", but currently our DB structure is 1 row per item.
                // Ideally we'd have a Sales Header. For now, we attach payments to the *first* item or handle logic to not dupe.
                // Improving: To avoid duplicate payment entries if calling addSale multiple times, we'll only pass payment info
                // on the first item, OR better, refactor `addSale` to batch.
                // Given constraints, I will pass payments on the FIRST item.
                const isFirst = item === saleItems[0];
                const paymentsToPass = (isFirst && !isQuote && saleType === 'contado') ? paymentMethods : [];

                await addSale(item, paymentsToPass);
            }

            // Success State
            setCompletedSale({
                items: activeCartItems,
                customer: customerType === 'quick' ? null : customer,
                documentType: isQuote ? 'presupuesto' : documentType,
                paymentType: isQuote ? 'presupuesto' : saleType,
                creditDays: saleType === 'credito' ? creditDays : null,
                dueDate,
                subtotal,
                iva,
                total,
                totalBs,
                exchangeRate,
                date: today.toISOString(),
                isQuote,
                expiresAt,
                documentNumber: newDocNumber
            });
            setDocumentNumber(newDocNumber);
            updateActiveCart({ step: 5 }); // Success screen

        } catch (error) {
            console.error('Finalize Sale Error:', error);
            alert('Error al finalizar la venta');
        }
    };

    const startNewSale = () => {
        setCompletedSale(null);
        closeCart(activeCartId);
    };

    // --- Render Helpers ---

    const WizardStep = ({ id, label, icon: Icon }) => {
        const isActive = step === id;
        const isCompleted = step > id;
        return (
            <div
                onClick={() => id < step && updateActiveCart({ step: id })} // Can go back
                style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: isActive ? 'var(--primary)' : isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    cursor: id < step ? 'pointer' : 'default',
                    color: isActive ? 'white' : isCompleted ? 'var(--success)' : 'var(--text-secondary)',
                    border: `1px solid ${isActive ? 'var(--primary)' : isCompleted ? 'var(--success)' : 'var(--border-color)'}`,
                    transition: 'all 0.2s'
                }}
            >
                <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: isActive ? 'white' : isCompleted ? 'var(--success)' : 'var(--bg-secondary)',
                    color: isActive ? 'var(--primary)' : isCompleted ? 'white' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold'
                }}>
                    {isCompleted ? <CheckCircle size={14} /> : id}
                </div>
                <span style={{ fontWeight: isActive ? '600' : '400', display: 'none', '@media (min-width: 768px)': { display: 'block' } }}>{label}</span>
                <span className="hidden md:inline">{label}</span>
            </div>
        );
    };

    return (
        <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* TOP BAR: Title | Multicart | Rates */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                {/* 1. Title & Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2rem', margin: 0 }}>
                        <ShoppingCart size={32} /> Punto de Venta
                    </h1>

                    {/* Action Toolbar (Venta/Presupuesto/Daily) */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setPosMode('sale')}
                            style={{
                                padding: '0.35rem 0.85rem', borderRadius: '20px',
                                border: 'none',
                                background: posMode === 'sale' ? '#cbd5e1' : 'transparent',
                                color: posMode === 'sale' ? '#ea580c' : 'var(--text-secondary)',
                                cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                transition: 'all 0.2s',
                                boxShadow: posMode === 'sale' ? 'inset 0 2px 4px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            <span style={{ fontSize: '1rem' }}>🔥</span> Venta
                        </button>
                        <button
                            onClick={() => setPosMode('quote')}
                            style={{
                                padding: '0.35rem 0.85rem', borderRadius: '20px',
                                border: 'none',
                                background: posMode === 'quote' ? '#cbd5e1' : 'transparent',
                                color: posMode === 'quote' ? '#ea580c' : 'var(--text-secondary)',
                                cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                transition: 'all 0.2s',
                                boxShadow: posMode === 'quote' ? 'inset 0 2px 4px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            <FileCheck size={14} className={posMode === 'quote' ? 'text-orange-600' : 'text-slate-500'} /> Presupuesto
                        </button>
                        <button
                            onClick={() => setShowSalesModal(true)}
                            style={{
                                padding: '0.35rem 0.85rem', borderRadius: '20px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                                display: 'flex', alignItems: 'center', gap: '0.4rem'
                            }}
                        >
                            <List size={14} /> Ventas del Día
                        </button>
                    </div>
                </div>

                {/* 2. Multi-Cart Tabs (Center) */}
                <div style={{ background: '#94a3b8', padding: '0.35rem 1rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '1.5rem', minWidth: '300px', justifyContent: 'center' }}>
                    {carts.map(c => (
                        <div
                            key={c.id}
                            onClick={() => switchCart(c.id)}
                            style={{
                                cursor: 'pointer',
                                color: activeCartId === c.id ? 'white' : 'rgba(255,255,255,0.7)',
                                fontWeight: activeCartId === c.id ? 'bold' : 'normal',
                                display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem',
                            }}
                        >
                            <ShoppingCart size={16} /> Carrito {c.id}
                            {activeCartId === c.id && (
                                <span style={{ background: 'rgba(255,255,255,0.3)', color: 'white', fontSize: '0.75rem', padding: '1px 6px', borderRadius: '10px', minWidth: '20px', textAlign: 'center' }}>
                                    {c.items.length}
                                </span>
                            )}
                            {carts.length > 1 && (
                                <X size={12} onClick={(e) => { e.stopPropagation(); closeCart(c.id); }} style={{ opacity: 0.6, cursor: 'pointer' }} />
                            )}
                        </div>
                    ))}
                    {carts.length < 5 && (
                        <button
                            onClick={addNewCart}
                            style={{
                                border: '1px solid #94a3b8', background: '#e2e8f0',
                                color: '#475569', borderRadius: '20px', padding: '0.3rem 1rem',
                                cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem',
                                fontWeight: '600'
                            }}
                        >
                            <Plus size={14} /> Nuevo Carrito
                        </button>
                    )}
                </div>

                {/* 3. Rates (Right) */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div
                            onClick={() => setSelectedRateType('bcv')}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '12px',
                                border: '2px solid ' + (selectedRateType === 'bcv' ? '#22c55e' : 'transparent'),
                                background: '#dcfce7', // light green
                                cursor: 'pointer', minWidth: '100px'
                            }}
                        >
                            <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: '800', letterSpacing: '0.5px' }}>BCV</div>
                            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#166534' }}>{(bcvRate || 0).toFixed(2)} <span style={{ fontSize: '0.7rem' }}>Bs/$</span></div>
                        </div>
                        <div
                            onClick={() => setSelectedRateType('binance')}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '12px',
                                border: '2px solid ' + (selectedRateType === 'binance' ? '#eab308' : 'transparent'),
                                background: '#fef9c3', // light yellow
                                cursor: 'pointer', minWidth: '100px'
                            }}
                        >
                            <div style={{ fontSize: '0.7rem', color: '#a16207', fontWeight: '800', letterSpacing: '0.5px' }}>BINANCE</div>
                            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#854d0e' }}>{(binanceRate || 0).toFixed(2)} <span style={{ fontSize: '0.7rem' }}>Bs/$</span></div>
                        </div>
                    </div>
                    <button onClick={refreshRates} className="btn-icon" style={{ background: 'white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                        <RefreshCw size={18} className={loadingRates ? 'spinning' : ''} />
                    </button>
                </div>

            </div>

            {/* DAILY STATS BAR */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {/* Pending */}
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--warning)', marginBottom: '0.25rem' }}>⏳ ENVIADO A CAJA</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{dailyStats.pendingCount} pendientes</div>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>${dailyStats.pendingUSD.toFixed(2)}</div>
                </div>

                {/* Processed */}
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--success)', marginBottom: '0.25rem' }}>✅ COBRADO</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{dailyStats.processedCount} procesadas</div>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>${dailyStats.processedUSD.toFixed(2)}</div>
                </div>

                {/* Total */}
                <div style={{ background: 'white', border: '1px solid var(--border-color)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>TOTAL GENERADO</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total del día</div>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>${dailyStats.totalUSD.toFixed(2)}</div>
                </div>
            </div>

            {/* NAVIGATION BAR (Tab Style) */}
            <div style={{ display: 'flex', gap: '1rem', background: 'transparent' }}>
                {[
                    { id: 1, label: 'Productos', icon: Package },
                    { id: 2, label: 'Cliente', icon: User },
                    { id: 3, label: 'Tipo Venta', icon: Receipt },
                    { id: 4, label: 'Documento', icon: FileCheck }, // Split Document/Tipo logic slightly in nav? Or just labels
                    { id: 5, label: 'Listo', icon: CheckCircle }
                ].map((s) => {
                    // Hide "Documento" or merge steps if needed, but per image there are 5 tabs: Products, Client, SalesType, Doc, Ready
                    // My internal logic has: 1: Prod, 2: Client, 3: Type(Contado/Credito + DocType), 4: Payment, 5: Success
                    // I will align the tabs to my internal state for now.
                    // Step 3 in my code handles both SaleType and DocType. 
                    // Step 4 is Payment. 
                    // Let's Map: 1->Productos, 2->Cliente, 3->Tipo Venta, 4->Documento/Pago? 
                    // The user image labels: Productos, Cliente, Tipo Venta, Documento, Listo.
                    // I'll adjust the mapped labels to my steps.
                    // My Step 4 is Payment. I'll label it "Pago" or align with "Documento" if that makes sense?
                    // Let's stick to my steps for functionality: 1:Prod, 2:Cust, 3:Type, 4:Pay, 5:Done.
                    let label = s.label;
                    if (s.id === 3) label = 'Tipo Venta';
                    if (s.id === 4) label = 'Pago'; // Renaming Documento to Pago to match logic, or changing logic. 
                    // Wait, image says "Documento". Maybe they want Document details there?
                    // I'll stick to functional "Pago" for step 4 label for now, or "Facturación".

                    // ACTUALLY, I will strictly follow image visual but map to functionality.
                    // Image: 5 tabs.
                    // My steps: 1, 2, 3, 4, 5. Perfect match.
                    // Label 4: "Documento" in image. I will call it "Pago" in logic but display "Documento"? 
                    // No, "Pago" is crucial. The image might be a different flow.
                    // I will label Step 4 "Pago / Documento" or just "Pago". 
                    // Let's use the image labels but mapped to my steps.
                    const labels = { 1: 'Productos', 2: 'Cliente', 3: 'Tipo Venta', 4: 'Documento', 5: 'Listo' };
                    const isActive = step === s.id;
                    return (
                        <div
                            key={s.id}
                            onClick={() => s.id < step && updateActiveCart({ step: s.id })}
                            style={{
                                flex: 1,
                                background: isActive ? 'var(--primary)' : 'white',
                                color: isActive ? 'white' : 'var(--text-secondary)',
                                padding: '1rem',
                                borderRadius: 'var(--radius-lg)',
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                boxShadow: 'var(--shadow-sm)',
                                cursor: s.id < step ? 'pointer' : 'default',
                                opacity: s.id > step && !isActive ? 0.7 : 1,
                                transition: 'all 0.2s',
                                border: isActive ? 'none' : '1px solid transparent'
                            }}
                        >
                            <div style={{
                                background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)',
                                borderRadius: '50%', width: '28px', height: '28px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: isActive ? 'white' : 'var(--text-secondary)'
                            }}>
                                <s.icon size={16} />
                            </div>
                            <span style={{ fontWeight: isActive ? '700' : '500', fontSize: '1rem' }}>{labels[s.id]}</span>
                        </div>
                    );
                })}
            </div>



            {/* Content Area */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: step === 1 ? '1fr 400px' : '1fr', gap: '1.5rem', minHeight: 0, overflow: 'hidden' }}>

                {/* STEP 1: PRODUCTS */}
                {step === 1 && (
                    <>
                        {/* Product List */}
                        {/* Product Search & Result Dropdown */}
                        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', background: 'white', border: 'none', boxShadow: 'var(--shadow-sm)', overflow: 'visible', zIndex: 50 }}>
                            <div style={{ padding: '1.5rem', position: 'relative' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        placeholder="🔍 Buscar producto por Código, Nombre o Referencia..."
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                        autoFocus
                                        style={{
                                            width: '100%',
                                            padding: '1rem 1rem 1rem 3rem',
                                            borderRadius: '12px',
                                            border: '2px solid #e2e8f0',
                                            background: '#f8fafc',
                                            color: 'var(--text-primary)',
                                            boxShadow: 'none',
                                            fontSize: '1rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => { setSearchTerm(''); setSearchResults([]); }}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>

                                {/* Dropdown Results */}
                                {searchTerm.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%', left: '1.5rem', right: '1.5rem',
                                        background: 'white',
                                        borderRadius: '0 0 12px 12px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                        border: '1px solid #e2e8f0',
                                        borderTop: 'none',
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        zIndex: 100
                                    }}>
                                        {filteredProducts.length === 0 ? (
                                            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                                                <Package size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                                <div>No se encontraron productos</div>
                                            </div>
                                        ) : (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.8rem', textAlign: 'left' }}>
                                                        <th style={{ padding: '0.75rem 1rem' }}>Descripción</th>
                                                        <th style={{ padding: '0.75rem 1rem' }}>SKU / Ref</th>
                                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Precio</th>
                                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Stock</th>
                                                        <th style={{ padding: '0.75rem 1rem' }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredProducts.map(p => (
                                                        <tr
                                                            key={p.id}
                                                            onClick={() => {
                                                                addToCart(p);
                                                                // Search remains open
                                                            }}
                                                            style={{
                                                                borderBottom: '1px solid #f1f5f9',
                                                                cursor: 'pointer',
                                                                transition: 'background 0.1s'
                                                            }}
                                                            className="hover:bg-slate-50"
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                                        >
                                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#1e293b' }}>
                                                                {p.description}
                                                                {p.brand && <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '500' }}>{p.brand}</div>}
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
                                                                <div>{p.sku}</div>
                                                                {p.reference && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ref: {p.reference}</div>}
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                                                                ${(p.price || 0).toFixed(2)}
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                                <span className={`badge ${p.quantity > 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                                                                    {p.quantity}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                                                <button className="btn-sm btn-primary" style={{ borderRadius: '20px', padding: '0.2rem 0.8rem' }}>
                                                                    <Plus size={14} /> Agregar
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Empty State / Initial View */}
                            {searchTerm.length === 0 && (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', opacity: 0.6 }}>
                                    <div style={{ background: '#f1f5f9', padding: '2rem', borderRadius: '50%', marginBottom: '1rem' }}>
                                        <Search size={48} />
                                    </div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '0.5rem' }}>Buscador de Productos</h3>
                                    <p style={{ maxWidth: '300px', textAlign: 'center', fontSize: '0.9rem' }}>Escriba el nombre, código o referencia del producto para buscar y agregar al carrito.</p>
                                </div>
                            )}
                        </div>

                        {/* Cart */}
                        {/* Cart Panel */}
                        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                            <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <ShoppingCart size={20} /> Carrito ({activeCartItems.length})
                                </h3>
                                <button onClick={() => updateActiveCart({ items: [] })} style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '8px' }} title="Vaciar Carrito"><Trash2 size={16} /></button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
                                {activeCartItems.map((item, idx) => (
                                    <div key={idx} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                                            <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#334155', lineHeight: '1.4' }}>{item.description}</span>
                                            <button onClick={() => removeFromCart(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0', marginLeft: '0.5rem' }}><Trash2 size={14} /></button>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            {/* Price Details */}
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column' }}>
                                                <span>P/U: <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>${(item.priceUSD || 0).toFixed(2)}</span> | Bs {((item.priceUSD || 0) * exchangeRate).toFixed(2)}</span>
                                            </div>

                                            {/* Qty Controls */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => updateCartItem(idx, 'qty', Math.max(1, item.qty - 1))}
                                                    style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={item.qty}
                                                    onChange={(e) => updateCartItem(idx, 'qty', parseInt(e.target.value) || 1)}
                                                    style={{ width: '40px', textAlign: 'center', border: 'none', fontWeight: 'bold', fontSize: '0.9rem', padding: '0', background: 'transparent' }}
                                                />
                                                <button
                                                    onClick={() => updateCartItem(idx, 'qty', item.qty + 1)}
                                                    style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>

                                            {/* Subtotal */}
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 'bold', color: 'var(--success)', fontSize: '0.95rem' }}>${((item.priceUSD || 0) * item.qty).toFixed(2)}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Bs {((item.priceUSD || 0) * item.qty * exchangeRate).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {activeCartItems.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                        <ShoppingCart size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                        <div>Carrito vacío</div>
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '1.25rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem', color: '#64748b' }}>
                                    <span>Subtotal:</span>
                                    <span>${(subtotal || 0).toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>
                                    <span>Total:</span>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: 'var(--success)' }}>${(total || 0).toFixed(2)}</div>
                                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Bs {(totalBs || 0).toFixed(2)}</div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => updateActiveCart({ step: 2 })}
                                    disabled={activeCartItems.length === 0}
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: '600', borderRadius: '12px' }}
                                >
                                    Siguiente <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* STEP 2: CUSTOMER */}
                {step === 2 && (
                    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', width: '100%', alignSelf: 'start' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Seleccionar Cliente</h2>

                        {/* Selected Customer Card */}
                        <div style={{ padding: '1rem', border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.1)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{customerType === 'quick' ? 'Venta Rápida' : customer?.name || 'Nuevo Cliente'}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{customerType === 'quick' ? 'Sin registro fiscal' : customer?.rif || 'N/A'}</div>
                                </div>
                            </div>
                            {customerType !== 'quick' && <button onClick={() => updateActiveCart({ customerType: 'quick', customer: null })} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>}
                        </div>

                        {/* Search Customers */}
                        <div style={{ marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                onChange={(e) => {
                                    // Simple filter logic could go here or existing search
                                }}
                            />
                        </div>

                        <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                            {customers.slice(0, 5).map(c => (
                                <div key={c.id} onClick={() => updateActiveCart({ customer: c, customerType: 'existing' })} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{c.name}</span>
                                    <span style={{ color: 'var(--text-secondary)' }}>{c.rif}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                            <button onClick={() => updateActiveCart({ step: 1 })} className="btn btn-secondary" style={{ flex: 1 }}>Atrás</button>
                            <button onClick={() => updateActiveCart({ step: 3 })} className="btn btn-primary" style={{ flex: 1 }}>Continuar</button>
                        </div>
                    </div>
                )}

                {/* STEP 3: TYPE */}
                {step === 3 && (
                    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', width: '100%', alignSelf: 'start' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Detalles de Venta</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <button
                                onClick={() => updateActiveCart({ saleType: 'contado' })}
                                className={`btn ${saleType === 'contado' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', height: 'auto' }}
                            >
                                <DollarSign size={32} /> Contado
                            </button>
                            <button
                                onClick={() => updateActiveCart({ saleType: 'credito' })}
                                className={`btn ${saleType === 'credito' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', height: 'auto' }}
                            >
                                <Receipt size={32} /> Crédito
                            </button>
                        </div>

                        {saleType === 'credito' && (
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', borderRadius: 'var(--radius-md)' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#eab308', fontWeight: 'bold' }}>Días de Crédito</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {[7, 15, 30].map(d => (
                                        <button key={d} onClick={() => updateActiveCart({ creditDays: d })} className={`btn ${creditDays === d ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>{d} días</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Documento</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => updateActiveCart({ documentType: 'pedido' })} className={`btn ${documentType === 'pedido' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>Pedido</button>
                                <button onClick={() => updateActiveCart({ documentType: 'factura' })} className={`btn ${documentType === 'factura' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>Factura</button>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                            <button onClick={() => updateActiveCart({ step: 2 })} className="btn btn-secondary" style={{ flex: 1 }}>Atrás</button>
                            <button
                                onClick={() => {
                                    if (saleType === 'contado' && !posMode === 'quote') {
                                        updateActiveCart({ step: 4 });
                                    } else {
                                        finalizeSale();
                                    }
                                }}
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                            >
                                {saleType === 'contado' ? 'Ir a Pagar' : 'Finalizar'}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: PAYMENT (New!) */}
                {step === 4 && (
                    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%', alignSelf: 'start', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>

                        {/* Left: Methods */}
                        <div>
                            <h2 style={{ marginBottom: '1.5rem' }}>Métodos de Pago</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                {Object.entries(PAYMENT_METHODS).map(([key, info]) => (
                                    <button
                                        key={key}
                                        onClick={() => addPaymentMethod(key)}
                                        className="btn btn-secondary"
                                        style={{ justifyContent: 'flex-start', padding: '1rem' }}
                                    >
                                        <info.icon size={18} /> {info.label}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {paymentMethods.map((p, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                                        <div style={{ width: '150px' }}>{PAYMENT_METHODS[p.method].label}</div>
                                        <input
                                            type="number"
                                            value={p.amount}
                                            onChange={(e) => updatePayment(idx, 'amount', parseFloat(e.target.value))}
                                            placeholder="Monto"
                                            className="form-input"
                                            style={{ flex: 1 }}
                                        />
                                        {PAYMENT_METHODS[p.method].requiresRef && (
                                            <input
                                                type="text"
                                                value={p.reference}
                                                onChange={(e) => updatePayment(idx, 'reference', e.target.value)}
                                                placeholder="Ref"
                                                className="form-input"
                                                style={{ flex: 1 }}
                                            />
                                        )}
                                        <button onClick={() => removePayment(idx)} className="btn-icon-sm" style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Summary */}
                        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', height: 'fit-content' }}>
                            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Resumen de Pago</h3>
                            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Total a Pagar</span>
                                <span style={{ fontWeight: 'bold' }}>${(total || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                                <span>Pagado</span>
                                <span>${(totalPaid || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', color: remainingToPay > 0.01 ? 'var(--danger)' : 'var(--success)' }}>
                                <span>{remainingToPay > 0.01 ? 'Restante' : 'Cambio/Completado'}</span>
                                <span>${Math.abs(remainingToPay || 0).toFixed(2)}</span>
                            </div>

                            <button
                                onClick={finalizeSale}
                                disabled={!isFullyPaid}
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: '2rem', padding: '1rem', fontSize: '1.1rem' }}
                            >
                                <CheckCircle size={20} /> Confirmar Pago
                            </button>
                            <button onClick={() => updateActiveCart({ step: 3 })} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
                                Atrás
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 5: SUCCESS */}
                {step === 5 && completedSale && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px' }}>
                            <div style={{ width: '80px', height: '80px', background: 'var(--success)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                                <CheckCircle size={40} />
                            </div>
                            <h2 style={{ marginBottom: '0.5rem' }}>¡Venta Completada!</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Documento #{completedSale.documentNumber} generado exitosamente.</p>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button onClick={() => window.print()} className="btn btn-secondary">
                                    <Printer size={18} /> Imprimir Ticket
                                </button>
                                <button onClick={startNewSale} className="btn btn-primary">
                                    <Plus size={18} /> Nueva Venta
                                </button>
                            </div>
                        </div>
                        {/* Hidden Invoice for Printing */}
                        <div style={{ display: 'none' }}>
                            <InvoiceDocument sale={completedSale} documentNumber={completedSale.documentNumber} />
                        </div>
                    </div>
                )}
            </div>

            <DailySalesModal isOpen={showSalesModal} onClose={() => setShowSalesModal(false)} sales={sales} products={products} />
        </div>
    );
};

export default POS;
