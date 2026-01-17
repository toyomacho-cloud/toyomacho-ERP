import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Filter, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import ProductForm from './ProductForm';
import ExcelImport from './ExcelImport';

const Inventory = () => {
    const { products, deleteProduct, clearAllProducts, migrateSKUFormat, categories, brands, addCategories, addProducts, addBrand, addBrands } = useInventoryContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const handleExcelDataLoaded = async (data) => {
        try {
            console.log('📊 Datos recibidos:', data.length, 'filas');
            console.log('📊 Primera fila:', data[0]);

            // Filter out empty rows and validate data
            const validData = data.filter(item => {
                // Row must have at least a description or reference
                const hasDescription = item.DESCRIPCION || item.Description || item.Descripcion;
                const hasReference = item.REFERENCIA || item.Reference || item.Referencia;
                return hasDescription || hasReference;
            });

            console.log('📊 Filas válidas:', validData.length);

            if (validData.length === 0) {
                alert('❌ No se encontraron datos válidos en el archivo Excel.');
                return;
            }

            let newCategoriesCount = 0;
            let newProductsCount = 0;

            // Local copies for processing
            let currentCategories = [...(categories || [])];
            let currentBrands = [...(brands || [])];
            const newCategoriesList = [];
            const newBrandsList = [];
            const newProductsList = [];

            // Helper function to safely get string value
            const safeString = (value, defaultVal = '') => {
                if (value === null || value === undefined) return defaultVal;
                return String(value).trim();
            };

            // 1. Process Categories & Brands
            validData.forEach(item => {
                const catName = safeString(item.CATEGORIA || item.Category || item.Categoria, 'General');
                const brandName = safeString(item.MARCA || item.Brand || item.Marca, 'Generic');

                // Check Category
                if (catName &&
                    !currentCategories.find(c => c && c.name && c.name.toLowerCase() === catName.toLowerCase()) &&
                    !newCategoriesList.find(c => c && c.name && c.name.toLowerCase() === catName.toLowerCase())) {

                    // Calculate next code (incremento de 1 en 1)
                    const allCats = [...currentCategories, ...newCategoriesList];
                    const maxCode = allCats.reduce((max, cat) => {
                        const numCode = parseInt(cat?.code) || 0;
                        return numCode > max ? numCode : max;
                    }, 0);
                    const nextCode = (maxCode + 1).toString().padStart(3, '0');

                    const newCat = { name: catName, code: nextCode };
                    newCategoriesList.push(newCat);
                }

                // Check Brand
                if (brandName &&
                    !currentBrands.find(b => b && b.name && b.name.toLowerCase() === brandName.toLowerCase()) &&
                    !newBrandsList.find(b => b && b.name && b.name.toLowerCase() === brandName.toLowerCase())) {

                    const newBrand = {
                        name: brandName,
                        code: brandName.substring(0, 3).toUpperCase()
                    };
                    newBrandsList.push(newBrand);
                }
            });

            // Add new categories in bulk
            if (newCategoriesList.length > 0) {
                console.log('📁 Nuevas categorías a agregar:', newCategoriesList);
                await addCategories(newCategoriesList);
                currentCategories = [...currentCategories, ...newCategoriesList];
                newCategoriesCount = newCategoriesList.length;
            }

            console.log('📁 Total categorías disponibles:', currentCategories.length, currentCategories.slice(0, 5));

            // Add new brands in bulk
            if (newBrandsList.length > 0) {
                console.log('🏷️ Nuevas marcas a agregar:', newBrandsList.slice(0, 5));
                await addBrands(newBrandsList);
                currentBrands = [...currentBrands, ...newBrandsList];
            }

            // 2. Process Products & Generate SKUs
            validData.forEach(item => {
                const brandName = safeString(item.MARCA || item.Brand || item.Marca, 'Generic');
                const catName = safeString(item.CATEGORIA || item.Category || item.Categoria, 'General');

                const brand = currentBrands.find(b => b && b.name && b.name.toLowerCase() === brandName.toLowerCase());
                const category = currentCategories.find(c => c && c.name && c.name.toLowerCase() === catName.toLowerCase());

                // Brand code: first 3 characters of brand name, uppercase
                const brandCode = brand && brand.code
                    ? brand.code.substring(0, 3).toUpperCase()
                    : brandName.substring(0, 3).toUpperCase();

                // Category code: MUST be 3 digit numeric code
                // Validate that category.code is numeric, otherwise use '000'
                let catCode = '000';
                if (category && category.code) {
                    const numericCode = parseInt(category.code);
                    if (!isNaN(numericCode)) {
                        catCode = numericCode.toString().padStart(3, '0');
                    }
                }

                // Calculate Sequence
                const safeProducts = Array.isArray(products) ? products : [];
                const existingCount = safeProducts.filter(p => p.brand === brandName && p.category === catName).length;
                const batchCount = newProductsList.filter(p => p.brand === brandName && p.category === catName).length;
                const nextSeq = (existingCount + batchCount + 1).toString().padStart(3, '0');

                const sku = `${brandCode}-${catCode}-${nextSeq}`;

                console.log(`SKU: ${sku} | Marca: ${brandName} (${brandCode}) | Cat: ${catName} (${catCode})`);

                newProductsList.push({
                    sku,
                    reference: safeString(item.REFERENCIA || item.Reference || item.Referencia),
                    description: safeString(item.DESCRIPCION || item.Description || item.Descripcion, 'Producto Importado'),
                    category: catName,
                    brand: brandName,
                    location: safeString(item.UBICACION || item.Location || item.Ubicacion, 'Bodega'),
                    warehouse: safeString(item.ALMACEN || item.Warehouse || item.Almacen, 'Principal'),
                    unit: safeString(item['UNIDAD DE MEDIDA'] || item.Unit || item.Unidad, 'Unidad'),
                    quantity: parseInt(item.CANTIDAD || item.Quantity || item.Cantidad || item.Existencia) || 0,
                    price: parseFloat(item.PRECIO || item.Price || item.Precio) || 0,
                    status: (parseInt(item.CANTIDAD || item.Quantity || item.Cantidad) || 0) > 0 ? 'In Stock' : 'Out of Stock'
                });
            });

            if (newProductsList.length > 0) {
                await addProducts(newProductsList);
                newProductsCount = newProductsList.length;
            }

            setIsImportModalOpen(false);
            alert(`✅ Importación completada:\n- ${newCategoriesCount} Categorías nuevas\n- ${newProductsCount} Productos nuevos`);
        } catch (error) {
            console.error("Import Error:", error);
            alert(`❌ Error al importar: ${error.message}`);
        }
    };

    const filteredProducts = products.filter(product => {
        const desc = product.description ? product.description.toLowerCase() : '';
        const sku = product.sku ? product.sku.toLowerCase() : '';
        const ref = product.reference ? product.reference.toLowerCase() : '';
        const term = searchTerm.toLowerCase();

        return desc.includes(term) || sku.includes(term) || ref.includes(term);
    });

    const handleAddProduct = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleMigrateSKUs = async () => {
        const count = await migrateSKUFormat();
        if (count > 0) {
            alert(`✅ Se corrigieron ${count} SKUs al nuevo formato.`);
        } else {
            alert('ℹ️ Todos los SKUs ya están en el formato correcto.');
        }
    };

    const handleClearAll = async () => {
        if (window.confirm('⚠️ ¿Estás seguro de que quieres ELIMINAR TODOS los productos?\n\nEsta acción no se puede deshacer.')) {
            await clearAllProducts();
        }
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Módulo de Productos</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Gestión de inventario y catálogo de productos.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-danger" onClick={handleClearAll} title="Eliminar todos los productos">
                        <Trash2 size={20} /> Eliminar Todo
                    </button>
                    <button className="btn btn-secondary" onClick={() => setIsImportModalOpen(true)} title="Importar desde Excel">
                        <FileSpreadsheet size={20} /> Importar Excel
                    </button>

                    <button className="btn btn-primary" onClick={handleAddProduct}>
                        <Plus size={20} /> Nuevo Producto
                    </button>
                </div>
            </header>

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por SKU, Referencia o Descripción..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '3rem' }}
                        />
                    </div>
                    <button className="btn btn-secondary">
                        <Filter size={20} /> Filtros
                    </button>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, minWidth: '150px', whiteSpace: 'nowrap' }}>SKU</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Referencia</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Descripción</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, maxWidth: '120px' }}>Categoría</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Marca</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Ubicación</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Existencia</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => (
                                <tr key={product.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="hover:bg-slate-800">
                                    <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--accent-primary)', minWidth: '150px', whiteSpace: 'nowrap' }}>{product.sku || '-'}</td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{product.reference || '-'}</td>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{product.description || 'Sin descripción'}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product.category || 'Sin categoría'}>{product.category || 'Sin categoría'}</td>
                                    <td style={{ padding: '1rem' }}>{product.brand || 'Sin marca'}</td>
                                    <td style={{ padding: '1rem' }}>{product.location || '-'}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.875rem',
                                            background: (product.totalQuantity || 0) > 10 ? 'rgba(16, 185, 129, 0.1)' :
                                                (product.totalQuantity || 0) > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: (product.totalQuantity || 0) > 10 ? 'var(--success)' :
                                                (product.totalQuantity || 0) > 0 ? 'var(--warning)' : 'var(--danger)'
                                        }}>
                                            {product.totalQuantity || 0}
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
                onClose={() => setIsModalOpen(false)}
                editProduct={editingProduct}
            />

            {isImportModalOpen && (
                <ExcelImport
                    onClose={() => setIsImportModalOpen(false)}
                    onDataLoaded={handleExcelDataLoaded}
                />
            )}
        </div>
    );
};

export default Inventory;
