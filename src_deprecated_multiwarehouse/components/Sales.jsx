import React, { useState } from 'react';
import { PackageCheck, Plus, Trash2, DollarSign, CreditCard, ArrowRightLeft, FileText } from 'lucide-react';
import { getFirestore, deleteDoc, doc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useInventoryContext } from '../context/InventoryContext';

const Sales = () => {
    const { products, sales, warehouses, addSale } = useInventoryContext();

    // Exchange rate state - Manual input only
    const [exchangeRate, setExchangeRate] = useState('');

    // Cart state
    const [cart, setCart] = useState([]);
    const [paymentType, setPaymentType] = useState('cash'); // 'cash' or 'credit'
    const [paymentCurrency, setPaymentCurrency] = useState('USD'); // 'USD', 'Bs', or 'Combinado'
    const [customUSD, setCustomUSD] = useState(0);
    const [customBs, setCustomBs] = useState(0);

    // Form state
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
    const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState(''); // NEW: Warehouse selector
    const [quantity, setQuantity] = useState(1);
    const [priceUSD, setPriceUSD] = useState(0);

    const filteredProducts = products.filter(p => {
        if (!searchTerm) return false;
        const term = searchTerm.toLowerCase();
        const reference = (p.reference || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();

        // Priorizar búsqueda por referencia y descripción
        return reference.includes(term) || description.includes(term) || sku.includes(term);
    }).slice(0, 5); // Limit to 5 results

    const addToCart = () => {
        if (!selectedProduct || quantity <= 0 || priceUSD <= 0) {
            alert('Por favor completa todos los campos');
            return;
        }

        if (!selectedWarehouseId) {
            alert('Por favor selecciona un almacén');
            return;
        }

        const rate = parseFloat(exchangeRate) || 0;
        if (rate <= 0) {
            alert('Por favor ingresa la tasa de cambio');
            return;
        }

        // Check stock in selected warehouse
        const warehouseStock = selectedProduct.stockByWarehouse?.[selectedWarehouseId] || 0;
        if (quantity > warehouseStock) {
            alert(`Stock insuficiente en el almacén seleccionado. Disponible: ${warehouseStock}`);
            return;
        }

        const totalUSD = parseFloat(priceUSD) * parseInt(quantity);
        const totalBs = totalUSD * rate;

        const cartItem = {
            productId: selectedProduct.id,
            sku: selectedProduct.sku,
            reference: selectedProduct.reference,
            description: selectedProduct.description,
            brand: selectedProduct.brand,
            location: selectedProduct.location,
            warehouseId: selectedWarehouseId, // NEW: Include warehouse
            quantity: parseInt(quantity),
            unitPriceUSD: parseFloat(priceUSD),
            amountUSD: totalUSD,
            amountBs: totalBs
        };

        setCart([...cart, cartItem]);
        setSelectedProduct(null);
        setSearchTerm('');
        setSelectedWarehouseId(''); // Reset warehouse
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

        const rate = parseFloat(exchangeRate) || 0;
        if (rate <= 0) {
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
                exchangeRate: rate
            };
        });

        addSale(saleItems);

        // Reset form
        setCart([]);
        setSaleDate(new Date().toISOString().split('T')[0]);
        setCustomUSD(0);
        setCustomBs(0);
        setCustomBs(0);
        alert(`Venta/Egreso registrado exitosamente`);
    };

    const generatePDF = async () => {
        const doc = new jsPDF();
        const reportDate = new Date(historyDate).toLocaleDateString('es-VE', { timeZone: 'UTC' });

        // Filter sales for selected date
        const dailySales = sales.filter(sale => sale.date.startsWith(historyDate));

        if (dailySales.length === 0) {
            alert('No hay ventas registradas para la fecha seleccionada.');
            return;
        }

        // Title
        doc.setFontSize(18);
        doc.text(`Reporte de Ventas y Egresos - ${reportDate}`, 14, 22);

        // Table Data
        const tableColumn = ["Fecha", "Producto", "Ref", "SKU", "Cant.", "Tipo", "USD", "Bolívares"];
        const tableRows = [];

        dailySales.forEach(sale => {
            const saleData = [
                new Date(sale.date).toLocaleDateString('es-VE'),
                sale.description,
                sale.reference || '-',
                sale.sku,
                sale.quantity,
                sale.paymentType === 'cash' ? 'Contado' : 'Crédito',
                (sale.paymentCurrency === 'USD' || sale.paymentCurrency === 'Combinado') ? `$${sale.amountUSD.toFixed(2)}` : '-',
                (sale.paymentCurrency === 'Bs' || sale.paymentCurrency === 'Combinado') ? `Bs. ${sale.amountBs.toFixed(2)}` : '-'
            ];
            tableRows.push(saleData);
        });

        // Calculate Totals (Cash Only)
        const totalUSD = dailySales.reduce((sum, sale) => {
            if (sale.paymentCurrency === 'USD' || sale.paymentCurrency === 'Combinado') {
                const amount = sale.amountUSD || 0;
                return sale.paymentType === 'credit' ? sum : sum + amount;
            }
            return sum;
        }, 0);

        const totalBs = dailySales.reduce((sum, sale) => {
            if (sale.paymentCurrency === 'Bs' || sale.paymentCurrency === 'Combinado') {
                const amount = sale.amountBs || 0;
                return sale.paymentType === 'credit' ? sum : sum + amount;
            }
            return sum;
        }, 0);

        // Add Totals Row
        tableRows.push([
            "", "", "", "", "",
            { content: "TOTALES (Solo Efectivo):", styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `$${totalUSD.toFixed(2)}`, styles: { fontStyle: 'bold' } },
            { content: `Bs. ${totalBs.toFixed(2)}`, styles: { fontStyle: 'bold' } }
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
                4: { cellWidth: 10 }, // Cant
                6: { halign: 'right' }, // USD
                7: { halign: 'right' }  // Bs
            }
        });

        // Save PDF
        doc.save(`reporte_ventas_${historyDate}.pdf`);

        setHistoryDate('');
    };

    const totalUSD = cart.reduce((sum, item) => sum + item.amountUSD, 0);
    const totalBs = cart.reduce((sum, item) => sum + item.amountBs, 0);

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowRightLeft size={28} />
                    Ventas / Egresos
                </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                {/* New Sale Form */}
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
                                <option value="cash">Contado</option>
                                <option value="credit">Crédito</option>
                            </select>
                        </div>
                    </div>

                    {/* Exchange Rate */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tasa de Cambio del Día</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={exchangeRate}
                            onChange={(e) => {
                                // Replace comma with dot and allow only valid decimal numbers
                                const val = e.target.value.replace(',', '.');
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                    setExchangeRate(val);
                                }
                            }}
                            placeholder="Ej: 40.50"
                        />
                    </div>

                    {/* Product Search */}
                    <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Buscar Producto</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por descripción, SKU o referencia..."
                        />
                        {searchTerm && filteredProducts.length > 0 && (
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
                                        onClick={() => {
                                            setSelectedProduct(product);
                                            setSearchTerm('');
                                        }}
                                        style={{
                                            padding: '0.75rem',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid var(--border-color)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
                                                {product.reference || 'Sin Ref.'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', background: (product.totalQuantity || 0) > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', borderRadius: '4px' }}>
                                                Total: {product.totalQuantity || 0}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{product.description}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                                            📦 Por almacén: {warehouses.filter(w => w.active !== false).map(w =>
                                                `${w.name}: ${product.stockByWarehouse?.[w.id] || 0}`
                                            ).join(' | ')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedProduct && (
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(var(--primary-rgb), 0.05)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>{selectedProduct.description}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                <div>SKU: {selectedProduct.sku}</div>
                                <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>Stock por Almacén:</div>
                                {warehouses.filter(w => w.active !== false).map(w => (
                                    <div key={w.id} style={{ marginLeft: '1rem', fontSize: '0.8rem' }}>
                                        • {w.name}: <span style={{ fontWeight: 'bold', color: (selectedProduct.stockByWarehouse?.[w.id] || 0) > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                            {selectedProduct.stockByWarehouse?.[w.id] || 0}
                                        </span>
                                    </div>
                                ))}
                                {selectedProduct.location && (
                                    <div style={{ marginTop: '0.25rem', color: 'var(--primary)' }}>
                                        📍 Ubicación: {selectedProduct.location}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Warehouse Selector - Only shows when product is selected */}
                    {selectedProduct && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold' }}>
                                Almacén de Origen *
                            </label>
                            <select
                                value={selectedWarehouseId}
                                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                style={{ width: '100%' }}
                            >
                                <option value="">Seleccionar almacén...</option>
                                {warehouses.filter(w => w.active !== false).map(w => (
                                    <option key={w.id} value={w.id}>
                                        {w.name} - Disponible: {selectedProduct.stockByWarehouse?.[w.id] || 0}
                                    </option>
                                ))}
                            </select>
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
                                <span>Bs. {(priceUSD * quantity * (parseFloat(exchangeRate) || 0)).toFixed(2)}</span>
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
                                        padding: '1rem',
                                        marginBottom: '0.75rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.875rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem' }}>
                                                    {item.description}
                                                </div>
                                                <div style={{
                                                    display: 'inline-block',
                                                    padding: '0.15rem 0.5rem',
                                                    borderRadius: '4px',
                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                    color: 'var(--accent-primary)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600'
                                                }}>
                                                    REF: {item.reference || 'N/A'}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(index)}
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: 'none',
                                                    color: 'var(--danger)',
                                                    cursor: 'pointer',
                                                    padding: '0.5rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '1rem',
                                            paddingTop: '0.75rem',
                                            borderTop: '1px solid var(--border-color)'
                                        }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                    <span>Precio Unit:</span>
                                                    <span style={{ color: 'var(--text-primary)' }}>
                                                        {paymentCurrency === 'Bs'
                                                            ? `Bs. ${((item.unitPriceUSD || 0) * (parseFloat(exchangeRate) || 0)).toFixed(2)}`
                                                            : `$${item.unitPriceUSD?.toFixed(2) || '0.00'}`
                                                        }
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Cantidad:</span>
                                                    <span style={{ color: 'var(--text-primary)' }}>x {item.quantity}</span>
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.1rem' }}>Total Item</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--success)' }}>
                                                    ${item.amountUSD.toFixed(2)}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                    Bs. {item.amountBs.toFixed(2)}
                                                </div>
                                            </div>
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
                                                        const usdInBs = usdValue * (parseFloat(exchangeRate) || 0);
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
                                                <div>USD en Bs: ${customUSD.toFixed(2)} × {exchangeRate} = Bs. {(customUSD * (parseFloat(exchangeRate) || 0)).toFixed(2)}</div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Historial de Ventas y Egresos</h3>
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

                {(historyDate ? sales.filter(sale => sale.date.startsWith(historyDate)) : []).length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                        No hay registros para la fecha seleccionada
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.875rem' }}>
                            <thead style={{ borderBottom: '2px solid var(--border-color)' }}>
                                <tr>
                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Fecha</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Producto</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ref.</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>SKU</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Cant.</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tipo</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>USD</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Bolívares</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.filter(sale => sale.date.startsWith(historyDate)).map(sale => (
                                    <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.75rem' }}>{new Date(sale.date).toLocaleDateString('es-VE', { timeZone: 'UTC' })}</td>
                                        <td style={{ padding: '0.75rem' }}>{sale.description}</td>
                                        <td style={{ padding: '0.75rem' }}>{sale.reference}</td>
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
                                    <td colSpan="6" style={{ padding: '0.75rem', textAlign: 'right' }}>TOTALES (Solo Efectivo):</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                        ${sales.filter(sale => sale.date.startsWith(historyDate)).reduce((sum, sale) => {
                                            if (sale.paymentCurrency === 'USD' || sale.paymentCurrency === 'Combinado') {
                                                const amount = sale.amountUSD || 0;
                                                return sale.paymentType === 'credit' ? sum : sum + amount;
                                            }
                                            return sum;
                                        }, 0).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                        Bs. {sales.filter(sale => sale.date.startsWith(historyDate)).reduce((sum, sale) => {
                                            if (sale.paymentCurrency === 'Bs' || sale.paymentCurrency === 'Combinado') {
                                                const amount = sale.amountBs || 0;
                                                return sale.paymentType === 'credit' ? sum : sum + amount;
                                            }
                                            return sum;
                                        }, 0).toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sales;
