import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, Filter } from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import ProductForm from './ProductForm';

const Inventory = () => {
    const { products, deleteProduct } = useInventoryContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const filteredProducts = products.filter(product =>
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.reference.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddProduct = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Módulo de Productos</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Gestión de inventario y catálogo de productos.</p>
                </div>
                <button className="btn btn-primary" onClick={handleAddProduct}>
                    <Plus size={20} /> Nuevo Producto
                </button>
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
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SKU</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Referencia</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Descripción</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Categoría</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Marca</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Ubicación</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Existencia</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => (
                                <tr key={product.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="hover:bg-slate-800">
                                    <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{product.sku}</td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{product.reference}</td>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{product.description}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{product.category}</td>
                                    <td style={{ padding: '1rem' }}>{product.brand}</td>
                                    <td style={{ padding: '1rem' }}>{product.location}</td>
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
                onClose={() => setIsModalOpen(false)}
                editProduct={editingProduct}
            />
        </div>
    );
};

export default Inventory;
