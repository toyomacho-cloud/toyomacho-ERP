import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Filter, RefreshCw, FileSpreadsheet, ChevronUp, ChevronDown, X, Download, ChevronLeft, ChevronRight, CheckSquare, History } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import ProductForm from './ProductForm';
import ExcelImport from './ExcelImport';
import ProductMovementHistory from './ProductMovementHistory';
import { exportProductsToExcel, exportProductsToCSV } from '../utils/excel-export';
import { debounce } from '../utils/debounce';

const Inventory = () => {
    const {
        products,
        deleteProduct,
        deleteProductsBatch,
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

    const { getProductMovementHistory } = useInventoryContext();


    const { isAdmin, hasPermission } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'category', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    // ========== BULK SELECTION STATES ==========
    const [selectedProducts, setSelectedProducts] = useState(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [historyProduct, setHistoryProduct] = useState(null);

    // Toggle single product selection
    const toggleSelectProduct = (productId) => {
        setSelectedProducts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    };

    // Toggle select all products on current page
    const toggleSelectAll = () => {
        const currentPageIds = paginatedProducts.map(p => p.id);
        const allSelected = currentPageIds.every(id => selectedProducts.has(id));

        setSelectedProducts(prev => {
            const newSet = new Set(prev);
            if (allSelected) {
                // Deselect all on current page
                currentPageIds.forEach(id => newSet.delete(id));
            } else {
                // Select all on current page
                currentPageIds.forEach(id => newSet.add(id));
            }
            return newSet;
        });
    };

    // Bulk delete handler
    const handleBulkDelete = async () => {
        const count = selectedProducts.size;
        if (count === 0) return;

        const confirmMsg = `¿Esta seguro de eliminar ${count} producto(s) seleccionado(s)? Esta accion no se puede deshacer.`;
        if (!window.confirm(confirmMsg)) return;

        try {
            setIsDeleting(true);
            await deleteProductsBatch(Array.from(selectedProducts));
            setSelectedProducts(new Set());
        } catch (error) {
            console.error('Bulk delete error:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    // Clear selection
    const clearSelection = () => {
        setSelectedProducts(new Set());
    };

    // Extract unique locations from products
    const uniqueLocations = useMemo(() => {
        const locations = products
            .map(p => p.location)
            .filter(loc => loc && loc.trim() !== '');
        return [...new Set(locations)].sort();
    }, [products]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page on search
    };

    // Filter and Sort Products (Client-side with relevance scoring)
    const sortedProducts = useMemo(() => {
        let filtered = [...products];

        // Location filter (aplicar siempre)
        if (locationFilter) {
            filtered = filtered.filter(p => p.location === locationFilter);
        }

        // Case-insensitive multi-field search with RELEVANCE SCORING
        if (searchTerm && searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();

            filtered = filtered
                .map(p => {
                    const desc = (p.description || '').toLowerCase();
                    const sku = (p.sku || '').toLowerCase();
                    const ref = (p.reference || '').toLowerCase();

                    let relevance = 0;

                    // Nivel 1: description empieza con el termino (maxima prioridad)
                    if (desc.startsWith(term)) {
                        relevance = 100;
                    }
                    // Nivel 2: alguna palabra de description empieza con el termino
                    else if (desc.split(/\s+/).some(word => word.startsWith(term))) {
                        relevance = 75;
                    }
                    // Nivel 3: coincidencia en SKU o referencia
                    else if (sku.includes(term) || ref.includes(term)) {
                        relevance = 50;
                    }
                    // Nivel 4: description contiene el termino en cualquier posicion
                    else if (desc.includes(term)) {
                        relevance = 25;
                    }

                    return { ...p, _relevance: relevance };
                })
                .filter(p => p._relevance > 0);

            // Ordenar por relevancia (mayor primero), luego alfabetico
            filtered.sort((a, b) => {
                if (b._relevance !== a._relevance) return b._relevance - a._relevance;
                return (a.description || '').localeCompare(b.description || '');
            });
        } else {
            // Sin busqueda: aplicar ordenamiento por columna
            if (sortConfig.key) {
                filtered.sort((a, b) => {
                    const aValue = a[sortConfig.key] || '';
                    const bValue = b[sortConfig.key] || '';

                    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }
        }

        return filtered;
    }, [products, searchTerm, locationFilter, sortConfig]);

    // Paginated products (PERFORMANCE OPTIMIZATION)
    const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [sortedProducts, currentPage, ITEMS_PER_PAGE]);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

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
        <>
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
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', tableLayout: 'fixed' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)', backdropFilter: 'blur(10px)' }}>
                                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                    {/* Checkbox column */}
                                    <th style={{ padding: '0.75rem', width: '40px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProducts.has(p.id))}
                                            onChange={toggleSelectAll}
                                            style={{
                                                width: '18px',
                                                height: '18px',
                                                cursor: 'pointer',
                                                accentColor: 'var(--primary)'
                                            }}
                                            title="Seleccionar todos"
                                        />
                                    </th>
                                    <SortableHeader columnKey="sku" label="SKU" style={{ width: '9%' }} />
                                    <SortableHeader columnKey="reference" label="Referencia" style={{ width: '9%' }} />
                                    <SortableHeader columnKey="description" label="Descripcion" style={{ width: '21%' }} />
                                    <SortableHeader columnKey="category" label="Categoria" style={{ width: '9%' }} />
                                    <SortableHeader columnKey="brand" label="Marca" style={{ width: '9%' }} />
                                    <SortableHeader columnKey="location" label="Ubicacion" style={{ width: '8%' }} />
                                    <SortableHeader columnKey="price" label="Precio" style={{ width: '8%' }} />
                                    <SortableHeader columnKey="quantity" label="Exist." style={{ width: '7%' }} />
                                    <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, width: '12%' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedProducts.map((product) => (
                                    <tr
                                        key={product.id}
                                        style={{
                                            borderBottom: '1px solid var(--border-color)',
                                            transition: 'background 0.2s',
                                            background: selectedProducts.has(product.id) ? 'rgba(59, 130, 246, 0.15)' : 'transparent'
                                        }}
                                        className="hover:bg-slate-800"
                                    >
                                        {/* Checkbox cell */}
                                        <td style={{ padding: '0.75rem', textAlign: 'center', width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedProducts.has(product.id)}
                                                onChange={() => toggleSelectProduct(product.id)}
                                                style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    cursor: 'pointer',
                                                    accentColor: 'var(--primary)'
                                                }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={product.sku}>{product.sku || '-'}</td>
                                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product.reference}>{product.reference || '-'}</td>
                                        <td style={{ padding: '0.75rem', fontWeight: 600, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product.description}>{product.description || 'Sin descripcion'}</td>
                                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product.category}>{product.category || '-'}</td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product.brand}>{product.brand || '-'}</td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product.location}>{product.location || '-'}</td>
                                        <td style={{ padding: '0.75rem', fontWeight: 600, color: '#059669', fontSize: '1rem' }}>
                                            {product.price ? `$${parseFloat(product.price).toFixed(2)}` : '-'}
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '0.25rem 0.6rem',
                                                borderRadius: '999px',
                                                fontSize: '0.95rem',
                                                fontWeight: 600,
                                                background: product.quantity > 10 ? 'rgba(16, 185, 129, 0.1)' :
                                                    product.quantity > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: product.quantity > 10 ? '#059669' :
                                                    product.quantity > 0 ? '#d97706' : '#dc2626'
                                            }}>
                                                {product.quantity}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.4rem' }}
                                                    onClick={() => setHistoryProduct(product)}
                                                    title="Historial de Movimientos"
                                                >
                                                    <History size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.4rem' }}
                                                    onClick={() => handleEditProduct(product)}
                                                    title="Editar"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-danger"
                                                    style={{ padding: '0.4rem' }}
                                                    onClick={() => {
                                                        if (window.confirm(`¿Esta seguro de eliminar "${product.description || product.sku}"? Esta accion no se puede deshacer.`)) {
                                                            deleteProduct(product.id);
                                                        }
                                                    }}
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Bulk Actions Floating Bar */}
                    {selectedProducts.size > 0 && (
                        <div style={{
                            position: 'fixed',
                            bottom: '2rem',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '1rem 1.5rem',
                            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--primary)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.3)',
                            zIndex: 1000,
                            backdropFilter: 'blur(12px)',
                            animation: 'slideUp 0.3s ease-out'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: 'rgba(59, 130, 246, 0.2)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <CheckSquare size={20} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {selectedProducts.size} seleccionado(s)
                                </span>
                            </div>

                            <button
                                className="btn btn-danger"
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.25rem'
                                }}
                            >
                                <Trash2 size={18} />
                                {isDeleting ? 'Eliminando...' : 'Eliminar Seleccionados'}
                            </button>

                            <button
                                className="btn btn-secondary"
                                onClick={clearSelection}
                                style={{ padding: '0.75rem 1rem' }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '1rem',
                            padding: '0.75rem 1rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{ fontSize: '0.875rem', color: 'white', fontWeight: 500 }}>
                                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedProducts.length)} de {sortedProducts.length} productos
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => goToPage(1)}
                                    disabled={currentPage === 1}
                                    style={{ padding: '0.4rem 0.6rem' }}
                                    title="Primera pagina"
                                >
                                    ««
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    style={{ padding: '0.4rem 0.6rem' }}
                                    title="Pagina anterior"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span style={{
                                    padding: '0.4rem 1rem',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    borderRadius: 'var(--radius-sm)',
                                    fontWeight: 600,
                                    fontSize: '0.875rem'
                                }}>
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    style={{ padding: '0.4rem 0.6rem' }}
                                    title="Pagina siguiente"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => goToPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    style={{ padding: '0.4rem 0.6rem' }}
                                    title="Ultima pagina"
                                >
                                    »»
                                </button>
                            </div>
                        </div>
                    )}
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

            {
                historyProduct && (
                    <ProductMovementHistory
                        product={historyProduct}
                        onClose={() => setHistoryProduct(null)}
                        getProductMovementHistory={getProductMovementHistory}
                    />
                )
            }
        </>
    );
};

export default React.memo(Inventory);
