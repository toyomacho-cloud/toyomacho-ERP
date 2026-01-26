
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTQ1NSwiZXhwIjoyMDg0MDY1NDU1fQ.WlZyjCR--cXGGQztPCnFCAooIi2EacICZVDQUgVgJTc';

const supabase = createClient(supabaseUrl, supabaseKey);

const ALL_MODULES = {
    dashboard: true,
    inventory: true,
    control: true,
    purchases: true,
    pos: true,
    cashregister: true,
    receivables: true,
    clients: true,
    mail: true,
    reports: true,
    article177: true,
    settings: true
};

async function promote() {
    const email = 'luisar2ro@gmail.com';
    console.log(`Searching for ${email}...`);

    // 1. Check if user exists
    const { data: users, error: searchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

    if (searchError) {
        console.error("Search Error:", searchError);
        return;
    }

    if (!users || users.length === 0) {
        console.error("User not found!");
        return;
    }

    const user = users[0];
    console.log(`Found: ${user.display_name} (Role: ${user.role})`);

    // 2. Update
    const { error: updateError } = await supabase
        .from('users')
        .update({
            role: 'admin',
            modules: ALL_MODULES,
            active: true
        })
        .eq('id', user.id); // Try 'id' first (often the internal PK)

    if (updateError) {
        console.error("Update Error:", updateError);
        // Try with 'uid' if 'id' failed
        const { error: updateError2 } = await supabase
            .from('users')
            .update({
                role: 'admin',
                modules: ALL_MODULES,
                active: true
            })
            .eq('uid', user.uid);

        if (updateError2) {
            console.error("Update Error (uid):", updateError2);
        } else {
            console.log("SUCCESS (via uid)!");
        }

    } else {
        console.log("SUCCESS (via id)!");
    }
}

promote();
