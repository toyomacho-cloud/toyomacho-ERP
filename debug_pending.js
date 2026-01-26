import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPending() {
    console.log('🔧 Fixing pending sale...');
    const id = 'd2fede49-1982-4386-a9ed-21ca158e3d9b';

    const { error } = await supabase
        .from('sales')
        .update({ payment_status: 'paid' })
        .eq('id', id);

    if (error) {
        console.error('❌ Error updating:', error);
    } else {
        console.log('✅ Sale updated to payment_status: paid');
    }
}

fixPending();
