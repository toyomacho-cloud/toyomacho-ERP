
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

const supabase = createClient(supabaseUrl, supabaseKey);

const COMPANY_ID = '5b3ba72c-66a3-4b0d-ab5a-e5599cb8d049';

async function diagnoseSales() {
    console.log('--- Diagnosing Sales Data ---');

    // 1. Fetch recent sales
    const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        // .eq('company_id', COMPANY_ID)
        // .eq('payment_status', 'pending_payment')
        .gt('paid_amount', 13)
        .lt('paid_amount', 14)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching sales:', error);
        return;
    }

    console.log(`Fetched ${sales.length} sales.`);

    if (sales.length === 0) return;

    // 2. Analyze first few sales
    const productIds = [];
    sales.forEach((sale, index) => {
        console.log(`\nSale #${index + 1} (ID: ${sale.id})`);
        console.log(` - Document: ${sale.document_type} #${sale.document_number}`);
        console.log(` - Product ID: ${sale.product_id}`);
        console.log(` - Description (in sales table): ${sale.description}`);
        console.log(` - SKU (in sales table): ${sale.sku}`);
        console.log(` - Quantity: ${sale.quantity}`);
        console.log(` - Amount USD: ${sale.amount_usd}`);
        console.log(` - Total: ${sale.total}`);
        console.log(` - Created At: ${sale.created_at}`);
        console.log(` - Firebase ID: ${sale.firebase_id}`);

        if (sale.product_id) productIds.push(sale.product_id);
    });

    // 3. Check if products exist
    if (productIds.length > 0) {
        console.log('\n--- Checking Products ---');
        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, description, sku, reference')
            .in('id', productIds);

        if (prodError) {
            console.error('Error fetching products:', prodError);
        } else {
            console.log(`Found ${products.length} matching products.`);
            products.forEach(p => {
                console.log(` - Product [${p.id}]: ${p.description} (SKU: ${p.sku})`);
            });
        }
    } else {
        console.log('\n⚠️ No Product IDs found in recent sales.');
    }
}

diagnoseSales();
