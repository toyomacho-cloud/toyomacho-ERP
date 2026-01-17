import React, { useState, useEffect } from 'react';
import { X, Tag } from 'lucide-react';
import { calculatePrice, encodePriceToMurcielago as encodeMurcielagoZPL, generateBatchZPL, downloadZPL, previewZPL } from '../utils/zpl-utils';
import { encodePriceToMurcielago, generatePDFLabels, downloadPDF } from '../utils/pdf-label-utils';
import { loadConfig, saveConfig as saveConfigToStorage, resetConfig } from '../utils/label-config';
import { isBrowserPrintAvailable, getAvailablePrinters, selectPrinter as selectZebraPrinter, printBatchZPLDirect, restoreSelectedPrinter, getSelectedPrinter } from '../utils/zebra-print';
import { generateWordLabels, downloadWord } from '../utils/word-label-utils';

const LabelGenerator = ({ isOpen, onClose, purchases, products }) => {
    const [selectionMode, setSelectionMode] = useState('batch');
    const [labelProducts, setLabelProducts] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState({});
    const [outputFormat, setOutputFormat] = useState('pdf'); // 'pdf' or 'zpl'

    // Browser Print states
    const [browserPrintAvailable, setBrowserPrintAvailable] = useState(false);
    const [availablePrinters, setAvailablePrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState(null);
    const [showPrinterModal, setShowPrinterModal] = useState(false);
    const [checkingPrinters, setCheckingPrinters] = useState(false);

    const [labelConfig, setLabelConfig] = useState(() => {
        try {
            return loadConfig();
        } catch {
            return {
                version: '1.0',
                elements: {
                    logo: { visible: true, fontSize: 8 },
                    provider: { visible: true, fontSize: 6, bold: true },
                    reference: { visible: true, fontSize: 14, bold: true },
                    description: { visible: true, fontSize: 8, bold: false },
                    location: { visible: true, fontSize: 6, bold: true },
                    contact: { visible: true, fontSize: 5, bold: false },
                    price: { visible: true, fontSize: 8, bold: true }
                },
                layout: { width: 5.6, height: 3.3 }
            };
        }
    });

    // Initialize selected products
    useEffect(() => {
        if (labelProducts.length > 0) {
            const initial = {};
            labelProducts.forEach((_, index) => {
                initial[index] = true;
            });
            setSelectedProducts(initial);
        }
    }, [labelProducts]);

    // Check for Browser Print on mount and when modal opens
    useEffect(() => {
        if (isOpen && outputFormat === 'zpl') {
            checkBrowserPrint();
        }
    }, [isOpen, outputFormat]);

    async function checkBrowserPrint() {
        setCheckingPrinters(true);
        const available = await isBrowserPrintAvailable();
        setBrowserPrintAvailable(available);

        if (available) {
            const printers = await getAvailablePrinters();
            setAvailablePrinters(printers);

            // Try to restore previously selected printer
            const restored = await restoreSelectedPrinter();
            if (restored) {
                setSelectedPrinter(restored);
            } else if (printers.length > 0) {
                // Select first printer by default
                setSelectedPrinter(printers[0]);
                selectZebraPrinter(printers[0]);
            }
        }
        setCheckingPrinters(false);
    }

    async function handlePrintDirect() {
        if (!browserPrintAvailable) {
            if (window.confirm('❌ Zebra Browser Print no está instalado.\n\n¿Deseas abrir la página de descarga?')) {
                window.open('https://www.zebra.com/us/en/support-downloads/software/developer-tools/browser-print.html', '_blank');
            }
            return;
        }

        if (!selectedPrinter) {
            setShowPrinterModal(true);
            return;
        }

        try {
            const selectedList = labelProducts.filter((_, i) => selectedProducts[i]);

            if (selectedList.length === 0) {
                alert('⚠️ Selecciona al menos un producto');
                return;
            }

            const productsWithCopies = [];
            selectedList.forEach(product => {
                for (let i = 0; i < (product.copies || 1); i++) {
                    productsWithCopies.push(product);
                }
            });

            const zplContent = generateBatchZPL(productsWithCopies, labelConfig);
            await printBatchZPLDirect(zplContent);

            alert(`✅ ${productsWithCopies.length} etiqueta(s) enviadas a:\n${selectedPrinter.name}`);
        } catch (error) {
            alert(`❌ Error al imprimir:\n${error.message}`);
            console.error('Print error:', error);
        }
    }

    function handlePrinterSelect(printer) {
        setSelectedPrinter(printer);
        selectZebraPrinter(printer);
        setShowPrinterModal(false);
    }

    if (!isOpen) return null;

    const handlePurchaseSelect = (purchase) => {
        try {
            const filteredPurchases = purchases.filter(p =>
                p.invoiceNumber === purchase.invoiceNumber && p.providerId === purchase.providerId
            );

            const purchaseProducts = [];
            filteredPurchases.forEach((p) => {
                const cost = parseFloat(p.price || p.cost || 0);
                if (!isNaN(cost)) {
                    purchaseProducts.push({
                        reference: p.productReference || p.productSku || '-',
                        description: p.productName || 'Sin descripción',
                        location: products.find(prod => prod.id === parseInt(p.productId || '0'))?.location || '-',
                        cost: cost,
                        profitMargin: 300,
                        price: calculatePrice(cost, 300),
                        copies: 1
                    });
                }
            });

            if (purchaseProducts.length > 0) {
                setLabelProducts(purchaseProducts);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al procesar la compra');
        }
    };

    const toggleProduct = (index) => {
        setSelectedProducts(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const selectAll = () => {
        const all = {};
        labelProducts.forEach((_, index) => {
            all[index] = true;
        });
        setSelectedProducts(all);
    };

    const deselectAll = () => {
        const none = {};
        labelProducts.forEach((_, index) => {
            none[index] = false;
        });
        setSelectedProducts(none);
    };

    const handleCopiesChange = (index, newCopies) => {
        const updated = [...labelProducts];
        updated[index].copies = parseInt(newCopies) || 1;
        setLabelProducts(updated);
    };

    const handleGeneratePDF = async () => {
        const selectedList = labelProducts.filter((_, i) => selectedProducts[i]);

        if (selectedList.length === 0) {
            alert('⚠️ Selecciona al menos un producto');
            return;
        }

        const productsWithCopies = [];
        selectedList.forEach(product => {
            for (let i = 0; i < (product.copies || 1); i++) {
                productsWithCopies.push(product);
            }
        });

        if (outputFormat === 'zpl') {
            // Generate ZPL for Zebra printer
            const zplContent = generateBatchZPL(productsWithCopies, labelConfig);
            downloadZPL(zplContent);
            previewZPL(zplContent);
            alert(`✅ Archivo ZPL generado con ${productsWithCopies.length} etiqueta(s)\n\nEnvía el archivo a tu impresora Zebra TLP 2824`);
        } else if (outputFormat === 'docx') {
            // Generate Word document
            const doc = generateWordLabels(productsWithCopies);
            await downloadWord(doc);
            alert(`✅ Documento Word generado con ${productsWithCopies.length} etiqueta(s)`);
        } else {
            // Generate PDF
            const doc = generatePDFLabels(productsWithCopies, labelConfig);
            downloadPDF(doc);
            alert(`✅ PDF generado con ${productsWithCopies.length} etiqueta(s)`);
        }
    };

    const uniquePurchases = purchases
        .reduce((acc, p) => {
            const key = `${p.invoiceNumber}-${p.providerId}`;
            if (!acc.find(item => item.key === key)) {
                acc.push({
                    key,
                    invoiceNumber: p.invoiceNumber,
                    providerId: p.providerId,
                    providerName: p.providerName,
                    date: p.date
                });
            }
            return acc;
        }, [])
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 15);

    const selectedCount = Object.values(selectedProducts).filter(Boolean).length;
    const totalLabels = labelProducts.filter((_, i) => selectedProducts[i]).reduce((sum, p) => sum + (p.copies || 1), 0);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'var(--bg-primary)',
                padding: '2rem',
                borderRadius: 'var(--radius-lg)',
                maxWidth: '900px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto',
                position: 'relative',
                color: 'var(--text-primary)'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-primary)'
                }}>
                    <X size={24} />
                </button>

                <h2 style={{ marginBottom: '1rem' }}>🏷️ Generador de Etiquetas</h2>

                {labelProducts.length === 0 ? (
                    <div>
                        <p style={{ marginBottom: '1rem' }}>Selecciona una compra:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                            {uniquePurchases.map((purchase, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePurchaseSelect(purchase)}
                                    className="btn btn-secondary"
                                    style={{ textAlign: 'left', padding: '1rem' }}
                                >
                                    <strong>Factura: {purchase.invoiceNumber}</strong>
                                    <br />
                                    <small>{purchase.providerName} • {new Date(purchase.date).toLocaleDateString()}</small>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div>
                        <h3>Seleccionar Productos</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <button onClick={selectAll} className="btn btn-secondary">☑ Todos</button>
                            <button onClick={deselectAll} className="btn btn-secondary">☐ Ninguno</button>
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
                            {labelProducts.map((product, index) => (
                                <label key={index} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    background: selectedProducts[index] ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 100, 100, 0.05)',
                                    marginBottom: '0.5rem',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedProducts[index] || false}
                                        onChange={() => toggleProduct(index)}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <strong>{product.reference}</strong> - {product.description}
                                    </div>
                                    <input
                                        type="number"
                                        value={product.copies}
                                        onChange={(e) => handleCopiesChange(index, e.target.value)}
                                        min="1"
                                        max="999"
                                        style={{ width: '60px', padding: '0.25rem', textAlign: 'center' }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </label>
                            ))}
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '0.875rem' }}>
                            📊 {selectedCount} de {labelProducts.length} productos = {totalLabels} etiquetas
                        </div>

                        <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Formato de Salida:</label>
                            <select
                                value={outputFormat}
                                onChange={(e) => setOutputFormat(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'var(--bg-primary)'
                                }}
                            >
                                <option value="pdf">📄 PDF - Vista previa/Archivo (Cualquier impresora)</option>
                                <option value="zpl">🖨️ ZPL - Impresora Zebra TLP 2824 (2"×3")</option>
                                <option value="docx">📝 WORD - Documento editable (.docx)</option>
                            </select>
                            {outputFormat === 'zpl' && (
                                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    ⚡ Formato optimizado para impresión térmica directa
                                </p>
                            )}
                            {outputFormat === 'docx' && (
                                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    📝 Documento editable en Microsoft Word
                                </p>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setLabelProducts([])} className="btn btn-secondary">
                                ← Volver
                            </button>

                            {outputFormat === 'zpl' && browserPrintAvailable && selectedPrinter && (
                                <button onClick={handlePrintDirect} className="btn btn-success">
                                    🖨️ Imprimir Directo ({totalLabels})
                                </button>
                            )}

                            <button onClick={handleGeneratePDF} className="btn btn-primary">
                                {outputFormat === 'zpl' ? '💾' : '📄'} {browserPrintAvailable && selectedPrinter && outputFormat === 'zpl' ? 'Descargar' : 'Generar'} {outputFormat.toUpperCase()} ({totalLabels})
                            </button>

                            {outputFormat === 'zpl' && selectedPrinter && (
                                <button onClick={() => setShowPrinterModal(true)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                                    ⚙️
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Printer Selection Modal */}
                {showPrinterModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000
                    }}>
                        <div style={{
                            background: 'var(--bg-primary)',
                            padding: '2rem',
                            borderRadius: 'var(--radius-lg)',
                            maxWidth: '400px',
                            width: '90%'
                        }}>
                            <h3 style={{ marginBottom: '1rem' }}>🖨️ Seleccionar Impresora Zebra</h3>

                            {checkingPrinters ? (
                                <p>Detectando impresoras...</p>
                            ) : availablePrinters.length === 0 ? (
                                <div>
                                    <p>⚠️ No se encontraron impresoras Zebra conectadas.</p>
                                    <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Verifica que:</p>
                                    <ul style={{ fontSize: '0.875rem', marginLeft: '1.5rem' }}>
                                        <li>La impresora esté encendida</li>
                                        <li>Esté conectada (USB o Red)</li>
                                        <li>Browser Print esté instalado</li>
                                    </ul>
                                </div>
                            ) : (
                                <div>
                                    <select
                                        value={selectedPrinter?.uid || ''}
                                        onChange={(e) => {
                                            const printer = availablePrinters.find(p => p.uid === e.target.value);
                                            if (printer) handlePrinterSelect(printer);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            marginBottom: '1rem',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'var(--bg-secondary)'
                                        }}
                                    >
                                        {availablePrinters.map(p => (
                                            <option key={p.uid} value={p.uid}>{p.name}</option>
                                        ))}
                                    </select>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                        La impresora seleccionada se guardará para próximas sesiones
                                    </p>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => setShowPrinterModal(false)} className="btn btn-secondary">
                                    Cerrar
                                </button>
                                {availablePrinters.length > 0 && (
                                    <button onClick={() => setShowPrinterModal(false)} className="btn btn-primary">
                                        Confirmar
                                    </button>
                                )}
                                {availablePrinters.length === 0 && (
                                    <button
                                        onClick={() => {
                                            setShowPrinterModal(false);
                                            checkBrowserPrint();
                                        }}
                                        className="btn btn-primary"
                                    >
                                        🔄 Reintentar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LabelGenerator;
