import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Filter, RefreshCw, FileSpreadsheet, ChevronUp, ChevronDown, X, Download } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import ProductForm from './ProductForm';
import ExcelImport from './ExcelImport';
import { exportProductsToExcel, exportProductsToCSV } from '../utils/excel-export';
import { debounce } from '../utils/debounce';

const Inventory = () => {
    const {
        products,
        deleteProduct,
        clearAllProducts,
        migrateSKUFormat,
        categories,
        brands,
        addCategory,
        addProductsBatch,
        addBrand,
        addBrands,
        addProduct,
        updateProduct
    } = useInventoryContext();


    const { isAdmin, hasPermission } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'category', direction: 'asc' });

    // Extract unique locations from products
    const uniqueLocations = useMemo(() => {
        const locations = products
            .map(p => p.location)
            .filter(loc => loc && loc.trim() !== '');
        return [...new Set(locations)].sort();
    }, [products]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Filter and Sort Products (Client-side with case-insensitive search)
    const sortedProducts = useMemo(() => {
        let filtered = [...products];

        // Case-insensitive multi-field search
        if (searchTerm && searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(p => {
                const description = (p.description || '').toLowerCase();
                const sku = (p.sku || '').toLowerCase();
                const reference = (p.reference || '').toLowerCase();

                return description.includes(term) ||
                    sku.includes(term) ||
                    reference.includes(term);
            });
        }

        // Location filter
        if (locationFilter) {
            filtered = filtered.filter(p =>
                p.location === locationFilter
            );
        }

        // Sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [products, searchTerm, locationFilter, sortConfig]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleClearAll = () => {
        if (window.confirm('¿Estás seguro de que deseas ELIMINAR TODOS los productos? Esta acción no se puede deshacer.')) {
            clearAllProducts();
        }
    };

    const handleExportExcel = () => {
        exportProductsToExcel(products);
    };

    const handleExportCSV = () => {
        exportProductsToCSV(products);
    };

    const handleExcelDataLoaded = (data) => {
        addProducts(data);
        setIsImportModalOpen(false);
        alert(`Se importaron ${data.length} productos exitosamente.`);
    };

    const SortableHeader = ({ columnKey, label, style }) => (
        <th
            style={{ ...style, padding: '1rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-secondary)', fontWeight: 600 }}
            onClick={() => handleSort(columnKey)}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {label}
                {sortConfig.key === columnKey && (
                    sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                )}
            </div>
        </th>
    );

    return (
        <div className="animate-fade-in">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Inventario</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Gestión general de productos
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-success" onClick={handleExportExcel} title="Exportar inventario a Excel">
                        <Download size={20} /> Excel
                    </button>
                    <button className="btn btn-secondary" onClick={handleExportCSV} title="Exportar inventario a CSV">
                        <Download size={20} /> CSV
                    </button>
                    <button className="btn btn-secondary" onClick={() => setIsImportModalOpen(true)} title="Importar desde Excel">
                        <FileSpreadsheet size={20} /> Importar
                    </button>
                    {isAdmin() && (
                        <button className="btn btn-danger" onClick={handleClearAll} title="Eliminar todos los productos">
                            <Trash2 size={20} /> Eliminar Todo
                        </button>
                    )}
                </div>
            </header>

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                {/* Toolbar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    {/* Search Field - Full Width */}
                    <div style={{ position: 'relative', width: '100%' }}>
                        <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por SKU, Referencia o Descripción..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            style={{ paddingLeft: '3rem', width: '100%' }}
                        />
                        {sortedProducts.length > 0 && (
                            <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {sortedProducts.length} de {products.length} productos
                            </div>
                        )}
                    </div>

                    {/* Filters Row */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: '0 0 250px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>📍 Ubicación</label>
                            <input
                                list="locations-list"
                                type="text"
                                placeholder="Todas las ubicaciones"
                                value={locationFilter}
                                onChange={(e) => setLocationFilter(e.target.value)}
                                style={{ width: '100%', fontSize: '0.875rem' }}
                            />
                            <datalist id="locations-list">
                                {uniqueLocations.map(loc => (
                                    <option key={loc} value={loc} />
                                ))}
                            </datalist>
                        </div>

                        {(searchTerm || locationFilter) && (
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setSearchTerm('');
                                    setLocationFilter('');
                                }}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                title="Limpiar filtros"
                            >
                                <X size={16} /> Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div style={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 350px)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(255, 255, 255, 0.05)'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', minWidth: '1200px' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)', backdropFilter: 'blur(10px)' }}>
                            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                <SortableHeader columnKey="sku" label="SKU" style={{ minWidth: '150px', whiteSpace: 'nowrap' }} />
                                <SortableHeader columnKey="reference" label="Referencia" />
                                <SortableHeader columnKey="description" label="Descripcion" />
                                <SortableHeader columnKey="category" label="Categoria" style={{ maxWidth: '120px' }} />
                                <SortableHeader columnKey="brand" label="Marca" />
                                <SortableHeader columnKey="location" label="Ubicacion" />
                                <SortableHeader columnKey="price" label="Precio" />
                                <SortableHeader columnKey="quantity" label="Existencia" />
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedProducts.map((product) => (
                                <tr key={product.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="hover:bg-slate-800">
                                    <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--text-primary)', minWidth: '150px', whiteSpace: 'nowrap' }}>{product.sku || '-'}</td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{product.reference || '-'}</td>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{product.description || 'Sin descripción'}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product.category || 'Sin categoría'}>{product.category || 'Sin categoría'}</td>
                                    <td style={{ padding: '1rem' }}>{product.brand || 'Sin marca'}</td>
                                    <td style={{ padding: '1rem' }}>{product.location || '-'}</td>
                                    <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--success)' }}>
                                        {product.price ? `$${parseFloat(product.price).toFixed(2)}` : '-'}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.875rem',
                                            background: product.quantity > 10 ? 'rgba(16, 185, 129, 0.1)' :
                                                product.quantity > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: product.quantity > 10 ? 'var(--success)' :
                                                product.quantity > 0 ? 'var(--warning)' : 'var(--danger)'
                                        }}>
                                            {product.quantity}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '0.5rem' }}
                                                onClick={() => handleEditProduct(product)}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                style={{ padding: '0.5rem' }}
                                                onClick={() => deleteProduct(product.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ProductForm
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingProduct(null);
                }}
                editProduct={editingProduct}
                products={products}
                brands={brands}
                categories={categories}
                addProduct={addProduct}
                updateProduct={updateProduct}
                addBrand={addBrand}
                addCategory={addCategory}
            />

            {
                isImportModalOpen && (
                    <ExcelImport
                        onClose={() => setIsImportModalOpen(false)}
                        onDataLoaded={handleExcelDataLoaded}
                    />
                )
            }
        </div >
    );
};

export default React.memo(Inventory);
