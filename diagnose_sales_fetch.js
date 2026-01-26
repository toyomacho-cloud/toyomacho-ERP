
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

const supabase = createClient(supabaseUrl, supabaseKey);

const COMPANY_ID = '5b3ba72c-66a3-4b0d-ab5a-e5599cb8d049'; // From previous check

async function testSalesFetch() {
    console.log('Testing sales fetch for company:', COMPANY_ID);

    try {
        // 1. Simple fetch
        console.log('1. Simple fetch (no joins)...');
        const { data: simpleData, error: simpleError } = await supabase
            .from('sales')
            .select('*')
            .eq('company_id', COMPANY_ID)
            .limit(5);

        if (simpleError) console.error('Simple fetch error:', simpleError);
        else console.log(`Simple fetch success. Found ${simpleData.length} records.`);

        // 2. Complex fetch (as in useInventory)
        console.log('2. Complex fetch (with joins)...');
        const { data: complexData, error: complexError } = await supabase
            .from('sales')
            .select(`
                *,
                sale_items (
                    id,
                    product_id,
                    quantity,
                    price_usd,
                    price_bs,
                    product:products (
                        id,
                        description,
                        sku,
                        reference
                    )
                )
            `)
            .eq('company_id', COMPANY_ID)
            .order('created_at', { ascending: false })
            .limit(5);

        if (complexError) {
            console.error('Complex fetch error:', complexError);
        } else {
            console.log(`Complex fetch success. Found ${complexData.length} records.`);
            if (complexData.length > 0) {
                console.log('Sample record items:', JSON.stringify(complexData[0].sale_items, null, 2));
            }
        }

        // 3. Check pending sales count
        console.log('3. Checking pending sales count...');
        const { count, error: countError } = await supabase
            .from('sales')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', COMPANY_ID)
            .eq('payment_status', 'pending_payment');

        if (countError) console.error('Count error:', countError);
        else console.log(`Pending sales count: ${count}`);

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testSalesFetch();
