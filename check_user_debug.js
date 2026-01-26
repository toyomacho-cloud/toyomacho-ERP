
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    console.log('Checking user pblromero404@gmail.com...');

    // Check public users table
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'pblromero404@gmail.com');

    if (error) {
        console.error('Error querying users table:', error);
    } else {
        console.log('Public table results:', data);
        if (data.length === 0) {
            console.log('User NOT found in public table.');
        } else {
            console.log('User FOUND in public table. Active status:', data[0].active);
        }
    }

    // Try to signIn to see if Auth exists (we expect it to fail, but the error message tells us if user exists or not)
    // Actually signInWithPassword gives "Invalid login credentials" for both wrong password AND non-existent user often (security)
    // BUT we can try to SignUp. If it says "User already registered", then Auth exists.

    console.log('Attempting to detect Auth existence via SignUp...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'pblromero404@gmail.com',
        password: 'TemporaryPassword123!' // Dummy password
    });

    if (authError) {
        console.log('SignUp result:', authError.message);
    } else {
        console.log('SignUp succeeded! User was created (meaning they did NOT exist before).');
        // Note: If email confirmation is on, they still can't login, but now they exist.
        // We probably shouldn't have done this if we wanted to be read-only, but this is a fix script.
        // If they didn't exist, we just created them, so now they do exist with this temp password.
    }
}

checkUser();
