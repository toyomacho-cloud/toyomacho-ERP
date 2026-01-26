
const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

async function fixUser() {
    console.log('Fixing user pblromero404@gmail.com linkage...');

    // 1. Login to get the new Auth UUID
    console.log('Logging in to get Auth UUID...');
    const loginResp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: 'pblromero404@gmail.com',
            password: 'TemporaryPassword123!'
        })
    });

    const loginData = await loginResp.json();

    if (!loginResp.ok) {
        console.error('Login failed:', loginData);
        return;
    }

    const newAuthId = loginData.user.id;
    console.log('Auth UUID found:', newAuthId);

    // 2. Update the public users table to match this UUID
    // We search by EMAIL to find the record with the old UID
    console.log(`Updating users table for email pblromero404@gmail.com to set uid=${newAuthId}...`);

    const updateResp = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.pblromero404@gmail.com`, {
        method: 'PATCH',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            uid: newAuthId
        })
    });

    if (updateResp.ok) {
        const updated = await updateResp.json();
        console.log('SUCCESS! User linked.', updated);
    } else {
        console.error('Update failed:', await updateResp.text());
    }
}

fixUser();
