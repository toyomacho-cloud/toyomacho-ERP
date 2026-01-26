
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findProducts() {
    console.log('Searching for products by price...');

    const prices = [13.96, 70.00, 20.00];

    for (const price of prices) {
        const { data, error } = await supabase
            .from('products')
            .select('id, description, sku, price')
            .eq('price', price);

        if (error) console.error(`Error for ${price}:`, error);
        else {
            console.log(`\nPrice $${price}: Found ${data.length} products`);
            data.forEach(p => console.log(` - ${p.description} (SKU: ${p.sku})`));
        }
    }
}

findProducts();
