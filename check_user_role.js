// Check user role in Supabase for pblromero404@gmail.com
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserRole() {
    console.log('Checking role for pblromero404@gmail.com...\n');

    // Check in users table
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', '%pblromero404%');

    if (usersError) {
        console.log('Users table error:', usersError.message);
    } else {
        console.log('Users table results:');
        users.forEach(u => {
            console.log(`  Email: ${u.email}`);
            console.log(`  Role: ${u.role}`);
            console.log(`  Company ID: ${u.company_id}`);
            console.log('---');
        });
    }

    // Check in user_profiles table
    const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('email', '%pblromero404%');

    if (profilesError) {
        console.log('Profiles table error:', profilesError.message);
    } else if (profiles && profiles.length > 0) {
        console.log('\nUser profiles results:');
        profiles.forEach(p => {
            console.log(`  Email: ${p.email}`);
            console.log(`  Role: ${p.role}`);
            console.log('---');
        });
    }

    process.exit(0);
}

checkUserRole();
