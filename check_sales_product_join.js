
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJoin() {
    console.log('Testing sales -> products join...');

    const { data, error } = await supabase
        .from('sales')
        .select(`
            id,
            product_id,
            product:products (
                id,
                description,
                sku,
                reference
            )
        `)
        .limit(1);

    if (error) {
        console.error('Join failed:', error);
    } else {
        console.log('Join success!');
        console.log(JSON.stringify(data, null, 2));
    }
}

checkJoin();
