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
    orderBy,
    where
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
    CUSTOMERS: 'customers',
    PAYMENTS: 'payments',
    CASH_SESSIONS: 'cashSessions',
    CASH_TRANSACTIONS: 'cashTransactions',
    AUTH_REQUESTS: 'authorizationRequests',
    CREDIT_NOTES: 'creditNotes'
};

export const useInventory = (companyId) => {
    const [products, setProducts] = useState([]);
    const [movements, setMovements] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [providers, setProviders] = useState([]);
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [sales, setSales] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cash Register states
    const [cashSession, setCashSession] = useState(null);
    const [cashTransactions, setCashTransactions] = useState([]);
    const [authRequests, setAuthRequests] = useState([]);
    const [creditNotes, setCreditNotes] = useState([]);

    // Real-time listeners for all collections (filtered by companyId)
    useEffect(() => {
        if (!companyId) {
            setProducts([]);
            setMovements([]);
            setPurchases([]);
            setPurchases([]);
            setProviders([]);
            setSales([]);
            setCustomers([]);
            setLoading(false);
            return;
        }

        const unsubscribers = [];

        // Products listener (filtered by companyId)
        const productsQuery = query(
            collection(db, COLLECTIONS.PRODUCTS),
            where('companyId', '==', companyId)
        );
        unsubscribers.push(onSnapshot(productsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(data);
        }));

        // Movements listener (filtered by companyId)
        const movementsQuery = query(
            collection(db, COLLECTIONS.MOVEMENTS),
            where('companyId', '==', companyId)
        );
        unsubscribers.push(onSnapshot(movementsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort client-side since we can't combine where + orderBy without index
            data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setMovements(data);
        }));

        // Purchases listener (filtered by companyId)
        const purchasesQuery = query(
            collection(db, COLLECTIONS.PURCHASES),
            where('companyId', '==', companyId)
        );
        unsubscribers.push(onSnapshot(purchasesQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setPurchases(data);
        }));

        // Providers listener (filtered by companyId)
        const providersQuery = query(
            collection(db, COLLECTIONS.PROVIDERS),
            where('companyId', '==', companyId)
        );
        unsubscribers.push(onSnapshot(providersQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProviders(data);
        }));

        // Brands listener (GLOBAL - no companyId filter)
        unsubscribers.push(onSnapshot(collection(db, COLLECTIONS.BRANDS), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBrands(data);
        }));

        // Categories listener (GLOBAL - no companyId filter)
        unsubscribers.push(onSnapshot(collection(db, COLLECTIONS.CATEGORIES), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCategories(data);
        }));

        // Sales listener (filtered by companyId)
        const salesQuery = query(
            collection(db, COLLECTIONS.SALES),
            where('companyId', '==', companyId)
        );
        unsubscribers.push(onSnapshot(salesQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setSales(data);
            setLoading(false);
        }));

        // Customers listener (filtered by companyId)
        const customersQuery = query(
            collection(db, COLLECTIONS.CUSTOMERS),
            where('companyId', '==', companyId)
        );
        unsubscribers.push(onSnapshot(customersQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => a.name.localeCompare(b.name));
            setCustomers(data);
        }));

        // Cash Session listener (active session for this company)
        const cashSessionQuery = query(
            collection(db, COLLECTIONS.CASH_SESSIONS),
            where('companyId', '==', companyId),
            where('status', 'in', ['open', 'pending_verification'])
        );
        unsubscribers.push(onSnapshot(cashSessionQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Take the most recent open session
            setCashSession(data.length > 0 ? data[0] : null);
        }));

        // Cash Transactions listener (for current session)
        const cashTxQuery = query(
            collection(db, COLLECTIONS.CASH_TRANSACTIONS),
            where('companyId', '==', companyId)
        );
        unsubscribers.push(onSnapshot(cashTxQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setCashTransactions(data);
        }));

        // Authorization Requests listener
        const authQuery = query(
            collection(db, COLLECTIONS.AUTH_REQUESTS),
            where('companyId', '==', companyId),
            where('status', '==', 'pending')
        );
        unsubscribers.push(onSnapshot(authQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
            setAuthRequests(data);
        }));

        // Credit Notes listener
        const creditNotesQuery = query(
            collection(db, COLLECTIONS.CREDIT_NOTES),
            where('companyId', '==', companyId)
        );
        unsubscribers.push(onSnapshot(creditNotesQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setCreditNotes(data);
        }));

        // Cleanup listeners on unmount or companyId change
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [companyId]);

    // Auto-cleanup expired quotes (runs once on load)
    useEffect(() => {
        const cleanupExpiredQuotes = async () => {
            if (!companyId) return;

            const now = new Date();
            const expiredSales = sales.filter(sale =>
                sale.isQuote &&
                sale.expiresAt &&
                new Date(sale.expiresAt) < now &&
                sale.paymentStatus === 'pending_payment'
            );

            if (expiredSales.length > 0) {
                console.log(`Cleaning up ${expiredSales.length} expired quotes...`);
                const batch = writeBatch(db);

                expiredSales.forEach(sale => {
                    const saleRef = doc(db, COLLECTIONS.SALES, sale.id);
                    batch.update(saleRef, {
                        paymentStatus: 'expired',
                        expiredAt: new Date().toISOString()
                    });
                });

                try {
                    await batch.commit();
                    console.log('Expired quotes cleaned up successfully');
                } catch (error) {
                    console.error('Error cleaning up expired quotes:', error);
                }
            }
        };

        // Run cleanup when sales are loaded
        if (sales.length > 0) {
            cleanupExpiredQuotes();
        }
    }, [sales, companyId]);

    // Add a single product (with companyId)
    const addProduct = async (product) => {
        if (!companyId) throw new Error('No hay empresa seleccionada');
        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
                ...product,
                companyId,
                createdAt: new Date().toISOString()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    };

    // Add multiple products at once (with companyId)
    const addProducts = async (productsList, brandsToAdd = [], categoriesToAdd = []) => {
        if (!companyId) throw new Error('No hay empresa seleccionada');
        try {
            const batch = writeBatch(db);

            // Add brands (global - no companyId)
            for (const brand of brandsToAdd) {
                const brandRef = doc(collection(db, COLLECTIONS.BRANDS));
                batch.set(brandRef, brand);
            }

            // Add categories (global - no companyId)
            for (const category of categoriesToAdd) {
                const categoryRef = doc(collection(db, COLLECTIONS.CATEGORIES));
                batch.set(categoryRef, category);
            }

            // Add products (with companyId)
            for (const product of productsList) {
                const productRef = doc(collection(db, COLLECTIONS.PRODUCTS));
                batch.set(productRef, {
                    ...product,
                    companyId,
                    createdAt: new Date().toISOString()
                });
            }

            await batch.commit();
            return { success: true, count: productsList.length };
        } catch (error) {
            console.error('Error adding products:', error);
            throw error;
        }
    };

    // Update product
    const updateProduct = async (productId, data) => {
        try {
            await updateDoc(doc(db, COLLECTIONS.PRODUCTS, productId), data);
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    };

    // Delete product
    const deleteProduct = async (productId) => {
        try {
            await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    };

    // Add provider (with companyId)
    const addProvider = async (provider) => {
        if (!companyId) throw new Error('No hay empresa seleccionada');
        try {
            await addDoc(collection(db, COLLECTIONS.PROVIDERS), {
                ...provider,
                companyId,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error adding provider:', error);
            throw error;
        }
    };

    // Update provider (and cascade to purchases)
    const updateProvider = async (providerId, data) => {
        try {
            const batch = writeBatch(db);

            // 1. Update the provider itself
            const providerRef = doc(db, COLLECTIONS.PROVIDERS, providerId);
            batch.update(providerRef, {
                ...data,
                updatedAt: new Date().toISOString()
            });

            // 2. If name changed, update all related purchases
            if (data.name) {
                // Find all purchases with this providerId
                const relatedPurchases = purchases.filter(p => String(p.providerId) === String(providerId));

                relatedPurchases.forEach(purchase => {
                    const purchaseRef = doc(db, COLLECTIONS.PURCHASES, purchase.id);
                    batch.update(purchaseRef, { providerName: data.name });
                });

                console.log(`Updating ${relatedPurchases.length} purchases with new provider name`);
            }

            await batch.commit();
        } catch (error) {
            console.error('Error updating provider:', error);
            throw error;
        }
    };

    // Add brand (global)
    const addBrand = async (brand) => {
        try {
            await addDoc(collection(db, COLLECTIONS.BRANDS), brand);
        } catch (error) {
            console.error('Error adding brand:', error);
            throw error;
        }
    };

    // Update category and cascade changes to products
    const updateCategory = async (categoryId, oldName, newName) => {
        try {
            const batch = writeBatch(db);

            // 1. Update category doc
            const catRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
            batch.update(catRef, { name: newName });

            // 2. Cascade update to products if using same companyId (or all if global)
            // Since we're in the hook with companyId context, we should ideally restrict this?
            // BUT categories are GLOBAL as per valid code analysis (no companyId on categories).
            // However, products ARE scoped by companyId.
            // Let's search all products in the current company that use this category name.

            if (companyId) {
                const q = query(
                    collection(db, COLLECTIONS.PRODUCTS),
                    where('companyId', '==', companyId),
                    where('category', '==', oldName)
                );
                const snapshot = await getDocs(q);

                snapshot.docs.forEach(doc => {
                    batch.update(doc.ref, { category: newName });
                });
            }

            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error('Error updating category:', error);
            throw error;
        }
    };

    // Delete category
    const deleteCategory = async (categoryId) => {
        try {
            await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, categoryId));
        } catch (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    };

    // Add multiple brands (global)
    const addBrands = async (brandsList) => {
        try {
            const batch = writeBatch(db);
            brandsList.forEach(brand => {
                const brandRef = doc(collection(db, COLLECTIONS.BRANDS));
                batch.set(brandRef, brand);
            });
            await batch.commit();
        } catch (error) {
            console.error('Error adding brands:', error);
            throw error;
        }
    };

    // Add category (global)
    const addCategory = async (category) => {
        try {
            await addDoc(collection(db, COLLECTIONS.CATEGORIES), category);
        } catch (error) {
            console.error('Error adding category:', error);
            throw error;
        }
    };

    // Add multiple categories (global)
    const addCategories = async (categoriesList) => {
        try {
            const batch = writeBatch(db);
            categoriesList.forEach(category => {
                const categoryRef = doc(collection(db, COLLECTIONS.CATEGORIES));
                batch.set(categoryRef, category);
            });
            await batch.commit();
        } catch (error) {
            console.error('Error adding categories:', error);
            throw error;
        }
    };

    // Add sale (with companyId) - DOES NOT AFFECT INVENTORY
    // Inventory is affected when payment is processed in Cash Register
    const addSale = async (saleData, userName = 'Sistema') => {
        if (!companyId) throw new Error('No hay empresa seleccionada');
        try {
            const items = Array.isArray(saleData) ? saleData : [saleData];
            const batch = writeBatch(db);
            const saleIds = [];

            items.forEach(item => {
                const saleRef = doc(collection(db, COLLECTIONS.SALES));
                saleIds.push(saleRef.id);
                batch.set(saleRef, {
                    ...item,
                    companyId,
                    // Mark as pending payment - inventory not yet affected
                    paymentStatus: 'pending_payment',
                    inventoryAffected: false,
                    paymentProcessedAt: null,
                    paymentProcessedBy: null,
                    createdBy: userName,
                    createdAt: new Date().toISOString()
                });
            });

            await batch.commit();

            // NOTE: Inventory is NOT affected here
            // It will be affected when cashier processes payment in CashRegister module

            return { success: true, saleIds };
        } catch (error) {
            console.error('Error adding sale:', error);
            throw error;
        }
    };

    // Delete sale
    const deleteSale = async (saleId, userName = 'Sistema') => {
        try {
            const sale = sales.find(s => s.id === saleId);
            if (!sale) return;

            // Revert inventory
            const revertMovement = {
                productId: sale.productId,
                type: 'Entrada',
                quantity: parseInt(sale.quantity),
                location: '',
                reason: `Reversión de Venta/Egreso: ${sale.sku}`,
                userName: userName
            };

            await processBatchMovements([revertMovement]);
            await deleteDoc(doc(db, COLLECTIONS.SALES, saleId));
        } catch (error) {
            console.error('Error deleting sale:', error);
            throw error;
        }
    };

    // Delete purchases by date
    const deletePurchasesByDate = async (date) => {
        try {
            const dailyPurchases = purchases.filter(p => p.date.startsWith(date));

            if (dailyPurchases.length === 0) return;

            const batch = writeBatch(db);

            dailyPurchases.forEach(purchase => {
                const purchaseRef = doc(db, COLLECTIONS.PURCHASES, purchase.id);
                batch.delete(purchaseRef);
            });

            await batch.commit();
        } catch (error) {
            console.error('Error deleting purchases:', error);
            throw error;
        }
    };

    // Process movements and update product quantities (with companyId)
    const processBatchMovements = async (movementsList) => {
        if (!companyId) throw new Error('No hay empresa seleccionada');
        try {
            const batch = writeBatch(db);

            for (const movement of movementsList) {
                const { productId, type, quantity, location, reason } = movement;
                const product = products.find(p => String(p.id) === String(productId));

                if (!product) {
                    console.error(`Product not found: ${productId}`);
                    continue;
                }

                // Initialize newQuantity from current product quantity
                let newQuantity = product.quantity || 0;

                // Only update product quantity if movement is approved (or legacy undefined)
                if (type !== 'Ajuste' && (!movement.status || movement.status === 'approved')) {
                    if (type === 'Entrada') {
                        newQuantity += quantity;
                    } else if (type === 'Salida') {
                        newQuantity -= quantity;
                    }
                } else if (type === 'Ajuste' && (!movement.status || movement.status === 'approved')) {
                    newQuantity = quantity;
                }

                let newStatus = 'In Stock';
                if (newQuantity === 0) newStatus = 'Out of Stock';
                else if (newQuantity < 10) newStatus = 'Low Stock';

                // Update product (only if approved or legacy)
                if (!movement.status || movement.status === 'approved') {
                    const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
                    batch.update(productRef, {
                        quantity: newQuantity,
                        location: location || product.location,
                        status: newStatus
                    });
                }

                // Add movement record (with companyId)
                const movementRef = doc(collection(db, COLLECTIONS.MOVEMENTS));
                batch.set(movementRef, {
                    productId,
                    productName: product.description,
                    sku: product.sku,
                    type,
                    quantity,
                    previousQty: product.quantity || 0,
                    newQty: newQuantity, // This shows what the qty BECAME
                    location: location || product.location,
                    reason,
                    companyId,
                    date: new Date().toISOString(),
                    status: movement.status || 'approved', // Default to approved for legacy/admin
                    createdBy: movement.userName || 'Sistema'
                });
            }

            await batch.commit();
        } catch (error) {
            console.error('Error processing movements:', error);
            throw error;
        }
    };

    // Add movement
    const addMovement = async (movementData) => {
        try {
            const movement = {
                productId: movementData.productId,
                type: movementData.type,
                quantity: parseInt(movementData.quantity),
                location: movementData.location || '',
                reason: movementData.reason || '',
                status: movementData.status || 'approved',
                userId: movementData.userId,
                userName: movementData.userName
            };

            await processBatchMovements([movement]);
        } catch (error) {
            console.error('Error adding movement:', error);
            throw error;
        }
    };

    // Approve movement
    const approveMovement = async (movement) => {
        if (!companyId) throw new Error('No hay empresa seleccionada');
        try {
            const batch = writeBatch(db);

            // 1. Update movement status
            const movementRef = doc(db, COLLECTIONS.MOVEMENTS, movement.id);
            batch.update(movementRef, { status: 'approved' });

            // 2. Update product quantity
            const productRef = doc(db, COLLECTIONS.PRODUCTS, movement.productId);
            const productDoc = await getDocs(query(collection(db, COLLECTIONS.PRODUCTS), where('__name__', '==', movement.productId)));

            // We need to fetch current product to calculate new qty
            // Actually, we can just use the logic from processBatchMovements but for a single item update
            // But processBatchMovements ADDS a movement. We are UPDATING an existing one.
            // So we must manually update the product here.

            // Re-fetch product to get current quantity
            // Since we can't easily re-use processBatchMovements without adding a NEW movement doc,
            // we will implement the stock update logic here.

            // Note: In a real app we would use a Transaction for safety.
            // For now, we'll read and write in batch (optimistic).

            const product = products.find(p => p.id === movement.productId);
            if (!product) throw new Error('Producto no encontrado');

            let newQuantity = product.quantity || 0;
            const qty = parseInt(movement.quantity);

            if (movement.type === 'Entrada') {
                newQuantity += qty;
            } else if (movement.type === 'Salida') {
                newQuantity -= qty;
            } else if (movement.type === 'Ajuste') {
                newQuantity = qty;
            }

            let newStatus = 'In Stock';
            if (newQuantity === 0) newStatus = 'Out of Stock';
            else if (newQuantity < 10) newStatus = 'Low Stock';

            batch.update(productRef, {
                quantity: newQuantity,
                status: newStatus
            });

            // Also update the movement with the newQty resulting from this approval
            batch.update(movementRef, {
                newQty: newQuantity,
                previousQty: product.quantity || 0,
                approvedAt: new Date().toISOString()
            });

            await batch.commit();
        } catch (error) {
            console.error('Error approving movement:', error);
            throw error;
        }
    };

    // Reject movement
    const rejectMovement = async (movementId) => {
        try {
            await updateDoc(doc(db, COLLECTIONS.MOVEMENTS, movementId), {
                status: 'rejected',
                rejectedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error rejecting movement:', error);
            throw error;
        }
    };

    // Add purchase (with companyId)
    const addPurchase = async (purchaseData, userName = 'Sistema') => {
        if (!companyId) throw new Error('No hay empresa seleccionada');
        try {
            const items = Array.isArray(purchaseData) ? purchaseData : [purchaseData];

            const batch = writeBatch(db);

            items.forEach(item => {
                const purchaseRef = doc(collection(db, COLLECTIONS.PURCHASES));
                batch.set(purchaseRef, {
                    ...item,
                    companyId,
                    date: new Date().toISOString()
                });
            });

            await batch.commit();

            // Process movements
            const movementsToProcess = items.map(item => ({
                productId: String(item.productId),
                type: 'Entrada',
                quantity: parseInt(item.quantity),
                location: '',
                reason: `Compra: ${item.providerName} - Factura #${item.invoiceNumber}`,
                userName: userName
            }));

            await processBatchMovements(movementsToProcess);
        } catch (error) {
            console.error('Error in addPurchase:', error);
            throw error;
        }
    };

    // Add customer (with companyId)
    const addCustomer = async (customer) => {
        if (!companyId) throw new Error('No hay empresa seleccionada');
        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.CUSTOMERS), {
                ...customer,
                companyId,
                createdAt: new Date().toISOString()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding customer:', error);
            throw error;
        }
    };

    // Update customer
    const updateCustomer = async (customerId, data) => {
        try {
            await updateDoc(doc(db, COLLECTIONS.CUSTOMERS, customerId), {
                ...data,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating customer:', error);
            throw error;
        }
    };

    // Delete customer
    const deleteCustomer = async (customerId) => {
        try {
            await deleteDoc(doc(db, COLLECTIONS.CUSTOMERS, customerId));
        } catch (error) {
            console.error('Error deleting customer:', error);
            throw error;
        }
    };

    // Add payment to a sale (for accounts receivable)
    const addPayment = async (paymentData) => {
        if (!companyId) throw new Error('No hay empresa seleccionada');

        const { saleId, customerId, amount, paymentMethod, notes } = paymentData;

        try {
            // First, record the payment
            await addDoc(collection(db, COLLECTIONS.PAYMENTS), {
                saleId,
                customerId,
                amount,
                paymentMethod,
                notes: notes || '',
                companyId,
                createdAt: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0]
            });

            // Then, update the sale with the new payment info
            const sale = sales.find(s => s.id === saleId);
            if (sale) {
                const currentPaid = sale.paidAmount || 0;
                const newPaidAmount = currentPaid + amount;
                const saleTotal = sale.amountUSD || 0;
                const newRemaining = Math.max(0, saleTotal - newPaidAmount);
                const newStatus = newRemaining <= 0.01 ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'pending');

                await updateDoc(doc(db, COLLECTIONS.SALES, saleId), {
                    paidAmount: newPaidAmount,
                    remainingAmount: newRemaining,
                    status: newStatus,
                    lastPaymentDate: new Date().toISOString()
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error adding payment:', error);
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

    // Migrate SKU format
    const migrateSKUFormat = async () => {
        try {
            const batch = writeBatch(db);
            let migratedCount = 0;

            products.forEach(product => {
                if (product.sku && product.sku.includes('--')) {
                    const parts = product.sku.split('-');
                    if (parts.length >= 3) {
                        const brandPart = parts[0].toUpperCase().substring(0, 3);
                        const categoryPart = parts[1].padStart(3, '0');
                        const seriesPart = parts.slice(2).join('-');
                        const newSku = `${brandPart}-${categoryPart}-${seriesPart}`;

                        if (newSku !== product.sku) {
                            const productRef = doc(db, COLLECTIONS.PRODUCTS, product.id);
                            batch.update(productRef, { sku: newSku });
                            migratedCount++;
                        }
                    }
                }
            });

            if (migratedCount > 0) {
                await batch.commit();
            }

            return { success: true, migratedCount };
        } catch (error) {
            console.error('Error migrating SKUs:', error);
            throw error;
        }
    };

    // ============================================
    // CASH REGISTER FUNCTIONS
    // ============================================

    // Open cash session
    const openCashSession = async (openingBalance, userId, userName) => {
        if (!companyId) throw new Error('No hay empresa seleccionada');
        if (cashSession) throw new Error('Ya hay una caja abierta');

        try {
            const sessionData = {
                companyId,
                cashierId: userId,
                cashierName: userName,
                status: 'open',
                openedAt: new Date().toISOString(),
                closedAt: null,
                verifiedAt: null,
                openingBalance: {
                    USD: { cash: parseFloat(openingBalance.USD || 0) },
                    Bs: { cash: parseFloat(openingBalance.Bs || 0) }
                },
                closingBalance: null,
                expectedBalance: null,
                difference: null,
                verificationRequested: false,
                verifiedBy: null,
                verifierName: null,
                verificationNotes: null
            };

            const docRef = await addDoc(collection(db, COLLECTIONS.CASH_SESSIONS), sessionData);
            return { success: true, sessionId: docRef.id };
        } catch (error) {
            console.error('Error opening cash session:', error);
            throw error;
        }
    };

    // Close cash session (request verification)
    const closeCashSession = async (closingBalance) => {
        if (!cashSession) throw new Error('No hay caja abierta');

        try {
            // Calculate expected balance based on transactions
            const sessionTx = cashTransactions.filter(tx => tx.sessionId === cashSession.id);

            const expectedBalance = {
                USD: {
                    cash: cashSession.openingBalance.USD?.cash || 0,
                    punto: 0,
                    transferencia: 0,
                    zelle: 0
                },
                Bs: {
                    cash: cashSession.openingBalance.Bs?.cash || 0,
                    transferencia: 0,
                    pagoMovil: 0
                }
            };

            // Sum all transactions
            sessionTx.forEach(tx => {
                if (tx.payments) {
                    tx.payments.forEach(payment => {
                        const { method, amount, currency } = payment;
                        if (method === 'cash_usd') expectedBalance.USD.cash += amount;
                        else if (method === 'cash_bs') expectedBalance.Bs.cash += amount;
                        else if (method === 'punto') expectedBalance.USD.punto += amount;
                        else if (method === 'transfer_usd') expectedBalance.USD.transferencia += amount;
                        else if (method === 'transfer_bs') expectedBalance.Bs.transferencia += amount;
                        else if (method === 'zelle') expectedBalance.USD.zelle += amount;
                        else if (method === 'pago_movil') expectedBalance.Bs.pagoMovil += amount;
                    });
                }

                // Subtract expenses/withdrawals
                if (tx.type === 'expense' || tx.type === 'withdrawal' || tx.type === 'return') {
                    if (tx.currency === 'USD') expectedBalance.USD.cash -= tx.totalAmount;
                    else expectedBalance.Bs.cash -= tx.totalAmount;
                }
            });

            // Calculate difference
            const difference = {
                USD: {
                    cash: (parseFloat(closingBalance.USD?.cash) || 0) - expectedBalance.USD.cash
                },
                Bs: {
                    cash: (parseFloat(closingBalance.Bs?.cash) || 0) - expectedBalance.Bs.cash
                }
            };

            await updateDoc(doc(db, COLLECTIONS.CASH_SESSIONS, cashSession.id), {
                status: 'pending_verification',
                closedAt: new Date().toISOString(),
                closingBalance: {
                    USD: { cash: parseFloat(closingBalance.USD?.cash) || 0 },
                    Bs: { cash: parseFloat(closingBalance.Bs?.cash) || 0 }
                },
                expectedBalance,
                difference,
                verificationRequested: true,
                verificationRequestedAt: new Date().toISOString()
            });

            return { success: true, difference };
        } catch (error) {
            console.error('Error closing cash session:', error);
            throw error;
        }
    };

    // Verify cash session (admin only)
    const verifyCashSession = async (sessionId, verifierId, verifierName, notes = '') => {
        try {
            await updateDoc(doc(db, COLLECTIONS.CASH_SESSIONS, sessionId), {
                status: 'closed',
                verifiedAt: new Date().toISOString(),
                verifiedBy: verifierId,
                verifierName: verifierName,
                verificationNotes: notes
            });

            return { success: true };
        } catch (error) {
            console.error('Error verifying cash session:', error);
            throw error;
        }
    };

    // Process sale payment - THIS AFFECTS INVENTORY
    const processSalePayment = async (saleId, payments, userId, userName, exchangeRate) => {
        if (!companyId) throw new Error('No hay empresa seleccionada');
        if (!cashSession) throw new Error('No hay caja abierta');

        try {
            const batch = writeBatch(db);

            // Find the sale
            const sale = sales.find(s => s.id === saleId);
            if (!sale) throw new Error('Venta no encontrada');

            // Calculate total paid
            const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

            // Determine if full or partial payment
            const saleTotal = sale.amountUSD || 0;
            const previousPaid = sale.paidAmount || 0;
            const newPaidAmount = previousPaid + totalPaid;
            const remaining = Math.max(0, saleTotal - newPaidAmount);
            const isPaid = remaining <= 0.01;

            // Create cash transaction
            const txRef = doc(collection(db, COLLECTIONS.CASH_TRANSACTIONS));
            batch.set(txRef, {
                sessionId: cashSession.id,
                companyId,
                type: 'sale',
                saleId,
                customerId: sale.customerId || null,
                customerName: sale.customer?.name || 'Venta Rápida',
                documentType: sale.documentType || 'pedido',
                documentNumber: sale.documentNumber || '',
                description: `Cobro ${sale.documentType === 'factura' ? 'Factura' : 'Pedido'} #${sale.documentNumber}`,
                totalAmount: totalPaid,
                exchangeRate: exchangeRate || 1,
                payments: payments.map(p => ({
                    method: p.method,
                    amount: p.amount,
                    currency: p.currency || 'USD',
                    received: p.received || p.amount,
                    change: p.change || 0,
                    reference: p.reference || null,
                    bank: p.bank || null
                })),
                createdAt: new Date().toISOString(),
                createdBy: userId,
                createdByName: userName
            });

            // Update sale status
            const saleRef = doc(db, COLLECTIONS.SALES, saleId);
            const saleUpdate = {
                paymentStatus: isPaid ? 'paid' : 'partial',
                paidAmount: newPaidAmount,
                remainingAmount: remaining,
                paymentProcessedAt: new Date().toISOString(),
                paymentProcessedBy: userId,
                paymentProcessedByName: userName,
                lastPaymentDate: new Date().toISOString()
            };

            // If fully paid and inventory not yet affected, affect it now
            if (isPaid && !sale.inventoryAffected) {
                saleUpdate.inventoryAffected = true;
            }

            batch.update(saleRef, saleUpdate);

            await batch.commit();

            // NOW affect inventory if fully paid and not yet affected
            if (isPaid && !sale.inventoryAffected) {
                const movementsToProcess = [{
                    productId: String(sale.productId),
                    type: 'Salida',
                    quantity: parseInt(sale.quantity),
                    location: '',
                    reason: `Venta/Egreso: ${sale.description || sale.sku}`,
                    userName: userName
                }];

                await processBatchMovements(movementsToProcess);
            }

            return { success: true, isPaid, remaining };
        } catch (error) {
            console.error('Error processing sale payment:', error);
            throw error;
        }
    };

    // Process expense (requires authorization)
    const processExpense = async (expenseData, userId, userName) => {
        if (!companyId) throw new Error('No hay empresa seleccionada');
        if (!cashSession) throw new Error('No hay caja abierta');

        try {
            const { amount, currency, description, requiresAuth = true } = expenseData;

            if (requiresAuth) {
                // Create authorization request
                const authRef = await addDoc(collection(db, COLLECTIONS.AUTH_REQUESTS), {
                    companyId,
                    sessionId: cashSession.id,
                    type: 'expense',
                    amount,
                    currency,
                    reason: description,
                    status: 'pending',
                    requestedBy: userId,
                    requestedByName: userName,
                    requestedAt: new Date().toISOString(),
                    respondedBy: null,
                    respondedByName: null,
                    respondedAt: null,
                    responseNotes: null
                });

                return { success: true, requiresAuth: true, authId: authRef.id };
            } else {
                // Direct expense (already authorized)
                await addDoc(collection(db, COLLECTIONS.CASH_TRANSACTIONS), {
                    sessionId: cashSession.id,
                    companyId,
                    type: 'expense',
                    description,
                    totalAmount: amount,
                    currency,
                    payments: [],
                    createdAt: new Date().toISOString(),
                    createdBy: userId,
                    createdByName: userName
                });

                return { success: true };
            }
        } catch (error) {
            console.error('Error processing expense:', error);
            throw error;
        }
    };

    // Process withdrawal (requires authorization)
    const processWithdrawal = async (withdrawalData, userId, userName) => {
        if (!companyId) throw new Error('No hay empresa seleccionada');
        if (!cashSession) throw new Error('No hay caja abierta');

        try {
            const { amount, currency, reason } = withdrawalData;

            // Always requires authorization
            const authRef = await addDoc(collection(db, COLLECTIONS.AUTH_REQUESTS), {
                companyId,
                sessionId: cashSession.id,
                type: 'withdrawal',
                amount,
                currency,
                reason,
                status: 'pending',
                requestedBy: userId,
                requestedByName: userName,
                requestedAt: new Date().toISOString(),
                respondedBy: null,
                respondedByName: null,
                respondedAt: null,
                responseNotes: null
            });

            return { success: true, authId: authRef.id };
        } catch (error) {
            console.error('Error processing withdrawal:', error);
            throw error;
        }
    };

    // Approve authorization (admin/president only)
    const approveAuthorization = async (authId, approverId, approverName, notes = '') => {
        try {
            const authRequest = authRequests.find(a => a.id === authId);
            if (!authRequest) throw new Error('Solicitud no encontrada');

            const batch = writeBatch(db);

            // Update authorization status
            const authRef = doc(db, COLLECTIONS.AUTH_REQUESTS, authId);
            batch.update(authRef, {
                status: 'approved',
                respondedBy: approverId,
                respondedByName: approverName,
                respondedAt: new Date().toISOString(),
                responseNotes: notes
            });

            // Create the transaction
            const txRef = doc(collection(db, COLLECTIONS.CASH_TRANSACTIONS));
            batch.set(txRef, {
                sessionId: authRequest.sessionId,
                companyId: authRequest.companyId,
                type: authRequest.type,
                description: authRequest.reason,
                totalAmount: authRequest.amount,
                currency: authRequest.currency,
                authorizedBy: approverId,
                authorizedByName: approverName,
                payments: [],
                createdAt: new Date().toISOString(),
                createdBy: authRequest.requestedBy,
                createdByName: authRequest.requestedByName
            });

            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error('Error approving authorization:', error);
            throw error;
        }
    };

    // Reject authorization
    const rejectAuthorization = async (authId, rejecterId, rejecterName, notes = '') => {
        try {
            await updateDoc(doc(db, COLLECTIONS.AUTH_REQUESTS, authId), {
                status: 'rejected',
                respondedBy: rejecterId,
                respondedByName: rejecterName,
                respondedAt: new Date().toISOString(),
                responseNotes: notes
            });

            return { success: true };
        } catch (error) {
            console.error('Error rejecting authorization:', error);
            throw error;
        }
    };

    // Process return and generate credit note
    const processReturn = async (saleId, returnItems, reason, userId, userName) => {
        if (!companyId) throw new Error('No hay empresa seleccionada');
        if (!cashSession) throw new Error('No hay caja abierta');

        try {
            const sale = sales.find(s => s.id === saleId);
            if (!sale) throw new Error('Venta no encontrada');

            const batch = writeBatch(db);

            // Calculate credit note totals
            const subtotal = returnItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
            const ivaAmount = sale.hasIVA ? subtotal * 0.16 : 0;
            const total = subtotal + ivaAmount;

            // Generate credit note number
            const today = new Date().toISOString().split('T')[0];
            const todayNotes = creditNotes.filter(cn => cn.createdAt?.startsWith(today));
            const creditNoteNumber = `NC-${String(todayNotes.length + 1).padStart(6, '0')}`;

            // Create credit note
            const cnRef = doc(collection(db, COLLECTIONS.CREDIT_NOTES));
            batch.set(cnRef, {
                companyId,
                originalSaleId: saleId,
                originalDocumentNumber: sale.documentNumber,
                customerId: sale.customerId,
                customerName: sale.customer?.name || 'Cliente',
                customerRif: sale.customer?.rif || '',
                creditNoteNumber,
                items: returnItems,
                subtotal,
                iva: ivaAmount,
                total,
                status: 'processed',
                inventoryAffected: true,
                refundMethod: 'cash',
                refundAmount: total,
                refundCurrency: 'USD',
                reason,
                createdAt: new Date().toISOString(),
                createdBy: userId,
                createdByName: userName
            });

            // Create cash transaction for the refund
            const txRef = doc(collection(db, COLLECTIONS.CASH_TRANSACTIONS));
            batch.set(txRef, {
                sessionId: cashSession.id,
                companyId,
                type: 'return',
                saleId,
                creditNoteNumber,
                customerId: sale.customerId,
                customerName: sale.customer?.name || 'Cliente',
                documentType: 'nota_credito',
                documentNumber: creditNoteNumber,
                description: `Devolución - Nota de Crédito ${creditNoteNumber}`,
                totalAmount: total,
                currency: 'USD',
                payments: [],
                createdAt: new Date().toISOString(),
                createdBy: userId,
                createdByName: userName
            });

            await batch.commit();

            // Return items to inventory
            const movementsToProcess = returnItems.map(item => ({
                productId: String(item.productId),
                type: 'Entrada',
                quantity: parseInt(item.quantity),
                location: '',
                reason: `Devolución NC-${creditNoteNumber}: ${item.description || item.sku}`,
                userName: userName
            }));

            await processBatchMovements(movementsToProcess);

            return { success: true, creditNoteNumber };
        } catch (error) {
            console.error('Error processing return:', error);
            throw error;
        }
    };

    // Get pending sales for cash register
    const getPendingSales = () => {
        return sales.filter(s =>
            s.paymentStatus === 'pending_payment' ||
            s.paymentStatus === 'partial'
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    };

    return {
        // Data
        products,
        movements,
        purchases,
        providers,
        brands,
        categories,
        sales,
        customers,
        loading,

        // Cash Register Data
        cashSession,
        cashTransactions,
        authRequests,
        creditNotes,

        // Product functions
        addProduct,
        updateProduct,
        deleteProduct,
        addProducts,

        // Movement functions
        addMovement,
        approveMovement,
        rejectMovement,

        // Purchase functions
        addPurchase,
        deletePurchasesByDate,

        // Provider functions
        addProvider,
        updateProvider,

        // Brand functions
        addBrand,
        addBrands,

        // Category functions
        addCategory,
        updateCategory,
        deleteCategory,
        addCategories,

        // Sale functions
        addSale,
        deleteSale,
        cancelSale,

        // Customer functions
        addCustomer,
        updateCustomer,
        deleteCustomer,

        // Payment functions (CxC)
        addPayment,

        // Cash Register functions
        openCashSession,
        closeCashSession,
        verifyCashSession,
        processSalePayment,
        processExpense,
        processWithdrawal,
        requestAuthorization: processExpense, // Alias
        approveAuthorization,
        rejectAuthorization,
        processReturn,
        getPendingSales,

        // Stats
        getStats,
        migrateSKUFormat
    };
};
