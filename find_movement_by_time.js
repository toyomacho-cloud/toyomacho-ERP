
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findMovements() {
    console.log('Searching for movements by time...');

    const startTime = '2026-01-16T19:22:00+00:00';
    const endTime = '2026-01-16T19:23:00+00:00';

    const { data, error } = await supabase
        .from('movements')
        .select('*')
        .gte('created_at', startTime)
        .lte('created_at', endTime);

    if (error) console.error('Error:', error);
    else {
        console.log(`Found ${data.length} movements`);
        data.forEach(m => {
            console.log(` - [${m.created_at}] ${m.type}: ${m.product_name} (SKU: ${m.sku}) Reason: ${m.reason}`);
        });
    }
}

findMovements();
