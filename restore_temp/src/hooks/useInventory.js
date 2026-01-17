import { useState, useEffect } from 'react';

const STORAGE_KEY = 'nova_inventory_data_v2';
const MOVEMENTS_STORAGE_KEY = 'nova_inventory_movements';
const PURCHASES_STORAGE_KEY = 'nova_inventory_purchases';
const PROVIDERS_STORAGE_KEY = 'nova_inventory_providers';
const BRANDS_STORAGE_KEY = 'nova_inventory_brands';
const CATEGORIES_STORAGE_KEY = 'nova_inventory_categories';
const SALES_STORAGE_KEY = 'nova_inventory_sales';

const initialData = [
    {
        id: 1,
        sku: 'WH-001',
        reference: 'REF-WH',
        description: 'Wireless Headphones Noise Cancelling',
        category: 'Electronics',
        brand: 'Sony',
        location: 'A-12',
        quantity: 45,
        price: 129.99,
        status: 'In Stock'
    },
    {
        id: 2,
        sku: 'EC-002',
        reference: 'REF-EC',
        description: 'Ergonomic Office Chair',
        category: 'Furniture',
        brand: 'Herman Miller',
        location: 'B-05',
        quantity: 12,
        price: 299.99,
        status: 'Low Stock'
    },
    {
        id: 3,
        sku: 'MK-003',
        reference: 'REF-MK',
        description: 'Mechanical Keyboard RGB',
        category: 'Electronics',
        brand: 'Keychron',
        location: 'A-15',
        quantity: 8,
        price: 159.50,
        status: 'Low Stock'
    },
];

const initialProviders = [
    { id: 1, name: 'Sony Electronics', contact: 'John Doe', phone: '555-0101', email: 'contact@sony.com' },
    { id: 2, name: 'Office Depot', contact: 'Jane Smith', phone: '555-0202', email: 'sales@officedepot.com' },
];

const initialBrands = [
    { id: 1, name: 'Sony', code: 'SON' },
    { id: 2, name: 'Herman Miller', code: 'HER' },
    { id: 3, name: 'Keychron', code: 'KEY' },
    { id: 4, name: 'Samsung', code: 'SAM' },
    { id: 5, name: 'Apple', code: 'APP' },
];

const initialCategories = [
    { id: 1, name: 'Electronics', code: '001' },
    { id: 2, name: 'Furniture', code: '002' },
    { id: 3, name: 'Accessories', code: '003' },
    { id: 4, name: 'Office', code: '004' },
];

