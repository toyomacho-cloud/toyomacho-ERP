
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log('Listing tables...');
    // We can't query information_schema directly with supabase-js easily.
    // But we can try to query common table names to see if they exist.

    const candidates = ['sales', 'sale_items', 'sale_details', 'items', 'products', 'movements'];

    for (const table of candidates) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ ${table}: ${error.code} - ${error.message}`);
        } else {
            console.log(`✅ ${table}: Exists`);
        }
    }
}

listTables();
