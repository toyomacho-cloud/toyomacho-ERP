
const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTQ1NSwiZXhwIjoyMDg0MDY1NDU1fQ.WlZyjCR--cXGGQztPCnFCAooIi2EacICZVDQUgVgJTc';

async function confirmUser(email) {
    console.log(`Manually confirming email via REST for: ${email}`);

    // 1. Get List of Users to find UID
    console.log('Listing users...');
    const listResp = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
        }
    });

    if (!listResp.ok) {
        console.error('List Failed:', await listResp.text());
        return;
    }

    const { users } = await listResp.json();
    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('User not found!');
        return;
    }

    console.log(`Found User ID: ${user.id}`);

    // 2. Update User
    console.log('Updating email_confirmed_at...');
    const updateResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email_confirmed_at: new Date().toISOString()
        })
    });

    const updateData = await updateResp.json();

    if (updateResp.ok) {
        console.log('SUCCESS! User confirmed manually.');
        console.log('Current Status:', updateData.email_confirmed_at);
    } else {
        console.error('Update Failed:', updateData);
    }
}

confirmUser('pblromero404@gmail.com');
