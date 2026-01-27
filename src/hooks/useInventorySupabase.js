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

    // Fetch all data for company
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

        try {
            // Fetch ALL products (parallel batches for speed)
            console.log('📦 Loading products in parallel batches...');
            const startTime = Date.now();

            // First, get total count
            const { count: totalCount } = await supabase
                .from(TABLES.PRODUCTS)
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId);

            if (!totalCount || totalCount === 0) {
                console.log('⚠️ No products found');
                setProducts([]);
            } else {
                // Calculate number of batches needed
                const batchSize = 1000;
                const numBatches = Math.ceil(totalCount / batchSize);

                // Create array of promises for parallel fetching
                const batchPromises = [];
                for (let i = 0; i < numBatches; i++) {
                    const from = i * batchSize;
                    const to = from + batchSize - 1;

                    batchPromises.push(
                        supabase
                            .from(TABLES.PRODUCTS)
                            .select('*')
                            .eq('company_id', companyId)
                            .order('description')
                            .range(from, to)
                    );
                }

                // Fetch all batches in parallel
                const results = await Promise.all(batchPromises);

                // Combine all results
                const allProducts = results.flatMap(result => result.data || []);

                const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log(`✅ Loaded ${allProducts.length} products in ${elapsed}s (${numBatches} parallel batches)`);

                setProducts(allProducts);
            }

            // Fetch movements
            const { data: movementsData } = await supabase
                .from(TABLES.MOVEMENTS)
                .select('*')
                .eq('company_id', companyId)
                .order('date', { ascending: false });
            setMovements(movementsData || []);

            // Fetch purchases
            const { data: purchasesData } = await supabase
                .from(TABLES.PURCHASES)
                .select('*')
                .eq('company_id', companyId)
                .order('date', { ascending: false });
            setPurchases(purchasesData || []);

            // Fetch providers
            const { data: providersData } = await supabase
                .from(TABLES.PROVIDERS)
                .select('*')
                .eq('company_id', companyId);
            setProviders(providersData || []);

            // Fetch brands (GLOBAL)
            const { data: brandsData } = await supabase
                .from(TABLES.BRANDS)
                .select('*');
            setBrands(brandsData || []);

            // Fetch categories (GLOBAL)
            const { data: categoriesData } = await supabase
                .from(TABLES.CATEGORIES)
                .select('*');
            setCategories(categoriesData || []);

            // Fetch sales (flat structure)
            const { data: rawSalesData, error: salesError } = await supabase
                .from(TABLES.SALES)
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (salesError) throw salesError;

            // Manual Join: Fetch product details for these sales
            // 1. Get unique product IDs
            const productIds = [...new Set(rawSalesData?.map(s => s.product_id).filter(Boolean))];

            // 2. Fetch products
            let productsMap = {};
            if (productIds.length > 0) {
                const { data: productsData } = await supabase
                    .from(TABLES.PRODUCTS)
                    .select('id, description, sku, reference')
                    .in('id', productIds);

                // Create lookup map
                productsData?.forEach(p => {
                    productsMap[p.id] = p;
                });
            }

            // 3. Transform and enrich data
            const salesData = rawSalesData?.map(sale => {
                const product = productsMap[sale.product_id] || {};
                return {
                    ...sale,
                    sale_items: [{
                        id: sale.id,
                        product_id: sale.product_id,
                        quantity: sale.quantity,
                        price_usd: sale.amount_usd,
                        price_bs: sale.amount_bs,
                        product: {
                            id: sale.product_id,
                            description: product.description || sale.description || 'Producto',
                            sku: product.sku || sale.sku || 'N/A',
                            reference: product.reference || sale.reference || 'N/A'
                        }
                    }]
                };
            }) || [];

            setSales(salesData);

            // Fetch customers
            const { data: customersData } = await supabase
                .from(TABLES.CUSTOMERS)
                .select('*')
                .eq('company_id', companyId)
                .order('name');
            setCustomers(customersData || []);

            // Fetch cash session (open one)
            const { data: sessionData } = await supabase
                .from(TABLES.CASH_SESSIONS)
                .select('*')
                .eq('company_id', companyId)
                .in('status', ['open', 'pending_verification'])
                .limit(1)
                .single();
            setCashSession(sessionData || null);

            // Fetch cash transactions
            const { data: txData } = await supabase
                .from(TABLES.CASH_TRANSACTIONS)
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });
            setCashTransactions(txData || []);

            // Fetch auth requests
            const { data: authData } = await supabase
                .from(TABLES.AUTH_REQUESTS)
                .select('*')
                .eq('company_id', companyId)
                .eq('status', 'pending');
            setAuthRequests(authData || []);

            // Fetch credit notes
            const { data: cnData } = await supabase
                .from(TABLES.CREDIT_NOTES)
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });
            setCreditNotes(cnData || []);

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

    // Set up real-time subscriptions
    useEffect(() => {
        if (!companyId) return;

        const channel = supabase
            .channel(`company_${companyId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.PRODUCTS }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.SALES }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.MOVEMENTS }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.PURCHASES }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.CUSTOMERS }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.CASH_SESSIONS }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.CASH_TRANSACTIONS }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [companyId, fetchData]);

    // ========== PRODUCTS ==========
    const addProduct = async (productData) => {
        try {
            if (!companyId) throw new Error('Company ID is missing (addProduct)');

            const { data, error } = await supabase
                .from(TABLES.PRODUCTS)
                .insert({
                    ...productData,
                    min_stock: productData.minStock !== undefined ? productData.minStock : productData.min_stock,
                    company_id: companyId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
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
            const dbUpdates = {
                ...restUpdates,
                min_stock: minStock !== undefined ? minStock : restUpdates.min_stock,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from(TABLES.PRODUCTS)
                .update(dbUpdates)
                .eq('id', id)
                .eq('company_id', companyId);

            if (error) {
                console.error('❌ updateProduct error:', error);
                throw error;
            }
            console.log('✅ Product updated successfully');
            await fetchData();
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    };



    const deleteProduct = async (id) => {
        try {
            const { error } = await supabase
                .from(TABLES.PRODUCTS)
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    };

    const addProductsBatch = async (productsArray) => {
        try {
            const productsToInsert = productsArray.map(p => ({
                ...p,
                company_id: companyId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from(TABLES.PRODUCTS)
                .insert(productsToInsert);

            if (error) throw error;
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

            // 1. Create Sale
            const { data: sale, error: saleError } = await supabase
                .from(TABLES.SALES)
                .insert({
                    ...saleData,
                    company_id: companyId,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (saleError) throw saleError;

            // 2. Descontar stock automaticamente (solo si NO es presupuesto)
            if (!esPresupuesto && saleData.product_id && saleData.quantity) {
                const productId = saleData.product_id;
                const cantidadVendida = parseInt(saleData.quantity) || 0;

                // Buscar producto para obtener stock actual
                let product = products.find(p => p.id === productId);
                if (!product) {
                    const { data: dbProduct } = await supabase
                        .from(TABLES.PRODUCTS)
                        .select('*')
                        .eq('id', productId)
                        .eq('company_id', companyId)
                        .single();
                    product = dbProduct;
                }

                if (product) {
                    const stockActual = product.quantity || 0;
                    const nuevoStock = Math.max(0, stockActual - cantidadVendida);

                    console.log(`🛒 Venta: Descontando ${cantidadVendida} de ${product.description || product.sku}. Stock: ${stockActual} → ${nuevoStock}`);

                    // 2a. Actualizar stock del producto
                    await supabase
                        .from(TABLES.PRODUCTS)
                        .update({
                            quantity: nuevoStock,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', productId)
                        .eq('company_id', companyId);

                    // 2b. Crear movimiento de salida (auto-aprobado)
                    await supabase
                        .from(TABLES.MOVEMENTS)
                        .insert({
                            company_id: companyId,
                            product_id: productId,
                            sku: product.sku || product.reference || '',
                            product_name: product.description || '',
                            type: 'Salida',
                            quantity: cantidadVendida,
                            new_qty: nuevoStock,
                            location: product.location || '',
                            reason: `Venta ${sale.document_number || '#' + sale.id}`,
                            status: 'approved',
                            user_name: 'Sistema (Venta)',
                            date: new Date().toISOString(),
                            created_at: new Date().toISOString(),
                            approved_at: new Date().toISOString()
                        });

                    console.log(`✅ Movimiento de salida creado para venta ${sale.document_number}`);
                }
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
                const product = products.find(p => p.id === sale.product_id);
                if (product) {
                    const newQty = (product.quantity || 0) + sale.quantity;
                    console.log(`↺ Reverting ${sale.quantity} of ${product.description}. New Qty: ${newQty}`);

                    // Update Product
                    await updateProduct(product.id, { quantity: newQty });

                    // Log Movement
                    await addMovement({
                        productId: product.id,
                        type: 'entrada',
                        quantity: sale.quantity,
                        reason: `Anulación Venta #${sale.document_number}`,
                        status: 'approved', // Auto-approve
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

            // Buscar producto en cache local primero
            let product = products.find(p => p.id === productId);

            // Si no esta en cache, buscar en DB directamente
            if (!product) {
                console.log('⚠️ Producto no en cache, buscando en DB...');
                const { data: dbProduct, error: fetchError } = await supabase
                    .from(TABLES.PRODUCTS)
                    .select('*')
                    .eq('id', productId)
                    .eq('company_id', companyId)
                    .single();

                if (fetchError) {
                    console.error('❌ Error buscando producto:', fetchError);
                } else {
                    product = dbProduct;
                }
            }

            console.log('📦 Found product:', product ? { id: product.id, quantity: product.quantity, description: product.description } : 'NOT FOUND');

            const currentQty = product?.quantity || 0;
            const qty = parseInt(movementData.quantity) || 0;
            const movementType = (movementData.type || '').toLowerCase();
            const status = movementData.status || 'pending';

            // Calculate expected new quantity after this movement
            let newQty = currentQty;
            if (movementType === 'entrada') {
                newQty = currentQty + qty;
            } else if (movementType === 'salida') {
                newQty = currentQty - qty;
            } else if (movementType === 'ajuste') {
                newQty = qty; // Ajuste sets absolute value
            }

            console.log(`📦 Calculation: currentQty=${currentQty}, qty=${qty}, type=${movementType}, newQty=${newQty}, status=${status}`);

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

            // Si el movimiento es aprobado directamente, actualizar el producto
            if (status === 'approved' && productId) {
                console.log(`📦 Actualizando producto ${productId} a cantidad: ${newQty}`);

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

            // Update movement status
            await updateMovement(movementId, {
                status: 'approved',
                approved_at: new Date().toISOString()
            });

            // Find product - handle both productId (camelCase) and product_id (snake_case)
            const productId = movement.productId || movement.product_id;
            const product = products.find(p => p.id === productId);

            if (product) {
                let newQuantity = product.quantity || 0;
                const movementType = (movement.type || '').toLowerCase();
                const qty = parseInt(movement.quantity) || 0;

                if (movementType === 'entrada') {
                    newQuantity += qty;
                } else if (movementType === 'salida') {
                    newQuantity -= qty;
                } else if (movementType === 'ajuste') {
                    newQuantity = qty;
                }

                // Update the movement with newQty for display
                await updateMovement(movementId, { newQty: newQuantity });

                // Update product quantity
                await updateProduct(product.id, { quantity: newQuantity });
            }

            await fetchData();
        } catch (error) {
            console.error('Error approving movement:', error);
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

    // ========== PURCHASES ==========
    const addPurchase = async (purchaseData) => {
        try {
            const { data: purchase, error } = await supabase
                .from(TABLES.PURCHASES)
                .insert({
                    ...purchaseData,
                    company_id: companyId,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Update product quantities for each item
            if (purchaseData.items && purchaseData.items.length > 0) {
                for (const item of purchaseData.items) {
                    if (item.productId) {
                        const product = products.find(p => p.id === item.productId);
                        if (product) {
                            await updateProduct(product.id, {
                                quantity: (product.quantity || 0) + item.quantity,
                                cost: item.cost || product.cost,
                                price: item.price || product.price
                            });
                        }
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
        updateSale,
        deleteSale,

        // Movement functions
        addMovement,
        updateMovement,
        approveMovement,
        rejectMovement,

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
