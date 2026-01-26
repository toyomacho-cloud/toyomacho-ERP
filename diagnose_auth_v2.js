
const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

async function diagnoseAuth() {
    console.log('Diagnosing Auth Configuration 2.0...');
    const testEmail = `dn_test_${Date.now()}@gmail.com`;
    const testPass = 'TestPass123!';

    // 1. Try SignUp
    console.log(`1. Attempting SignUp with ${testEmail}...`);
    const signupResp = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: testEmail,
            password: testPass
        })
    });

    const signupData = await signupResp.json();
    console.log('SignUp Data:', signupData);

    if (signupData.user && !signupData.session) {
        console.warn('WARNING: SignUp returned User but NO Session. Email confirmation is likely REQUIRED.');

        // 2. Try Login immediately (expected to fail if confirmation required)
        console.log('2. Attempting Login immediately...');
        const loginResp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: testEmail,
                password: testPass
            })
        });

        const loginData = await loginResp.json();
        console.log('Login Response:', loginData);
        if (loginData.error_description === 'Email not confirmed') {
            console.error('CONCLUSION: Email confirmation is REQUIRED.');
        } else {
            console.error('Login Failed with other error:', loginData);
        }

    } else if (signupData.user && signupData.session) {
        console.log('SUCCESS: SignUp returned Session. Email confirmation is NOT required.');
        console.log('CONCLUSION: Auth is working fine for new users without confirmation.');
    } else {
        console.error('SignUp Failed:', signupData);
    }
}

diagnoseAuth();
