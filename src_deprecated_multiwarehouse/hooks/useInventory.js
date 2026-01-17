import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    writeBatch,
    query,
    orderBy
} from 'firebase/firestore';

// Collections names
const COLLECTIONS = {
    PRODUCTS: 'products',
    MOVEMENTS: 'movements',
    PURCHASES: 'purchases',
    PROVIDERS: 'providers',
    BRANDS: 'brands',
    CATEGORIES: 'categories',
    SALES: 'sales',
    WAREHOUSES: 'warehouses'
};

export const useInventory = () => {
    const [products, setProducts] = useState([]);
    const [movements, setMovements] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [providers, setProviders] = useState([]);
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [sales, setSales] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Real-time listeners for all collections
    useEffect(() => {
        const unsubscribers = [];

        // Products listener
        const productsQuery = query(collection(db, COLLECTIONS.PRODUCTS));
        unsubscribers.push(onSnapshot(productsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(data);
        }));

        // Movements listener
        const movementsQuery = query(collection(db, COLLECTIONS.MOVEMENTS), orderBy('date', 'desc'));
        unsubscribers.push(onSnapshot(movementsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMovements(data);
        }));

        // Purchases listener
        const purchasesQuery = query(collection(db, COLLECTIONS.PURCHASES), orderBy('date', 'desc'));
        unsubscribers.push(onSnapshot(purchasesQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPurchases(data);
        }));

        // Providers listener
        unsubscribers.push(onSnapshot(collection(db, COLLECTIONS.PROVIDERS), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProviders(data);
        }));

        // Brands listener
        unsubscribers.push(onSnapshot(collection(db, COLLECTIONS.BRANDS), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBrands(data);
        }));

        // Categories listener
        unsubscribers.push(onSnapshot(collection(db, COLLECTIONS.CATEGORIES), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCategories(data);
        }));

        // Sales listener
        const salesQuery = query(collection(db, COLLECTIONS.SALES), orderBy('createdAt', 'desc'));
        unsubscribers.push(onSnapshot(salesQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSales(data);
            setLoading(false);
        }));

        // Warehouses listener
        const warehousesQuery = query(collection(db, COLLECTIONS.WAREHOUSES));
        unsubscribers.push(onSnapshot(warehousesQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWarehouses(data);
        }));

        // Cleanup listeners on unmount
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, []);

    // Add a single product
    const addProduct = async (product) => {
        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
                ...product,
                createdAt: new Date().toISOString()
            });
            return { id: docRef.id, ...product };
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    };

    // Update a product
    const updateProduct = async (id, updatedData) => {
        try {
            await updateDoc(doc(db, COLLECTIONS.PRODUCTS, id), updatedData);
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    };

    // Delete a product
    const deleteProduct = async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id));
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    };

    // Clear all products
    const clearAllProducts = async () => {
        try {
            const batch = writeBatch(db);
            const snapshot = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
            snapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        } catch (error) {
            console.error('Error clearing products:', error);
            throw error;
        }
    };

    // Add provider
    const addProvider = async (provider) => {
        try {
            await addDoc(collection(db, COLLECTIONS.PROVIDERS), {
                ...provider,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error adding provider:', error);
            throw error;
        }
    };

    // Add a single brand
    const addBrand = async (brand) => {
        try {
            await addDoc(collection(db, COLLECTIONS.BRANDS), {
                ...brand,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error adding brand:', error);
            throw error;
        }
    };

    // Add multiple brands
    const addBrands = async (newBrandsList) => {
        try {
            const batch = writeBatch(db);
            newBrandsList.forEach(brand => {
                const docRef = doc(collection(db, COLLECTIONS.BRANDS));
                batch.set(docRef, { ...brand, createdAt: new Date().toISOString() });
            });
            await batch.commit();
        } catch (error) {
            console.error('Error adding brands:', error);
            throw error;
        }
    };

    // Add a single category
    const addCategory = async (category) => {
        try {
            await addDoc(collection(db, COLLECTIONS.CATEGORIES), {
                ...category,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error adding category:', error);
            throw error;
        }
    };

    // Add multiple categories
    const addCategories = async (newCategoriesList) => {
        try {
            const batch = writeBatch(db);
            newCategoriesList.forEach(cat => {
                const docRef = doc(collection(db, COLLECTIONS.CATEGORIES));
                batch.set(docRef, { ...cat, createdAt: new Date().toISOString() });
            });
            await batch.commit();
        } catch (error) {
            console.error('Error adding categories:', error);
            throw error;
        }
    };

    // ============ WAREHOUSES CRUD ============

    // Add warehouse
    const addWarehouse = async (warehouseData) => {
        try {
            await addDoc(collection(db, COLLECTIONS.WAREHOUSES), {
                ...warehouseData,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error adding warehouse:', error);
            throw error;
        }
    };

    // Update warehouse
    const updateWarehouse = async (id, updatedData) => {
        try {
            await updateDoc(doc(db, COLLECTIONS.WAREHOUSES, id), updatedData);
        } catch (error) {
            console.error('Error updating warehouse:', error);
            throw error;
        }
    };

    // Delete warehouse
    const deleteWarehouse = async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTIONS.WAREHOUSES, id));
        } catch (error) {
            console.error('Error deleting warehouse:', error);
            throw error;
        }
    };

    // ============ PURCHASES & SALES (Multi-Warehouse) ============

    // Add movement (generic inventory control)
    const addMovement = async (movement) => {
        try {
            await addDoc(collection(db, COLLECTIONS.MOVEMENTS), {
                ...movement,
                date: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error adding movement:', error);
            throw error;
        }
    };

    // Add purchase batch (updates stock in destination warehouse)
    const addPurchase = async (purchaseBatch) => {
        try {
            const batch = writeBatch(db);

            // Add each purchase to purchases collection
            purchaseBatch.forEach(purchase => {
                const purchaseRef = doc(collection(db, COLLECTIONS.PURCHASES));
                batch.set(purchaseRef, {
                    ...purchase,
                    date: new Date().toISOString()
                });
            });

            // Update product stock by warehouse
            purchaseBatch.forEach(purchase => {
                const product = products.find(p => p.id === purchase.productId);
                if (!product) return;

                const currentStock = product.stockByWarehouse || {};
                const warehouseStock = currentStock[purchase.warehouseId] || 0;
                const newWarehouseStock = warehouseStock + parseInt(purchase.quantity);

                const newStockByWarehouse = {
                    ...currentStock,
                    [purchase.warehouseId]: newWarehouseStock
                };

                const newTotalQuantity = Object.values(newStockByWarehouse).reduce((sum, qty) => sum + parseInt(qty || 0), 0);

                const productRef = doc(db, COLLECTIONS.PRODUCTS, purchase.productId);
                batch.update(productRef, {
                    stockByWarehouse: newStockByWarehouse,
                    totalQuantity: newTotalQuantity
                });
            });

            await batch.commit();
        } catch (error) {
            console.error('Error adding purchase:', error);
            throw error;
        }
    };

    // Add sale (decrements stock from source warehouse)
    const addSale = async (sale) => {
        try {
            const batch = writeBatch(db);

            // Add sale to sales collection
            const saleRef = doc(collection(db, COLLECTIONS.SALES));
            batch.set(saleRef, {
                ...sale,
                date: new Date().toISOString()
            });

            // Update product stock (decrement from warehouse)
            const product = products.find(p => p.id === sale.productId);
            if (!product) {
                throw new Error('Product not found');
            }

            const currentStock = product.stockByWarehouse || {};
            const warehouseStock = currentStock[sale.warehouseId] || 0;

            if (warehouseStock < parseInt(sale.quantity)) {
                throw new Error(`Stock insuficiente en almacén. Disponible: ${warehouseStock}, Solicitado: ${sale.quantity}`);
            }

            const newWarehouseStock = warehouseStock - parseInt(sale.quantity);
            const newStockByWarehouse = {
                ...currentStock,
                [sale.warehouseId]: newWarehouseStock
            };

            const newTotalQuantity = Object.values(newStockByWarehouse).reduce((sum, qty) => sum + parseInt(qty || 0), 0);

            const productRef = doc(db, COLLECTIONS.PRODUCTS, sale.productId);
            batch.update(productRef, {
                stockByWarehouse: newStockByWarehouse,
                totalQuantity: newTotalQuantity
            });

            await batch.commit();
        } catch (error) {
            console.error('Error adding sale:', error);
            throw error;
        }
    };

    // Delete sale
    const deleteSale = async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTIONS.SALES, id));
        } catch (error) {
            console.error('Error deleting sale:', error);
            throw error;
        }
    };

    // Add multiple products
    const addProducts = async (newProductsList) => {
        try {
            const batch = writeBatch(db);
            newProductsList.forEach(prod => {
                const docRef = doc(collection(db, COLLECTIONS.PRODUCTS));
                batch.set(docRef, { ...prod, createdAt: new Date().toISOString() });
            });
            await batch.commit();
        } catch (error) {
            console.error('Error adding products:', error);
            throw error;
        }
    };

    // Process movements and update product quantities
    const processBatchMovements = async (movementsList) => {
        try {
            const batch = writeBatch(db);

            for (const movement of movementsList) {
                const { productId, type, quantity, location, reason } = movement;
                const product = products.find(p => p.id === productId);

                if (!product) continue;

                let newQuantity = product.quantity;
                if (type === 'Entrada') {
                    newQuantity += quantity;
                } else if (type === 'Salida') {
                    newQuantity -= quantity;
                } else if (type === 'Ajuste') {
                    newQuantity = quantity;
                }

                let newStatus = 'In Stock';
                if (newQuantity === 0) newStatus = 'Out of Stock';
                else if (newQuantity < 10) newStatus = 'Low Stock';

                // Update product
                const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
                batch.update(productRef, {
                    quantity: newQuantity,
                    location: location || product.location,
                    status: newStatus
                });

                // Add movement record
                const movementRef = doc(collection(db, COLLECTIONS.MOVEMENTS));
                batch.set(movementRef, {
                    productId,
                    productName: product.description,
                    sku: product.sku,
                    type,
                    quantity: type === 'Ajuste' ? quantity : Math.abs(quantity),
                    previousQuantity: product.quantity,
                    newQuantity,
                    date: new Date().toISOString(),
                    location: location || product.location,
                    reason
                });
            }

            await batch.commit();
        } catch (error) {
            console.error('Error processing movements:', error);
            throw error;
        }
    };

    // Get stats
    const getStats = () => {
        const totalProducts = products.length;
        const totalValue = products.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.quantity || 0)), 0);
        const lowStock = products.filter(p => p.quantity < 15 && p.quantity > 0).length;
        const outOfStock = products.filter(p => p.quantity === 0).length;

        return { totalProducts, totalValue, lowStock, outOfStock };
    };

    // Migrate SKU format (if needed)
    const migrateSKUFormat = async () => {
        let migratedCount = 0;
        const batch = writeBatch(db);

        products.forEach(product => {
            const oldSku = product.sku || '';
            const oldFormatRegex = /^([A-Z]{3})(\d{3})-(\d{3})$/;
            const match = oldSku.match(oldFormatRegex);

            if (match) {
                const brandCode = match[1];
                const catCode = match[2];
                const sequence = match[3];
                const newSku = `${brandCode}-${catCode}-${sequence}`;

                batch.update(doc(db, COLLECTIONS.PRODUCTS, product.id), { sku: newSku });
                migratedCount++;
            }
        });

        if (migratedCount > 0) {
            await batch.commit();
        }

        return migratedCount;
    };

    // Migrate Products to Multi-Warehouse Schema
    const migrateToMultiWarehouse = async () => {
        try {
            console.log('🔄 Starting multi-warehouse migration...');

            // Get or create default warehouse
            let defaultWarehouse = warehouses.find(w => w.active !== false);

            if (!defaultWarehouse) {
                // Create default warehouse if none exists
                console.log('Creating default warehouse...');
                const warehouseRef = await addDoc(collection(db, COLLECTIONS.WAREHOUSES), {
                    name: 'Almacén Principal',
                    location: 'Principal',
                    manager: '',
                    active: true,
                    createdAt: new Date().toISOString()
                });
                defaultWarehouse = { id: warehouseRef.id, name: 'Almacén Principal' };
            }

            const batch = writeBatch(db);
            let migratedCount = 0;

            products.forEach(product => {
                // Check if already migrated
                if (product.stockByWarehouse) {
                    console.log(`✓ Product ${product.sku} already migrated`);
                    return;
                }

                // Migrate: Convert quantity to stockByWarehouse
                const currentQty = parseInt(product.quantity) || 0;
                const stockByWarehouse = {
                    [defaultWarehouse.id]: currentQty
                };

                const updateData = {
                    stockByWarehouse,
                    totalQuantity: currentQty,
                    // Keep original quantity for reference during transition
                    _oldQuantity: product.quantity,
                    _migratedAt: new Date().toISOString()
                };

                batch.update(doc(db, COLLECTIONS.PRODUCTS, product.id), updateData);
                migratedCount++;
                console.log(`✓ Migrated ${product.sku}: ${currentQty} → ${defaultWarehouse.name}`);
            });

            if (migratedCount > 0) {
                await batch.commit();
                console.log(`✅ Migration complete! ${migratedCount} products migrated to multi-warehouse`);
            } else {
                console.log('ℹ️ No products needed migration');
            }

            return {
                success: true,
                migratedCount,
                defaultWarehouse: defaultWarehouse.name
            };
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    };

    return {
        products,
        movements,
        purchases,
        providers,
        brands,
        categories,
        sales,
        warehouses,
        loading,
        addProduct,
        updateProduct,
        deleteProduct,
        clearAllProducts,
        addMovement,
        addPurchase,
        addProvider,
        addBrand,
        addBrands,
        addCategory,
        addCategories,
        addProducts,
        addSale,
        deleteSale,
        addWarehouse,
        updateWarehouse,
        deleteWarehouse,
        getStats,
        migrateSKUFormat,
        migrateToMultiWarehouse
    };
};
