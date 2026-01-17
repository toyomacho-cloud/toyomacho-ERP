import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Check } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';

const SkuGenerator = () => {
    const { brands, categories } = useInventoryContext();

    const [formData, setFormData] = useState({
        brand: '',
        category: '',
        sequence: ''
    });

    const [generatedSku, setGeneratedSku] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Get brand code from selected brand
        const selectedBrand = brands.find(b => b.name === formData.brand);
        const brandCode = selectedBrand ? selectedBrand.code : 'XXX';

        // Get category code from selected category
        const selectedCategory = categories.find(c => c.name === formData.category);
        const categoryCode = selectedCategory ? selectedCategory.code : '000';

        // Ensure sequence is numeric and padded to 3 digits
        let seqCode = formData.sequence.replace(/\D/g, '').substring(0, 3);
        if (seqCode.length > 0) {
            seqCode = seqCode.padStart(3, '0');
        } else {
            seqCode = '000';
        }

        setGeneratedSku(`${brandCode}${categoryCode}-${seqCode}`);
    }, [formData, brands, categories]);

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedSku);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReset = () => {
        setFormData({
            brand: '',
            category: '',
            sequence: ''
        });
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '2rem' }}>
                <h1>Generador de SKU</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Crea códigos estandarizados para tus productos.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>

                {/* Input Form */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Configuración del Código</h3>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Marca</label>
                            <select
                                value={formData.brand}
                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                style={{ width: '100%' }}
                            >
                                <option value="">Seleccionar marca...</option>
                                {brands.map(b => (
                                    <option key={b.id} value={b.name}>{b.name} ({b.code})</option>
                                ))}
                            </select>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                Se usará el código de 3 letras de la marca.
                            </p>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Categoría</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                style={{ width: '100%' }}
                            >
                                <option value="">Seleccionar categoría...</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                Se usará el código de 3 dígitos de la categoría.
                            </p>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Secuencia (3 Números)</label>
                            <input
                                type="number"
                                value={formData.sequence}
                                onChange={(e) => setFormData({ ...formData, sequence: e.target.value })}
                                placeholder="Ej. 1, 123"
                                min="0"
                                max="999"
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                Se formateará automáticamente a 3 dígitos (ej. 005).
                            </p>
                        </div>

                        <button className="btn btn-secondary" onClick={handleReset} style={{ marginTop: '1rem' }}>
                            <RefreshCw size={18} /> Limpiar Campos
                        </button>
                    </div>
                </div>

                {/* Preview & Actions */}
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '300px' }}>
                    <h3 style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>Vista Previa</h3>

                    <div style={{
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        letterSpacing: '2px',
                        fontFamily: 'monospace',
                        color: 'var(--primary)',
                        textShadow: '0 0 20px rgba(var(--primary-rgb), 0.5)',
                        marginBottom: '2rem',
                        wordBreak: 'break-all'
                    }}>
                        {generatedSku}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleCopy}
                            style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}
                        >
                            {copied ? <Check size={24} /> : <Copy size={24} />}
                            {copied ? '¡Copiado!' : 'Copiar Código'}
                        </button>
                    </div>

                    <div style={{ marginTop: '2rem', textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Estructura:</h4>
                        <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                            <li><strong>{generatedSku.substring(0, 3)}</strong>: Marca (3 letras)</li>
                            <li><strong>{generatedSku.substring(3, 6)}</strong>: Categoría (3 dígitos)</li>
                            <li><strong>-</strong>: Separador</li>
                            <li><strong>{generatedSku.substring(7)}</strong>: Secuencia (3 dígitos)</li>
                        </ul>
                    </div>
                </div>

            </div>

            {/* Registry Information */}
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Registro del Sistema</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* Brands */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--primary)' }}>
                            Marcas Registradas ({brands.length})
                        </h4>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', fontSize: '0.875rem' }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                                    <tr>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Marca</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Código</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {brands.map(b => (
                                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.5rem' }}>{b.name}</td>
                                            <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: 'var(--primary)' }}>{b.code}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Categories */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--success)' }}>
                            Categorías Registradas ({categories.length})
                        </h4>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', fontSize: '0.875rem' }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                                    <tr>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Categoría</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Código</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map(c => (
                                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.5rem' }}>{c.name}</td>
                                            <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: 'var(--success)' }}>{c.code}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkuGenerator;
