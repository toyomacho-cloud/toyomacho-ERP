
const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

async function checkStatus() {
    console.log('Checking status for pblromero404@gmail.com...');

    // Attempt login with the temp password I set
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
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

    const data = await response.json();

    if (response.ok) {
        console.log('SUCCESS: Login worked! The user is confirmed and password is correct.');
    } else {
        console.log('Login Failed:', data);
        if (data.error_description === 'Email not confirmed') {
            console.log('STATUS: Email is STILL NOT CONFIRMED.');
        } else if (data.error_description === 'Invalid login credentials') {
            console.log('STATUS: Invalid credentials. Either password is wrong OR email not confirmed (Supabase hides detail sometimes).');
            // Try to signup again to see if user exists
            await probeUserExistence();
        }
    }
}

async function probeUserExistence() {
    const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
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
    const data = await response.json();
    console.log('Probe Signup Data:', data);
    if (data.msg === 'User already registered') {
        console.log('User DEFINITELY exists.');
        // If we get here and login failed, it's 99% email confirmation needed.
    }
}

checkStatus();