export const useInventory = () => {
    const [products, setProducts] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : initialData;
    });

    const [movements, setMovements] = useState(() => {
        const saved = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    const [purchases, setPurchases] = useState(() => {
        const saved = localStorage.getItem(PURCHASES_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    const [providers, setProviders] = useState(() => {
        const saved = localStorage.getItem(PROVIDERS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : initialProviders;
    });

    const [brands, setBrands] = useState(() => {
        const saved = localStorage.getItem(BRANDS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : initialBrands;
    });

    const [categories, setCategories] = useState(() => {
        const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
        return saved ? JSON.parse(saved) : initialCategories;
    });

    const [sales, setSales] = useState(() => {
        const saved = localStorage.getItem(SALES_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }, [products]);

    useEffect(() => {
        localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(movements));
    }, [movements]);

    useEffect(() => {
        localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(purchases));
    }, [purchases]);

    useEffect(() => {
        localStorage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(providers));
    }, [providers]);

    useEffect(() => {
        localStorage.setItem(BRANDS_STORAGE_KEY, JSON.stringify(brands));
    }, [brands]);

    useEffect(() => {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    }, [categories]);

    useEffect(() => {
        localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
    }, [sales]);

    const addProduct = (product) => {
        const newProduct = { ...product, id: Date.now() };
        setProducts([...products, newProduct]);
        return newProduct;
    };

    const updateProduct = (id, updatedData) => {
        setProducts(products.map(p => p.id === id ? { ...p, ...updatedData } : p));
    };

    const deleteProduct = (id) => {
        setProducts(products.filter(p => p.id !== id));
    };

    const addProvider = (provider) => {
        const newProvider = { ...provider, id: Date.now() };
        setProviders([...providers, newProvider]);
    };

    const addBrand = (brand) => {
        const newBrand = { ...brand, id: Date.now() };
        setBrands([...brands, newBrand]);
    };

    const addCategory = (category) => {
        const newCategory = { ...category, id: Date.now() };
        setCategories([...categories, newCategory]);
    };

    const addSale = (saleData) => {
        const items = Array.isArray(saleData) ? saleData : [saleData];

        const newSales = items.map(item => ({
            ...item,
            id: Date.now() + Math.random(),
            createdAt: new Date().toISOString()
        }));
        setSales(prev => [...newSales, ...prev]);

        const movementsToProcess = items.map(item => ({
            productId: item.productId,
            type: 'Salida',
            quantity: parseInt(item.quantity),
            location: '',
            reason: `Venta/Egreso: ${item.description} - ${item.paymentType === 'cash' ? 'Contado' : 'Crédito'}`
        }));

        processBatchMovements(movementsToProcess);
    };

    const deleteSale = (saleId) => {
        const sale = sales.find(s => s.id === saleId);
        if (!sale) return;

        // Revert inventory by adding back the quantity
        const revertMovement = {
            productId: sale.productId,
            type: 'Entrada',
            quantity: parseInt(sale.quantity),
            location: '',
            reason: `Reversión de Venta/Egreso: ${sale.sku}`
        };

        processBatchMovements([revertMovement]);
        setSales(prev => prev.filter(s => s.id !== saleId));
    };

    const processBatchMovements = (movementsList) => {
        let currentProducts = [...products];
        const newMovements = [];

        movementsList.forEach(movement => {
            const { productId, type, quantity, location, reason } = movement;
            const productIndex = currentProducts.findIndex(p => p.id === parseInt(productId));

            if (productIndex === -1) return;
            const product = currentProducts[productIndex];

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

            const updatedProduct = {
                ...product,
                quantity: newQuantity,
                location: location || product.location,
                status: newStatus
            };

            currentProducts[productIndex] = updatedProduct;

            newMovements.push({
                id: Date.now() + Math.random(),
                productId: parseInt(productId),
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
        });

        setProducts(currentProducts);
        setMovements(prev => [...newMovements, ...prev]);
    };

    const addMovement = (movement) => {
        processBatchMovements([movement]);
    };

    const addPurchase = (purchaseData) => {
        const items = Array.isArray(purchaseData) ? purchaseData : [purchaseData];

        const newPurchases = items.map(item => ({
            ...item,
            id: Date.now() + Math.random(),
            date: new Date().toISOString()
        }));
        setPurchases(prev => [...newPurchases, ...prev]);

        const movementsToProcess = items.map(item => ({
            productId: item.productId,
            type: 'Entrada',
            quantity: parseInt(item.quantity),
            location: '',
            reason: `Compra: ${item.providerName} - Factura #${item.invoiceNumber}`
        }));

        processBatchMovements(movementsToProcess);
    };



    const deleteDispatch = (dispatchId) => {
        console.log('deleteDispatch called in hook with ID:', dispatchId);
        const dispatch = dispatches.find(d => d.id === dispatchId);
        console.log('Found dispatch:', dispatch);

        if (!dispatch) {
            console.error('Dispatch not found for ID:', dispatchId);
            return;
        }

        // Revert inventory by adding back the quantity
        const revertMovement = {
            productId: dispatch.productId,
            type: 'Entrada',
            quantity: parseInt(dispatch.quantity),
            location: '',
            reason: `Reversión de venta: ${dispatch.sku}`
        };

        console.log('Reverting movement:', revertMovement);
        processBatchMovements([revertMovement]);
        setDispatches(prev => {
            console.log('Filtering dispatches. Previous count:', prev.length);
            const newDispatches = prev.filter(d => d.id !== dispatchId);
            console.log('New count:', newDispatches.length);
            return newDispatches;
        });
    };

    const getStats = () => {
        const totalProducts = products.length;
        const totalValue = products.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
        const lowStock = products.filter(p => p.quantity < 15 && p.quantity > 0).length;
        const outOfStock = products.filter(p => p.quantity === 0).length;

        return { totalProducts, totalValue, lowStock, outOfStock };
    };

    return {
        products,
        movements,
        purchases,
        providers,
        brands,
        categories,
        sales,
        addProduct,
        updateProduct,
        deleteProduct,
        addMovement,
        addPurchase,
        addProvider,
        addBrand,
        addCategory,
        addSale,
        deleteSale,
        getStats
    };
};
