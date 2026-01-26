
const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

async function checkUser() {
    console.log('Checking user pblromero404@gmail.com via REST...');

    // 1. Check public users table
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.pblromero404@gmail.com&select=*`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const data = await response.json();
        console.log('Public table results:', data);

        if (data.length > 0) {
            console.log(`User active status: ${data[0].active}`);
        }
    } catch (e) {
        console.error('Error querying public table:', e);
    }

    // 2. Attempt SignUp to probe Auth existence
    console.log('Probing Auth existence via SignUp...');
    try {
        const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'pblromero404@gmail.com',
                password: 'TemporaryPassword123!' // Dummy password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.log('SignUp Result:', data.msg || data.error_description || data);
            if (data.msg === 'User already registered') {
                console.log('CONCLUSION: User ALREADY EXISTS in Auth. Password refers to this existing account.');
            }
        } else {
            console.log('SignUp Succeeded (User created now):', data);
            console.log('CONCLUSION: User DID NOT EXIST in Auth. We just created it with temp password.');
        }

    } catch (e) {
        console.error('Error probing Auth:', e);
    }
}

checkUser();
