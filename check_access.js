
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccess() {
    console.log('Checking Public Access to Users table...');

    // Try to fetch ONE user
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1);

    if (error) {
        console.log('ACCESS DENIED:', error.message);
    } else {
        console.log('ACCESS GRANTED!');
        console.log('Sample Data:', data);
    }
}

checkAccess();
