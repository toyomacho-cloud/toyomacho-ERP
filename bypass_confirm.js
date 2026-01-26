
const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTQ1NSwiZXhwIjoyMDg0MDY1NDU1fQ.WlZyjCR--cXGGQztPCnFCAooIi2EacICZVDQUgVgJTc';

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function confirmUser(email) {
    console.log(`Manually confirming email for: ${email}`);

    // 1. Get Auth User ID
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error('User not found in Auth!');
        return;
    }

    console.log(`Found Auth User: ${user.id}`);

    // 2. Update User to set email_confirmed_at
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true } // Some libraries support this, or we set metadata
    );
    // Note: email_confirm might not be exposed directly in all update methods for valid reasons.
    // But updateUserById usually allows confirming.
    // Alternatively usually the proper way is `supabase.auth.admin.updateUserById(uid, { email_confirmed_at: new Date() })` doesn't work directly in standard client sometimes.
    // Let's try checking `updateUserById` docs or just try setting the attribute.

    // Using REST API for direct admin update is often safer for this specific field if the SDK wrapper is restrictive.
    // But `admin.updateUserById` usually allows changing `email_confirm` to true implicitly updates the timestamp?
    // Let's try `supabase.auth.admin.updateUserById(user.id, { email_confirmed_at: new Date().toISOString() })`.

    const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirmed_at: new Date().toISOString() }
    );

    if (error) {
        console.error('Confirmation Failed:', error);
    } else {
        console.log('SUCCESS! User email confirmed manually.');
        console.log('Confirmed At:', data.user.email_confirmed_at);
    }
}

confirmUser('pblromero404@gmail.com');
