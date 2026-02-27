import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

// Table names (snake_case for PostgreSQL)
const TABLES = {
    PRODUCTS: 'products',
    MOVEMENTS: 'movements',
    PURCHASES: 'purchases',
    PROVIDERS: 'providers',
    BRANDS: 'brands',
    CATEGORIES: 'categories',
    SALES: 'sales',
    CUSTOMERS: 'customers',
    PAYMENTS: 'payments',
    CASH_SESSIONS: 'cash_sessions',
    CASH_TRANSACTIONS: 'cash_transactions',
    AUTH_REQUESTS: 'authorization_requests',
    CREDIT_NOTES: 'credit_notes'
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

    // Fetch all data for company (OPTIMIZED - Parallel + Limited)
    const fetchData = useCallback(async () => {
        if (!companyId) {
            setProducts([]);
            setMovements([]);
            setPurchases([]);
            setProviders([]);
            setSales([]);
            setCustomers([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const startTime = Date.now();
        console.log('🚀 Starting optimized parallel data fetch...');

        try {
            // ========== FASE 1: CARGA PARALELA ESENCIAL ==========
            // Cargar productos, sesion de caja y datos basicos en paralelo

            const [
                productsResult,
                brandsResult,
                categoriesResult,
                providersResult,
                cashSessionResult,
                customersResult
            ] = await Promise.all([
                // Products (batched if needed)
                (async () => {
                    const { count: totalCount } = await supabase
                        .from(TABLES.PRODUCTS)
                        .select('*', { count: 'exact', head: true })
                        .eq('company_id', companyId)
                        .or('status.is.null,status.neq.deleted'); // Incluir NULL y excluir deleted

                    if (!totalCount || totalCount === 0) return [];

                    const batchSize = 1000;
                    const numBatches = Math.ceil(totalCount / batchSize);
                    const batchPromises = [];

                    for (let i = 0; i < numBatches; i++) {
                        const from = i * batchSize;
                        const to = from + batchSize - 1;
                        batchPromises.push(
                            supabase
                                .from(TABLES.PRODUCTS)
                                .select('*')
                                .eq('company_id', companyId)
                                .or('status.is.null,status.neq.deleted') // Incluir NULL y excluir deleted
                                .order('description')
                                .range(from, to)
                        );
                    }

                    const results = await Promise.all(batchPromises);
                    return results.flatMap(r => r.data || []);
                })(),

                // Brands (global, fast)
                supabase.from(TABLES.BRANDS).select('*'),

                // Categories (global, fast)
                supabase.from(TABLES.CATEGORIES).select('*'),

                // Providers
                supabase.from(TABLES.PROVIDERS).select('*').eq('company_id', companyId),

                // Cash Session (single record)
                supabase
                    .from(TABLES.CASH_SESSIONS)
                    .select('*')
                    .eq('company_id', companyId)
                    .in('status', ['open', 'pending_verification'])
                    .limit(1)
                    .maybeSingle(),

                // Customers
                supabase
                    .from(TABLES.CUSTOMERS)
                    .select('*')
                    .eq('company_id', companyId)
                    .order('name')
            ]);

            // Set essential data immediately
            setProducts(productsResult || []);
            setBrands(brandsResult.data || []);
            setCategories(categoriesResult.data || []);
            setProviders(providersResult.data || []);
            setCashSession(cashSessionResult.data || null);
            setCustomers(customersResult.data || []);

            const phase1Time = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ Phase 1 complete: ${productsResult.length} products loaded in ${phase1Time}s`);

            // ========== FASE 2: CARGA SECUNDARIA (puede ser mas lenta) ==========
            // Movimientos, ventas, compras - LIMITADOS a ultimos 500 registros

            const LIMIT_RECORDS = 500;

            const [
                movementsResult,
                salesResult,
                purchasesResult,
                cashTxResult,
                authRequestsResult,
                creditNotesResult
            ] = await Promise.all([
                // Movements (limited to recent)
                supabase
                    .from(TABLES.MOVEMENTS)
                    .select('*')
                    .eq('company_id', companyId)
                    .order('date', { ascending: false })
                    .limit(LIMIT_RECORDS),

                // Sales (limited to recent, no manual join - use description from sale)
                supabase
                    .from(TABLES.SALES)
                    .select('*')
                    .eq('company_id', companyId)
                    .order('created_at', { ascending: false })
                    .limit(LIMIT_RECORDS),

                // Purchases (limited)
                supabase
                    .from(TABLES.PURCHASES)
                    .select('*')
                    .eq('company_id', companyId)
                    .order('date', { ascending: false })
                    .limit(LIMIT_RECORDS),

                // Cash Transactions (limited)
                supabase
                    .from(TABLES.CASH_TRANSACTIONS)
                    .select('*')
                    .eq('company_id', companyId)
                    .order('created_at', { ascending: false })
                    .limit(LIMIT_RECORDS),

                // Auth Requests (only pending)
                supabase
                    .from(TABLES.AUTH_REQUESTS)
                    .select('*')
                    .eq('company_id', companyId)
                    .eq('status', 'pending'),

                // Credit Notes (limited)
                supabase
                    .from(TABLES.CREDIT_NOTES)
                    .select('*')
                    .eq('company_id', companyId)
                    .order('created_at', { ascending: false })
                    .limit(100)
            ]);

            setMovements(movementsResult.data || []);

            // Enrich sales with sale_items structure (using embedded data, no extra query)
            const salesData = (salesResult.data || []).map(sale => ({
                ...sale,
                sale_items: [{
                    id: sale.id,
                    product_id: sale.product_id,
                    quantity: sale.quantity,
                    price_usd: sale.amount_usd,
                    price_bs: sale.amount_bs,
                    product: {
                        id: sale.product_id,
                        description: sale.description || 'Producto',
                        sku: sale.sku || 'N/A',
                        reference: sale.reference || 'N/A'
                    }
                }]
            }));
            setSales(salesData);

            setPurchases(purchasesResult.data || []);
            setCashTransactions(cashTxResult.data || []);
            setAuthRequests(authRequestsResult.data || []);
            setCreditNotes(creditNotesResult.data || []);

            const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`🏁 All data loaded in ${totalTime}s (Products: ${productsResult.length}, Sales: ${salesData.length}, Movements: ${movementsResult.data?.length || 0})`);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    // Initial data fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ========== REAL-TIME HANDLERS (OPTIMIZED) ==========
    // En lugar de recargar TODO, actualizamos solo el registro cambiado

    const handleProductChange = useCallback((payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        // Solo procesar si es de nuestra company
        if (newRecord?.company_id !== companyId && oldRecord?.company_id !== companyId) return;

        console.log(`🔄 Product ${eventType}:`, newRecord?.description || oldRecord?.id);

        if (eventType === 'INSERT') {
            setProducts(prev => [...prev, newRecord]);
        } else if (eventType === 'UPDATE') {
            setProducts(prev => prev.map(p => p.id === newRecord.id ? newRecord : p));
        } else if (eventType === 'DELETE') {
            setProducts(prev => prev.filter(p => p.id !== oldRecord.id));
        }
    }, [companyId]);

    const handleSaleChange = useCallback((payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        if (newRecord?.company_id !== companyId && oldRecord?.company_id !== companyId) return;

        console.log(`🔄 Sale ${eventType}:`, newRecord?.document_number || oldRecord?.id);

        if (eventType === 'INSERT') {
            // Enriquecer con estructura esperada
            const enrichedSale = {
                ...newRecord,
                sale_items: [{
                    id: newRecord.id,
                    product_id: newRecord.product_id,
                    quantity: newRecord.quantity,
                    price_usd: newRecord.amount_usd,
                    price_bs: newRecord.amount_bs,
                    product: { id: newRecord.product_id, description: newRecord.description, sku: newRecord.sku }
                }]
            };
            setSales(prev => [enrichedSale, ...prev]);
        } else if (eventType === 'UPDATE') {
            setSales(prev => prev.map(s => s.id === newRecord.id ? { ...s, ...newRecord } : s));
        } else if (eventType === 'DELETE') {
            setSales(prev => prev.filter(s => s.id !== oldRecord.id));
        }
    }, [companyId]);

    const handleMovementChange = useCallback((payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        if (newRecord?.company_id !== companyId && oldRecord?.company_id !== companyId) return;

        console.log(`🔄 Movement ${eventType}`);

        if (eventType === 'INSERT') {
            setMovements(prev => [newRecord, ...prev]);
        } else if (eventType === 'UPDATE') {
            setMovements(prev => prev.map(m => m.id === newRecord.id ? newRecord : m));
        } else if (eventType === 'DELETE') {
            setMovements(prev => prev.filter(m => m.id !== oldRecord.id));
        }
    }, [companyId]);

    const handlePurchaseChange = useCallback((payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        if (newRecord?.company_id !== companyId && oldRecord?.company_id !== companyId) return;

        console.log(`🔄 Purchase ${eventType}`);

        if (eventType === 'INSERT') {
            setPurchases(prev => [newRecord, ...prev]);
        } else if (eventType === 'UPDATE') {
            setPurchases(prev => prev.map(p => p.id === newRecord.id ? newRecord : p));
        } else if (eventType === 'DELETE') {
            setPurchases(prev => prev.filter(p => p.id !== oldRecord.id));
        }
    }, [companyId]);

    const handleCustomerChange = useCallback((payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        if (newRecord?.company_id !== companyId && oldRecord?.company_id !== companyId) return;

        if (eventType === 'INSERT') {
            setCustomers(prev => [...prev, newRecord].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        } else if (eventType === 'UPDATE') {
            setCustomers(prev => prev.map(c => c.id === newRecord.id ? newRecord : c));
        } else if (eventType === 'DELETE') {
            setCustomers(prev => prev.filter(c => c.id !== oldRecord.id));
        }
    }, [companyId]);

    const handleCashSessionChange = useCallback((payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        if (newRecord?.company_id !== companyId && oldRecord?.company_id !== companyId) return;

        // Solo nos interesa la sesion abierta
        if (newRecord?.status === 'open' || newRecord?.status === 'pending_verification') {
            setCashSession(newRecord);
        } else if (oldRecord?.id === cashSession?.id) {
            setCashSession(null);
        }
    }, [companyId, cashSession?.id]);

    const handleCashTransactionChange = useCallback((payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        if (newRecord?.company_id !== companyId && oldRecord?.company_id !== companyId) return;

        if (eventType === 'INSERT') {
            setCashTransactions(prev => [newRecord, ...prev]);
        } else if (eventType === 'UPDATE') {
            setCashTransactions(prev => prev.map(t => t.id === newRecord.id ? newRecord : t));
        } else if (eventType === 'DELETE') {
            setCashTransactions(prev => prev.filter(t => t.id !== oldRecord.id));
        }
    }, [companyId]);

    // Set up real-time subscriptions (OPTIMIZED - Granular Updates)
    useEffect(() => {
        if (!companyId) return;

        console.log('📡 Setting up granular real-time subscriptions...');

        const channel = supabase
            .channel(`company_${companyId}_optimized`)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.PRODUCTS }, handleProductChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.SALES }, handleSaleChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.MOVEMENTS }, handleMovementChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.PURCHASES }, handlePurchaseChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.CUSTOMERS }, handleCustomerChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.CASH_SESSIONS }, handleCashSessionChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.CASH_TRANSACTIONS }, handleCashTransactionChange)
            .subscribe((status) => {
                console.log('📡 Realtime subscription status:', status);
            });

        return () => {
            console.log('📡 Removing real-time channel');
            supabase.removeChannel(channel);
        };
    }, [companyId, handleProductChange, handleSaleChange, handleMovementChange, handlePurchaseChange, handleCustomerChange, handleCashSessionChange, handleCashTransactionChange]);

    // ========== PRODUCTS ==========
    const addProduct = async (productData) => {
        try {
            if (!companyId) throw new Error('Company ID is missing (addProduct)');

            // SKU UNIQUE VALIDATION - Check before insert
            if (productData.sku && productData.sku.trim() !== '') {
                const { data: existingSku } = await supabase
                    .from(TABLES.PRODUCTS)
                    .select('id, sku')
                    .eq('company_id', companyId)
                    .ilike('sku', productData.sku.trim())
                    .maybeSingle();

                if (existingSku) {
                    throw new Error(`El SKU "${productData.sku}" ya existe. Use otro codigo.`);
                }
            }

            // Extract minStock from productData to avoid sending camelCase to DB
            const { minStock, ...restProductData } = productData;

            const { data, error } = await supabase
                .from(TABLES.PRODUCTS)
                .insert({
                    ...restProductData,
                    status: restProductData.status || 'active',
                    min_stock: minStock !== undefined ? minStock : restProductData.min_stock,
                    company_id: companyId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Auto-register initial movement if product has stock
            const initialQty = parseFloat(data.quantity) || 0;
            if (initialQty > 0 && data.id) {
                try {
                    await supabase
                        .from(TABLES.MOVEMENTS)
                        .insert({
                            company_id: companyId,
                            product_id: data.id,
                            sku: data.sku || '',
                            product_name: data.description || '',
                            type: 'Entrada',
                            quantity: initialQty,
                            new_qty: initialQty,
                            location: data.location || '',
                            reason: 'Creacion del producto',
                            status: 'approved',
                            user_name: 'Sistema',
                            date: new Date().toISOString(),
                            created_at: new Date().toISOString(),
                            approved_at: new Date().toISOString()
                        });
                } catch (movError) {
                    console.warn('Could not create initial movement for product:', movError);
                }
            }

            await fetchData();
            return data;
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    };

    const updateProduct = async (id, updates) => {
        try {
            if (!companyId) throw new Error('Company ID is missing');

            const { minStock, ...restUpdates } = updates;
            // Eliminar propiedades temporales del frontend (ej: _relevance del filtro de busqueda)
            const cleanUpdates = Object.fromEntries(
                Object.entries(restUpdates).filter(([key]) => !key.startsWith('_'))
            );
            const dbUpdates = {
                ...cleanUpdates,
                min_stock: minStock !== undefined ? minStock : cleanUpdates.min_stock,
                updated_at: new Date().toISOString()
            };
            console.log(`📝 updateProduct: id=${id}, updates=`, dbUpdates);

            const { data: updatedProduct, error } = await supabase
                .from(TABLES.PRODUCTS)
                .update(dbUpdates)
                .eq('id', id)
                .eq('company_id', companyId)
                .select()
                .single();

            if (error) {
                console.error('❌ updateProduct error:', error);
                throw error;
            }

            if (!updatedProduct) {
                console.error('❌ updateProduct: No se actualizo ningun producto. Verificar ID y company_id');
                throw new Error('No se pudo actualizar el producto');
            }

            console.log('✅ Product updated successfully:', updatedProduct.description, 'quantity:', updatedProduct.quantity);
            await fetchData();
            return updatedProduct;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    };



    const deleteProduct = async (id) => {
        try {
            if (!companyId) throw new Error('Company ID is missing (deleteProduct)');

            console.log(`🗑️ Soft-deleting product: id=${id}, company_id=${companyId}`);

            // Use UPDATE instead of DELETE to avoid RLS issues
            // Mark as deleted rather than physically removing
            const { error } = await supabase
                .from(TABLES.PRODUCTS)
                .update({
                    status: 'deleted',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('company_id', companyId);

            if (error) {
                console.error('❌ Soft delete error:', error);
                throw error;
            }

            // Remove from local state immediately
            setProducts(prev => prev.filter(p => p.id !== id));
            console.log('✅ Product soft-deleted successfully');
        } catch (error) {
            console.error('Error deleting product:', error);
            alert(`Error al eliminar: ${error.message}`);
            throw error;
        }
    };

    // ========== BULK DELETE PRODUCTS ==========
    const deleteProductsBatch = async (ids) => {
        try {
            if (!companyId) throw new Error('Company ID is missing (deleteProductsBatch)');
            if (!ids || ids.length === 0) throw new Error('No products selected');

            console.log(`🗑️ Bulk soft-deleting ${ids.length} products...`);

            // Use UPDATE with .in() for efficient batch soft-delete
            const { error } = await supabase
                .from(TABLES.PRODUCTS)
                .update({
                    status: 'deleted',
                    updated_at: new Date().toISOString()
                })
                .in('id', ids)
                .eq('company_id', companyId);

            if (error) {
                console.error('❌ Bulk soft delete error:', error);
                throw error;
            }

            // Remove from local state immediately
            setProducts(prev => prev.filter(p => !ids.includes(p.id)));
            console.log(`✅ ${ids.length} products soft-deleted successfully`);

            return { deleted: ids.length };
        } catch (error) {
            console.error('Error bulk deleting products:', error);
            alert(`Error al eliminar productos: ${error.message}`);
            throw error;
        }
    };

    const addProductsBatch = async (productsArray) => {
        try {
            const productsToInsert = productsArray.map(p => ({
                ...p,
                status: p.status || 'active',
                company_id: companyId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            const { data: insertedProducts, error } = await supabase
                .from(TABLES.PRODUCTS)
                .insert(productsToInsert)
                .select();

            if (error) throw error;

            // Auto-register initial movements for products with stock
            if (insertedProducts && insertedProducts.length > 0) {
                const movementsToInsert = insertedProducts
                    .filter(p => (parseFloat(p.quantity) || 0) > 0)
                    .map(p => ({
                        company_id: companyId,
                        product_id: p.id,
                        sku: p.sku || '',
                        product_name: p.description || '',
                        type: 'Entrada',
                        quantity: parseFloat(p.quantity) || 0,
                        new_qty: parseFloat(p.quantity) || 0,
                        location: p.location || '',
                        reason: 'Importacion Excel',
                        status: 'approved',
                        user_name: 'Sistema',
                        date: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        approved_at: new Date().toISOString()
                    }));

                if (movementsToInsert.length > 0) {
                    try {
                        await supabase
                            .from(TABLES.MOVEMENTS)
                            .insert(movementsToInsert);
                    } catch (movError) {
                        console.warn('Could not create initial movements for batch:', movError);
                    }
                }
            }

            await fetchData();
        } catch (error) {
            console.error('Error adding products batch:', error);
            throw error;
        }
    };

    // ========== PROVIDERS ==========
    const addProvider = async (providerData) => {
        try {
            const { data, error } = await supabase
                .from(TABLES.PROVIDERS)
                .insert({
                    ...providerData,
                    company_id: companyId,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            await fetchData();
            return data;
        } catch (error) {
            console.error('Error adding provider:', error);
            throw error;
        }
    };

    const updateProvider = async (id, updates) => {
        try {
            if (!companyId) throw new Error('Company ID is missing (updateProvider)');

            const { data, error } = await supabase
                .from(TABLES.PROVIDERS)
                .update(updates)
                .eq('id', id)
                .eq('company_id', companyId)
                .select()
                .single();

            if (error) throw error;
            await fetchData();
            return data;
        } catch (error) {
            console.error('Error updating provider:', error);
            throw error;
        }
    };

    const getOrCreateProvider = async (providerData) => {
        // Check if provider exists
        const existing = providers.find(p =>
            p.name.toLowerCase() === providerData.name.toLowerCase()
        );
        if (existing) return existing;
        return await addProvider(providerData);
    };

    // ========== BRANDS ==========
    const addBrand = async (brandData) => {
        try {
            const { error } = await supabase
                .from(TABLES.BRANDS)
                .insert({
                    ...brandData,
                    company_id: companyId,
                    created_at: new Date().toISOString()
                });

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error adding brand:', error);
            throw error;
        }
    };

    const getOrCreateBrand = async (brandName, brandCode) => {
        const existing = brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
        if (existing) return existing;

        const newBrand = { name: brandName, code: brandCode || brandName.substring(0, 3).toUpperCase() };
        await addBrand(newBrand);
        await fetchData();
        return brands.find(b => b.name === brandName) || newBrand;
    };

    // ========== CATEGORIES ==========
    const addCategory = async (categoryData) => {
        try {
            const { error } = await supabase
                .from(TABLES.CATEGORIES)
                .insert({
                    ...categoryData,
                    company_id: companyId,
                    created_at: new Date().toISOString()
                });

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error adding category:', error);
            throw error;
        }
    };

    const getOrCreateCategory = async (categoryName) => {
        const existing = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        if (existing) return existing;

        const maxCode = categories.reduce((max, cat) => {
            const numCode = parseInt(cat.code) || 0;
            return numCode > max ? numCode : max;
        }, 0);

        const newCategory = { name: categoryName, code: (maxCode + 10).toString().padStart(3, '0') };
        await addCategory(newCategory);
        await fetchData();
        return categories.find(c => c.name === categoryName) || newCategory;
    };

    // ========== SALES ==========
    const addSale = async (saleData, paymentMethods = []) => {
        try {
            const esPresupuesto = saleData.is_quote || saleData.document_type === 'presupuesto';

            console.log('💾 addSale - datos recibidos:', {
                product_id: saleData.product_id,
                quantity: saleData.quantity,
                is_quote: saleData.is_quote,
                document_type: saleData.document_type,
                esPresupuesto,
                user_name: saleData.user_name
            });

            // 1. Create Sale (extract user_name as sales table doesn't have it)
            const { user_name: saleUserName, ...saleInsertData } = saleData;
            const { data: sale, error: saleError } = await supabase
                .from(TABLES.SALES)
                .insert({
                    ...saleInsertData,
                    company_id: companyId,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (saleError) throw saleError;

            // 2. Descontar stock automaticamente (solo si NO es presupuesto)
            const productId = saleData.product_id;
            const cantidadVendida = parseFloat(saleData.quantity) || 0;

            if (!esPresupuesto && productId && cantidadVendida > 0) {
                // Leer datos frescos del producto para sku/nombre
                const { data: dbProduct } = await supabase
                    .from(TABLES.PRODUCTS)
                    .select('id, sku, reference, description')
                    .eq('id', productId)
                    .eq('company_id', companyId)
                    .single();

                if (dbProduct) {
                    // addMovement lee stock fresco, calcula new_qty, inserta movimiento y actualiza product.quantity
                    await addMovement({
                        productId: dbProduct.id,
                        sku: dbProduct.sku || dbProduct.reference || '',
                        productName: dbProduct.description || '',
                        type: 'Salida',
                        quantity: cantidadVendida,
                        reason: `Venta ${sale.document_number || '#' + sale.id}`,
                        status: 'approved',
                        createdBy: saleUserName || 'Usuario POS'
                    });

                    console.log(`✅ Movimiento de salida creado (via addMovement) para venta ${sale.document_number}`);
                } else {
                    console.warn(`⚠️ Producto ${productId} no encontrado en DB para descontar stock`);
                }
            } else {
                console.warn('⚠️ NO se desconto stock:', {
                    esPresupuesto,
                    productId: productId || 'MISSING',
                    cantidadVendida,
                    reason: esPresupuesto ? 'Es presupuesto' : !productId ? 'Sin product_id' : 'Cantidad 0'
                });
            }

            // 3. Register Payments (if any)
            if (paymentMethods && paymentMethods.length > 0) {
                // Get open cash session
                if (cashSession) {
                    const transactionPromises = paymentMethods.map(payment => {
                        return supabase.from('cash_transactions').insert({
                            company_id: companyId,
                            session_id: cashSession.id,
                            type: 'sale',
                            amount: payment.amount,
                            currency: payment.currency,
                            description: `Venta ${sale.document_number} (${payment.method})`,
                            reference: payment.reference || null,
                            sale_id: sale.id,
                            created_at: new Date().toISOString()
                        });
                    });

                    await Promise.all(transactionPromises);
                } else {
                    console.warn('⚠️ No open cash session found. Payments recorded but not linked to session.');
                }
            }

            await fetchData();
            return sale;
        } catch (error) {
            console.error('Error adding sale:', error);
            throw error;
        }
    };

    // ========== BATCH SALES (OPTIMIZED) ==========
    const addSalesBatch = async (saleItems, paymentMethods = [], userName = 'Usuario POS') => {
        try {
            console.log(`🚀 addSalesBatch: Processing ${saleItems.length} items...`);
            const startTime = Date.now();

            // 1. Batch Insert ALL sales at once (remove user_name as sales table doesn't have it)
            const salesToInsert = saleItems.map(({ user_name, ...item }) => ({
                ...item,
                company_id: companyId,
                created_at: new Date().toISOString()
            }));

            const { data: insertedSales, error: salesError } = await supabase
                .from(TABLES.SALES)
                .insert(salesToInsert)
                .select();

            if (salesError) throw salesError;
            console.log(`✅ Inserted ${insertedSales.length} sales in batch`);

            // 2. Check if we need to update stock (not for quotes)
            const esPresupuesto = saleItems[0]?.is_quote || saleItems[0]?.document_type === 'presupuesto';

            if (!esPresupuesto) {
                // 3. Leer stock fresco de la DB para TODOS los productos del batch
                const uniqueProductIds = [...new Set(saleItems.filter(i => i.product_id).map(i => i.product_id))];
                const { data: freshProducts } = await supabase
                    .from(TABLES.PRODUCTS)
                    .select('*')
                    .in('id', uniqueProductIds)
                    .eq('company_id', companyId);

                const freshProductMap = new Map((freshProducts || []).map(p => [p.id, p]));
                console.log(`📦 Stock fresco leido de DB para ${freshProductMap.size} productos`);

                const stockUpdates = new Map(); // Acumular descuentos por producto
                const movementsToInsert = [];

                for (let i = 0; i < saleItems.length; i++) {
                    const item = saleItems[i];
                    const sale = insertedSales[i];

                    if (item.product_id && item.quantity) {
                        const productId = item.product_id;
                        const cantidadVendida = parseInt(item.quantity) || 0;

                        // Usar producto fresco de la DB
                        const product = freshProductMap.get(productId);
                        if (product) {
                            // Usar stock acumulado si ya procesamos este producto, sino usar el fresco de DB
                            const stockActual = stockUpdates.has(productId)
                                ? stockUpdates.get(productId)
                                : (product.quantity || 0);
                            const nuevoStock = Math.max(0, stockActual - cantidadVendida);

                            // Actualizar el mapa con el nuevo stock
                            stockUpdates.set(productId, nuevoStock);

                            movementsToInsert.push({
                                company_id: companyId,
                                product_id: productId,
                                sku: product.sku || product.reference || '',
                                product_name: product.description || '',
                                type: 'Salida',
                                quantity: cantidadVendida,
                                new_qty: nuevoStock,
                                location: product.location || '',
                                reason: `Venta ${sale?.document_number || '#' + sale?.id}`,
                                status: 'approved',
                                user_name: userName,
                                date: new Date().toISOString(),
                                created_at: new Date().toISOString(),
                                approved_at: new Date().toISOString()
                            });
                        }
                    }
                }

                // 4. Execute stock updates in parallel (usar el Map)
                if (stockUpdates.size > 0) {
                    const updatePromises = Array.from(stockUpdates.entries()).map(([productId, nuevoStock]) =>
                        supabase
                            .from(TABLES.PRODUCTS)
                            .update({
                                quantity: nuevoStock,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', productId)
                            .eq('company_id', companyId)
                    );
                    await Promise.all(updatePromises);
                    console.log(`✅ Updated stock for ${stockUpdates.size} products in parallel`);
                }

                // 5. Batch insert movements
                if (movementsToInsert.length > 0) {
                    const { error: movError } = await supabase
                        .from(TABLES.MOVEMENTS)
                        .insert(movementsToInsert);
                    if (movError) {
                        console.error('❌ Movement insert error:', movError);
                        throw new Error(`Error insertando movimientos de venta: ${movError.message}`);
                    }
                    console.log(`✅ Inserted ${movementsToInsert.length} movements in batch`);
                }
            }

            // 6. Register Payments (only once for the entire batch)
            if (paymentMethods && paymentMethods.length > 0 && cashSession) {
                const firstSale = insertedSales[0];
                const transactionPromises = paymentMethods.map(payment =>
                    supabase.from('cash_transactions').insert({
                        company_id: companyId,
                        session_id: cashSession.id,
                        type: 'sale',
                        amount: payment.amount,
                        currency: payment.currency,
                        description: `Venta ${firstSale?.document_number} (${payment.method})`,
                        reference: payment.reference || null,
                        sale_id: firstSale?.id,
                        created_at: new Date().toISOString()
                    })
                );
                await Promise.all(transactionPromises);
                console.log(`✅ Registered ${paymentMethods.length} payments`);
            }

            // 7. Single fetchData at the end
            await fetchData();

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`🏁 addSalesBatch completed in ${elapsed}s`);

            return insertedSales;
        } catch (error) {
            console.error('Error in addSalesBatch:', error);
            throw error;
        }
    };

    const updateSale = async (id, updates) => {
        try {
            const { error } = await supabase
                .from(TABLES.SALES)
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error updating sale:', error);
            throw error;
        }
    };

    const deleteSale = async (id) => {
        try {
            // 1. Fetch sale to get items for stock reversion
            const { data: sale, error: fetchError } = await supabase
                .from(TABLES.SALES)
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;
            if (!sale) throw new Error('Venta no encontrada');

            console.log('🗑️ Deleting sale and reverting stock:', sale);

            // 2. Revert Stock (Manual workaround if relation mapping is complex, 
            // but we have `sales` state with parsed items. Let's use local state if possible? 
            // No, safer to fetch or use what we have. 
            // In `fetchData`, we manually joined. Here we need to replicate that or assume we have the data.
            // Let's assume we can get the necessary info.
            // Actually, `sale` from DB might not have items if it's a flat table. 
            // Based on `fetchData`, `SALES` table has fields like `product_id`, `quantity` directly (Flat Structure).

            // Revert logic for Flat Structure (1 row per sale item approach used in `addSale` loop):
            if (sale.product_id && sale.quantity) {
                // BUG-5 FIX: Leer stock FRESCO de la DB en vez de cache local
                const { data: freshProduct } = await supabase
                    .from(TABLES.PRODUCTS)
                    .select('*')
                    .eq('id', sale.product_id)
                    .eq('company_id', companyId)
                    .single();

                if (freshProduct) {
                    const currentQty = freshProduct.quantity || 0;
                    const revertedQty = currentQty + (parseFloat(sale.quantity) || 0);
                    console.log(`↺ Reverting ${sale.quantity} of ${freshProduct.description}. Stock: ${currentQty} → ${revertedQty}`);

                    // BUG-6 FIX: Solo registrar movimiento (sin updateProduct previo)
                    // addMovement con status=approved ya actualiza el stock del producto
                    await addMovement({
                        productId: freshProduct.id,
                        sku: freshProduct.sku || freshProduct.reference || '',
                        productName: freshProduct.description || '',
                        type: 'Entrada',
                        quantity: sale.quantity,
                        reason: `Anulacion Venta #${sale.document_number}`,
                        status: 'approved',
                        createdBy: 'Sistema'
                    });
                }
            }

            // 3. Delete related transactions (Optional, but good for cleanup)
            // Cascade delete usually handles this, but let's be sure.
            await supabase.from('cash_transactions').delete().eq('sale_id', id);

            // 4. Delete Sale
            const { error } = await supabase
                .from(TABLES.SALES)
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchData();
            return true;
        } catch (error) {
            console.error('Error deleting sale:', error);
            throw error;
        }
    };

    // ========== MOVEMENTS ==========
    const addMovement = async (movementData) => {
        try {
            console.log('📦 addMovement called with:', movementData);
            console.log('📦 Company ID:', companyId);

            // Validate companyId
            if (!companyId) {
                const errorMsg = 'No hay empresa seleccionada. Por favor inicie sesion nuevamente.';
                console.error('❌ ' + errorMsg);
                throw new Error(errorMsg);
            }

            const productId = movementData.productId;
            if (!productId) {
                throw new Error('productId es requerido para el movimiento');
            }

            // BUG-1 FIX: SIEMPRE leer stock fresco de la DB (nunca del cache)
            const { data: product, error: fetchError } = await supabase
                .from(TABLES.PRODUCTS)
                .select('*')
                .eq('id', productId)
                .eq('company_id', companyId)
                .single();

            if (fetchError) {
                console.error('❌ Error buscando producto:', fetchError);
                throw new Error('Producto no encontrado en la base de datos');
            }

            console.log('📦 Found product (DB fresh):', product ? { id: product.id, quantity: product.quantity, description: product.description } : 'NOT FOUND');

            const currentQty = product?.quantity || 0;
            const qty = parseFloat(movementData.quantity) || 0;
            const movementType = (movementData.type || '').toLowerCase();
            const status = movementData.status || 'pending';

            // Calculate expected new quantity after this movement
            let newQty = currentQty;
            if (movementType === 'entrada') {
                newQty = currentQty + qty;
            } else if (movementType === 'salida') {
                // ========== VALIDACION STOCK INSUFICIENTE ==========
                if (qty > currentQty) {
                    const errorMsg = `Stock insuficiente para "${product?.description || 'producto'}". Disponible: ${currentQty}, Solicitado: ${qty}`;
                    console.error('❌ ' + errorMsg);
                    throw new Error(errorMsg);
                }
                newQty = currentQty - qty;
            } else if (movementType === 'ajuste') {
                newQty = qty; // Ajuste sets absolute value
            }

            console.log(`📦 Calculation (DB fresh): currentQty=${currentQty}, qty=${qty}, type=${movementType}, newQty=${newQty}, status=${status}`);

            // Use snake_case to match PostgreSQL column naming convention
            const dbRecord = {
                company_id: companyId,
                product_id: productId,
                sku: movementData.sku || '',
                product_name: movementData.productName || '',
                type: movementData.type,
                quantity: qty,
                new_qty: newQty,
                location: movementData.location || '',
                reason: movementData.reason || '',
                status: status,
                user_name: movementData.createdBy || 'Usuario',
                date: new Date().toISOString(),
                created_at: new Date().toISOString()
            };

            // Si es approved, agregar fecha de aprobacion
            if (status === 'approved') {
                dbRecord.approved_at = new Date().toISOString();
            }

            console.log('📝 Inserting movement:', dbRecord);

            const { data, error } = await supabase
                .from(TABLES.MOVEMENTS)
                .insert(dbRecord)
                .select()
                .single();

            if (error) {
                console.error('❌ Insert error:', error);
                throw error;
            }

            console.log('✅ Movement inserted:', data);

            // BUG-2 FIX: Si el movimiento es aprobado, actualizar el producto directamente
            // Ya tenemos el newQty calculado correctamente con stock fresco de DB
            if (status === 'approved' && productId) {
                const { data: updatedProduct, error: updateError } = await supabase
                    .from(TABLES.PRODUCTS)
                    .update({
                        quantity: newQty,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', productId)
                    .eq('company_id', companyId)
                    .select()
                    .single();

                if (updateError) {
                    console.error('❌ Error updating product quantity:', updateError);
                    throw updateError;
                }

                console.log('✅ Product quantity updated:', updatedProduct);
            }

            await fetchData();
            return data;
        } catch (error) {
            console.error('Error adding movement:', error);
            throw error;
        }
    };

    const updateMovement = async (id, updates) => {
        try {
            const { error } = await supabase
                .from(TABLES.MOVEMENTS)
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error updating movement:', error);
            throw error;
        }
    };

    const approveMovement = async (movement) => {
        try {
            const movementId = movement.id;
            if (!movementId) throw new Error('Movement ID not found');

            console.log('🚀 approveMovement iniciado para movimiento:', movementId);

            // Find product - handle both productId (camelCase) and product_id (snake_case)
            const productId = movement.productId || movement.product_id;
            console.log('🔍 ProductId del movimiento:', productId);

            if (!productId) {
                console.error('❌ El movimiento no tiene product_id');
                throw new Error('Movement has no product_id');
            }

            // Obtener producto directamente de la DB (no del cache)
            console.log('📥 Buscando producto en DB...');
            const { data: product, error: fetchError } = await supabase
                .from(TABLES.PRODUCTS)
                .select('*')
                .eq('id', productId)
                .eq('company_id', companyId)
                .single();

            if (fetchError) {
                console.error('❌ Error buscando producto:', fetchError);
                throw fetchError;
            }

            if (!product) {
                console.error('❌ Producto no encontrado con id:', productId);
                throw new Error(`Product not found: ${productId}`);
            }

            console.log('✅ Producto encontrado:', product.description, 'Stock actual:', product.quantity);

            // RE-LEER stock fresco de la DB para evitar race condition
            const { data: freshProduct } = await supabase
                .from(TABLES.PRODUCTS)
                .select('quantity')
                .eq('id', productId)
                .eq('company_id', companyId)
                .single();

            const currentQty = freshProduct?.quantity || 0;
            const movementType = (movement.type || '').toLowerCase();
            const qty = parseInt(movement.quantity) || 0;
            let newQuantity = currentQty;

            if (movementType === 'entrada') {
                newQuantity = currentQty + qty;
            } else if (movementType === 'salida') {
                newQuantity = Math.max(0, currentQty - qty);
            } else if (movementType === 'ajuste') {
                newQuantity = qty; // Ajuste sets absolute value
            }

            console.log(`📦 Re-lectura atomica: stockFresco=${currentQty}, final=${newQuantity}`);

            // 1. Actualizar el movimiento con status approved y new_qty
            console.log('📝 Actualizando movimiento a approved...');
            const { error: movError } = await supabase
                .from(TABLES.MOVEMENTS)
                .update({
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                    new_qty: newQuantity
                })
                .eq('id', movementId);

            if (movError) {
                console.error('❌ Error actualizando movimiento:', movError);
                throw movError;
            }
            console.log('✅ Movimiento actualizado a approved');

            // 2. Actualizar el producto con stock recalculado
            console.log(`📝 Actualizando producto ${productId} con quantity=${newQuantity}...`);
            const { data: updatedProduct, error: updateError } = await supabase
                .from(TABLES.PRODUCTS)
                .update({
                    quantity: newQuantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId)
                .eq('company_id', companyId)
                .select()
                .single();

            if (updateError) {
                console.error('❌ Error actualizando producto:', updateError);
                throw updateError;
            }

            if (updatedProduct) {
                console.log('✅ PRODUCTO ACTUALIZADO EXITOSAMENTE:', updatedProduct.description, 'Nuevo stock:', updatedProduct.quantity);
            } else {
                console.error('❌ Update no retorno producto - posible problema de matching');
            }

            // 3. Refrescar datos en UI
            console.log('🔄 Refrescando datos...');
            await fetchData();
            console.log('✅ approveMovement completado exitosamente');

        } catch (error) {
            console.error('❌ Error en approveMovement:', error);
            throw error;
        }
    };

    const rejectMovement = async (movementId, reason) => {
        try {
            await updateMovement(movementId, {
                status: 'rejected',
                notes: reason
            });
            await fetchData();
        } catch (error) {
            console.error('Error rejecting movement:', error);
            throw error;
        }
    };

    // ========== PRODUCT MOVEMENT HISTORY ==========
    const getProductMovementHistory = async (productId) => {
        try {
            if (!productId || !companyId) return [];

            const { data, error } = await supabase
                .from(TABLES.MOVEMENTS)
                .select('*')
                .eq('company_id', companyId)
                .eq('product_id', productId)
                .order('date', { ascending: false });

            if (error) {
                console.error('Error fetching product movement history:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error in getProductMovementHistory:', error);
            return [];
        }
    };

    // ========== PURCHASES ==========
    const addPurchase = async (purchaseData, userName = 'Usuario') => {
        try {
            // Si es un array, convertir a estructura de una sola compra con items
            const items = Array.isArray(purchaseData) ? purchaseData : [purchaseData];

            // Extraer datos del primer item para info de proveedor/factura
            const firstItem = items[0] || {};
            const invoiceNumber = firstItem.invoiceNumber || '';
            const providerName = firstItem.providerName || 'Proveedor';

            // ========== VALIDAR FACTURA DUPLICADA ==========
            if (invoiceNumber) {
                const { data: existingPurchase } = await supabase
                    .from(TABLES.PURCHASES)
                    .select('id, invoice_number')
                    .eq('company_id', companyId)
                    .eq('invoice_number', invoiceNumber)
                    .single();

                if (existingPurchase) {
                    throw new Error(`La factura "${invoiceNumber}" ya fue registrada anteriormente. Por favor verifique.`);
                }
            }

            // Calcular total
            const total = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

            // Formatear items para el campo JSONB
            const formattedItems = items.map(item => ({
                productId: String(item.productId),
                productName: item.productName,
                productSku: item.productSku,
                productReference: item.productReference,
                quantity: parseInt(item.quantity) || 0,
                unit: item.unit || 'Pza',
                unitCost: parseFloat(item.cost) || 0,
                total: parseFloat(item.total) || 0
            }));

            const purchaseRecord = {
                company_id: companyId,
                provider_id: null,
                provider_name: providerName,
                invoice_number: invoiceNumber,
                items: formattedItems,
                subtotal: total,
                tax: 0,
                total: total,
                status: 'completed',
                date: new Date().toISOString().split('T')[0],
                created_by: userName,
                created_at: new Date().toISOString()
            };

            const { data: purchase, error } = await supabase
                .from(TABLES.PURCHASES)
                .insert(purchaseRecord)
                .select()
                .single();

            if (error) throw error;

            // ========== ACTUALIZAR STOCK Y REGISTRAR MOVIMIENTOS ==========
            // Usa addMovement como unica puerta de entrada para stock
            for (const item of items) {
                if (item.productId) {
                    const qty = parseFloat(item.quantity) || 0;

                    // Actualizar costo del producto (sin tocar quantity, eso lo hace addMovement)
                    if (item.cost) {
                        await supabase
                            .from(TABLES.PRODUCTS)
                            .update({
                                cost: parseFloat(item.cost),
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', item.productId)
                            .eq('company_id', companyId);
                    }

                    // Leer datos frescos del producto para sku/nombre
                    const { data: freshProduct } = await supabase
                        .from(TABLES.PRODUCTS)
                        .select('id, sku, reference, description')
                        .eq('id', item.productId)
                        .eq('company_id', companyId)
                        .single();

                    if (freshProduct) {
                        // addMovement lee stock fresco, calcula new_qty, inserta movimiento y actualiza product.quantity
                        await addMovement({
                            productId: freshProduct.id,
                            sku: freshProduct.sku || freshProduct.reference || '',
                            productName: freshProduct.description || '',
                            type: 'Entrada',
                            quantity: qty,
                            reason: `compra`,
                            status: 'approved',
                            createdBy: userName
                        });

                        console.log(`📦 Compra (via addMovement): +${qty} de ${freshProduct.description}`);
                    }
                }
            }

            await fetchData();
            return purchase;
        } catch (error) {
            console.error('Error adding purchase:', error);
            throw error;
        }
    };

    // ========== CUSTOMERS ==========
    const addCustomer = async (customerData) => {
        try {
            const { data, error } = await supabase
                .from(TABLES.CUSTOMERS)
                .insert({
                    ...customerData,
                    company_id: companyId,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            await fetchData();
            return data;
        } catch (error) {
            console.error('Error adding customer:', error);
            throw error;
        }
    };

    const updateCustomer = async (id, updates) => {
        try {
            const { error } = await supabase
                .from(TABLES.CUSTOMERS)
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error updating customer:', error);
            throw error;
        }
    };

    // ========== PAYMENTS ==========
    const addPayment = async (paymentData) => {
        try {
            const { data, error } = await supabase
                .from(TABLES.PAYMENTS)
                .insert({
                    ...paymentData,
                    company_id: companyId,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Update sale paid amount
            if (paymentData.sale_id) {
                const sale = sales.find(s => s.id === paymentData.sale_id);
                if (sale) {
                    const newPaidAmount = (sale.paid_amount || 0) + paymentData.amount;
                    const remaining = (sale.amount_usd || 0) - newPaidAmount;
                    await updateSale(sale.id, {
                        paid_amount: newPaidAmount,
                        remaining_amount: remaining,
                        payment_status: remaining <= 0 ? 'paid' : 'partial'
                    });
                }
            }

            await fetchData();
            return data;
        } catch (error) {
            console.error('Error adding payment:', error);
            throw error;
        }
    };

    // ========== CASH SESSIONS ==========
    const openCashSession = async (cashierData, openingAmounts) => {
        try {
            if (!companyId) {
                console.error('❌ Attempted to open cash session without companyId');
                throw new Error('Error: No se ha identificado la empresa. Por favor recargue la página.');
            }

            const { data, error } = await supabase
                .from(TABLES.CASH_SESSIONS)
                .insert({
                    company_id: companyId,
                    cashier_id: cashierData.id,
                    cashier_name: cashierData.name,
                    status: 'open',
                    opening_usd: openingAmounts.usd || 0,
                    opening_bs: openingAmounts.bs || 0,
                    opened_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            await fetchData();
            return data;
        } catch (error) {
            console.error('Error opening cash session:', error);
            throw error;
        }
    };

    const closeCashSession = async (sessionId, closingData) => {
        try {
            const { error } = await supabase
                .from(TABLES.CASH_SESSIONS)
                .update({
                    status: 'closed',
                    closing_usd: closingData.usd || 0,
                    closing_bs: closingData.bs || 0,
                    expected_usd: closingData.expectedUsd || 0,
                    expected_bs: closingData.expectedBs || 0,
                    difference_usd: closingData.differenceUsd || 0,
                    difference_bs: closingData.differenceBs || 0,
                    closed_at: new Date().toISOString(),
                    notes: closingData.notes || ''
                })
                .eq('id', sessionId);

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error closing cash session:', error);
            throw error;
        }
    };

    // ========== CASH TRANSACTIONS ==========
    const addCashTransaction = async (transactionData) => {
        try {
            const { data, error } = await supabase
                .from(TABLES.CASH_TRANSACTIONS)
                .insert({
                    ...transactionData,
                    company_id: companyId,
                    session_id: cashSession?.id,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            await fetchData();
            return data;
        } catch (error) {
            console.error('Error adding cash transaction:', error);
            throw error;
        }
    };

    // ========== AUTH REQUESTS ==========
    const createAuthRequest = async (requestData) => {
        try {
            const { data, error } = await supabase
                .from(TABLES.AUTH_REQUESTS)
                .insert({
                    ...requestData,
                    company_id: companyId,
                    status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            await fetchData();
            return data;
        } catch (error) {
            console.error('Error creating auth request:', error);
            throw error;
        }
    };

    const approveAuthRequest = async (requestId, approverName) => {
        try {
            const { error } = await supabase
                .from(TABLES.AUTH_REQUESTS)
                .update({
                    status: 'approved',
                    approved_by: approverName,
                    approved_at: new Date().toISOString()
                })
                .eq('id', requestId);

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error approving auth request:', error);
            throw error;
        }
    };

    const rejectAuthRequest = async (requestId, reason) => {
        try {
            const { error } = await supabase
                .from(TABLES.AUTH_REQUESTS)
                .update({
                    status: 'rejected',
                    reason: reason
                })
                .eq('id', requestId);

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error rejecting auth request:', error);
            throw error;
        }
    };

    // ========== CREDIT NOTES ==========
    const addCreditNote = async (creditNoteData) => {
        try {
            const { data, error } = await supabase
                .from(TABLES.CREDIT_NOTES)
                .insert({
                    ...creditNoteData,
                    company_id: companyId,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            await fetchData();
            return data;
        } catch (error) {
            console.error('Error adding credit note:', error);
            throw error;
        }
    };

    // ========== SALE PAYMENT PROCESSING ==========
    const processSalePayment = async (saleId, paymentMethods, userId, userName, exchangeRate) => {
        try {
            // Calculate total payment
            const totalPayment = paymentMethods.reduce((sum, p) => sum + (p.amount || 0), 0);

            // Get current sale
            const sale = sales.find(s => s.id === saleId);
            if (!sale) throw new Error('Sale not found');

            // Calculate new paid amount
            const newPaidAmount = (sale.paid_amount || 0) + totalPayment;
            const remaining = (sale.amount_usd || 0) - newPaidAmount;
            const isPaid = remaining <= 0;

            // Add payments
            for (const pm of paymentMethods) {
                await addPayment({
                    sale_id: saleId,
                    amount: pm.amount,
                    currency: pm.currency,
                    method: pm.method,
                    reference: pm.reference || null,
                    created_by: userId,
                    created_by_name: userName
                });
            }

            // Add cash transaction
            await addCashTransaction({
                type: 'sale',
                description: `Pago ${sale.document_type} #${sale.document_number}`,
                total_amount: totalPayment,
                payments: paymentMethods,
                sale_id: saleId,
                created_by: userId,
                created_by_name: userName
            });

            return { success: true, isPaid };
        } catch (error) {
            console.error('Error processing sale payment:', error);
            throw error;
        }
    };

    // Return all states and functions
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
        cashSession,
        cashTransactions,
        authRequests,
        creditNotes,

        // Refresh
        refreshData: fetchData,

        // Product functions
        addProduct,
        updateProduct,
        deleteProduct,
        deleteProductsBatch,
        addProductsBatch,

        // Provider functions
        addProvider,
        getOrCreateProvider,

        // Brand functions
        addBrand,
        getOrCreateBrand,

        // Category functions
        addCategory,
        getOrCreateCategory,

        // Sale functions
        addSale,
        addSalesBatch,
        updateSale,
        deleteSale,

        // Movement functions
        addMovement,
        updateMovement,
        approveMovement,
        rejectMovement,
        getProductMovementHistory,

        // Provider functions
        addProvider,
        updateProvider,
        getOrCreateProvider,

        // Purchase functions
        addPurchase,

        // Customer functions
        addCustomer,
        updateCustomer,

        // Payment functions
        addPayment,
        processSalePayment,

        // Cash session functions
        openCashSession,
        closeCashSession,

        // Cash transaction functions
        addCashTransaction,

        // Auth request functions
        createAuthRequest,
        approveAuthRequest,
        rejectAuthRequest,

        // Credit note functions
        addCreditNote
    };
};
