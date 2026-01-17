import React, { useState } from 'react';
import { PackageCheck, Plus, Trash2, DollarSign, CreditCard, ArrowRightLeft } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';

const Sales = () => {
    const { products, sales, addSale, deleteSale } = useInventoryContext();

    // Exchange rate state - Manual input only
    const [exchangeRate, setExchangeRate] = useState(0);

    // Cart state
    const [cart, setCart] = useState([]);
    const [paymentType, setPaymentType] = useState('cash'); // 'cash' or 'credit'
    const [paymentCurrency, setPaymentCurrency] = useState('USD'); // 'USD', 'Bs', or 'Combinado'
    const [customUSD, setCustomUSD] = useState(0);
    const [customBs, setCustomBs] = useState(0);

    // Form state
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [priceUSD, setPriceUSD] = useState(0);

    const filteredProducts = products.filter(p =>
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.reference.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
            reference: selectedProduct.reference,
            description: selectedProduct.description,
            brand: selectedProduct.brand,
            quantity: parseInt(quantity),
            amountUSD: totalUSD,
            amountBs: totalBs
        };

        setCart([...cart, cartItem]);
        setSelectedProduct(null);
        setSearchTerm('');
        setQuantity(1);
        setPriceUSD(0);
    };

    const removeFromCart = (index) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const finalizeSale = () => {
        if (cart.length === 0) {
            alert('El carrito está vacío');
            return;
        }

        if (exchangeRate <= 0) {
            alert('Por favor ingresa la tasa de cambio');
            return;
        }

        const saleItems = cart.map(item => {
            let finalAmountUSD = item.amountUSD;
            let finalAmountBs = item.amountBs;

            // For combined payment, use custom amounts
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

        addSale(saleItems);

        // Reset form
        setCart([]);
        setSaleDate(new Date().toISOString().split('T')[0]);
        setCustomUSD(0);
        setCustomBs(0);
        alert(`Venta/Egreso registrado exitosamente`);
    };

    const totalUSD = cart.reduce((sum, item) => sum + item.amountUSD, 0);
    const totalBs = cart.reduce((sum, item) => sum + item.amountBs, 0);

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
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="number"
                            step="0.01"
                            value={exchangeRate}
                            onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
                            placeholder="Tasa Bs/$"
                            style={{ width: '150px', textAlign: 'right', fontSize: '1.2rem', fontWeight: 'bold' }}
                        />
                        <span style={{ fontSize: '1.2rem' }}>Bs/$</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>

                {/* Sale Form */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Nuevo Registro</h3>

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
                                            setPriceUSD(product.price);
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
                                            SKU: {product.sku} | Stock: {product.quantity} | ${product.price}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Product Details */}
                    {selectedProduct && (
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: 'var(--radius-md)' }}>
                            <h4 style={{ marginBottom: '0.5rem' }}>Producto Seleccionado</h4>
                            <div style={{ fontSize: '0.875rem' }}>
                                <p><strong>SKU:</strong> {selectedProduct.sku}</p>
                                <p><strong>Referencia:</strong> {selectedProduct.reference}</p>
                                <p><strong>Marca:</strong> {selectedProduct.brand}</p>
                                <p><strong>Stock Disponible:</strong> {selectedProduct.quantity}</p>
                            </div>
                        </div>
                    )}

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
                    <h3 style={{ marginBottom: '1.5rem' }}>Carrito</h3>

                    {cart.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                            El carrito está vacío
                        </p>
                    ) : (
                        <>
                            <div style={{ marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                {cart.map((item, index) => (
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
                                            <div>Cant: {item.quantity} | ${item.amountUSD}</div>
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
                                            setCustomUSD(totalUSD);
                                            setCustomBs(totalBs);
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
                                                        // Auto-calculate remaining in Bs
                                                        const usdInBs = usdValue * exchangeRate;
                                                        const remaining = totalBs - usdInBs;
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
                                        {customUSD > 0 && exchangeRate > 0 && (
                                            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(var(--info-rgb), 0.1)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                                                <div>USD en Bs: ${customUSD.toFixed(2)} × {exchangeRate} = Bs. {(customUSD * exchangeRate).toFixed(2)}</div>
                                                <div style={{ fontWeight: '500', marginTop: '0.25rem' }}>Restante en Bs: Bs. {customBs.toFixed(2)}</div>
                                            </div>
                                        )}
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
                                        <div>Total: ${totalUSD.toFixed(2)} USD</div>
                                    ) : paymentCurrency === 'Bs' ? (
                                        <div>Total: Bs. {totalBs.toFixed(2)}</div>
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
                        </>
                    )}
                </div>
            </div>

            {/* Sales History */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
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

                {/* Cart Summary */ }
    <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Carrito</h3>

        {cart.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                El carrito está vacío
            </p>
        ) : (
            <>
                <div style={{ marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {cart.map((item, index) => (
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
                                <div>Cant: {item.quantity} | ${item.amountUSD}</div>
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
                                setCustomUSD(totalUSD);
                                setCustomBs(totalBs);
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
                                            // Auto-calculate remaining in Bs
                                            const usdInBs = usdValue * exchangeRate;
                                            const remaining = totalBs - usdInBs;
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
                            {customUSD > 0 && exchangeRate > 0 && (
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(var(--info-rgb), 0.1)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                                    <div>USD en Bs: ${customUSD.toFixed(2)} × {exchangeRate} = Bs. {(customUSD * exchangeRate).toFixed(2)}</div>
                                    <div style={{ fontWeight: '500', marginTop: '0.25rem' }}>Restante en Bs: Bs. {customBs.toFixed(2)}</div>
                                </div>
                            )}
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
                            <div>Total: ${totalUSD.toFixed(2)} USD</div>
                        ) : paymentCurrency === 'Bs' ? (
                            <div>Total: Bs. {totalBs.toFixed(2)}</div>
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
            </>
        )}
    </div>
            </div >

    {/* Sales History */ }
    < div className = "glass-panel" style = {{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Historial de Ventas y Egresos</h3>

{
    sales.length === 0 ? (
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
                {sales.slice(0, 50).map(sale => (
                    <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem' }}>{new Date(sale.date).toLocaleDateString('es-VE')}</td>
                        <td style={{ padding: '0.75rem' }}>{sale.description}</td>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{sale.sku}</td>
                        <td style={{ padding: '0.75rem' }}>{sale.quantity}</td>
                        <td style={{ padding: '0.75rem' }}>
                            <span className={`badge ${sale.paymentType === 'cash' ? 'badge-success' : 'badge-warning'}`}>
                                {sale.paymentType === 'cash' ? 'Contado' : 'Crédito'}
                            </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            {sale.paymentCurrency === 'USD' || sale.paymentCurrency === 'Combinado' ? `$${sale.amountUSD.toFixed(2)}` : '—'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            {sale.paymentCurrency === 'Bs' || sale.paymentCurrency === 'Combinado' ? `Bs. ${sale.amountBs.toFixed(2)}` : '—'}
                        </td>
                    </tr>
                ))}
            </tbody>
            <tfoot style={{ borderTop: '2px solid var(--border-color)', fontWeight: 'bold' }}>
                <tr>
                    <td colSpan="5" style={{ padding: '0.75rem', textAlign: 'right' }}>TOTALES:</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        ${sales.reduce((sum, sale) => {
                            if (sale.paymentCurrency === 'USD' || sale.paymentCurrency === 'Combinado') {
                                return sum + (sale.amountUSD || 0);
                            }
                            return sum;
                        }, 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        Bs. {sales.reduce((sum, sale) => {
                            if (sale.paymentCurrency === 'Bs' || sale.paymentCurrency === 'Combinado') {
                                return sum + (sale.amountBs || 0);
                            }
                            return sum;
                        }, 0).toFixed(2)}
                    </td>
                </tr>
            </tfoot>
        </table>
    </div>
)
}
            </div >
        </div >
    );
};

export default Sales;
