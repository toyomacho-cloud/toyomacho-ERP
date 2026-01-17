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
            // Fetch products
            const { data: productsData } = await supabase
                .from(TABLES.PRODUCTS)
                .select('*')
                .eq('company_id', companyId);
            setProducts(productsData || []);

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

            // Fetch sales
            const { data: salesData } = await supabase
                .from(TABLES.SALES)
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });
            setSales(salesData || []);

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
            const { data, error } = await supabase
                .from(TABLES.PRODUCTS)
                .insert({
                    ...productData,
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
            const { error } = await supabase
                .from(TABLES.PRODUCTS)
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
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
    const addSale = async (saleData) => {
        try {
            const { data, error } = await supabase
                .from(TABLES.SALES)
                .insert({
                    ...saleData,
                    company_id: companyId,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            await fetchData();
            return data;
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
            const { error } = await supabase
                .from(TABLES.SALES)
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error deleting sale:', error);
            throw error;
        }
    };

    // ========== MOVEMENTS ==========
    const addMovement = async (movementData) => {
        try {
            const { data, error } = await supabase
                .from(TABLES.MOVEMENTS)
                .insert({
                    ...movementData,
                    company_id: companyId,
                    created_at: new Date().toISOString(),
                    date: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
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

    const approveMovement = async (movementId, approverId, approverName) => {
        try {
            const movement = movements.find(m => m.id === movementId);
            if (!movement) throw new Error('Movement not found');

            // Update movement status
            await updateMovement(movementId, {
                status: 'approved',
                approved_by: approverName,
                approved_at: new Date().toISOString()
            });

            // Update product quantity
            const product = products.find(p => p.id === movement.product_id);
            if (product) {
                let newQuantity = product.quantity || 0;
                if (movement.type === 'entrada') {
                    newQuantity += movement.quantity;
                } else if (movement.type === 'salida') {
                    newQuantity -= movement.quantity;
                } else if (movement.type === 'ajuste') {
                    newQuantity = movement.quantity;
                }
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
