
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P'; // Explicitly testing this weird key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKey() {
    console.log('Testing Key: ' + supabaseKey);

    // Simple ping
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

    if (error) {
        console.log('FAIL:', error.message);
    } else {
        console.log('SUCCESS! Key works. Count:', count);
    }
}

checkKey();
