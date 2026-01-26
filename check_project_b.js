
const { createClient } = require('@supabase/supabase-js');

// Project B (found in fix-company-access.js)
const urlB = 'https://bqczdtdpadmwugzcvcrg.supabase.co';
const keyB = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxY3pkdGRwYWRtd3VnemN2Y3JnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzAzNjEzNiwiZXhwIjoyMDUyNjEyMTM2fQ.hWCdLYhv3aXUunVOQnP5Q5dFejt8a7BX2InBvJ54jxQ';

async function checkProjectB() {
    console.log('Testing Project B Credentials...');
    try {
        const supabase = createClient(urlB, keyB);
        const { data: { users }, error } = await supabase.auth.admin.listUsers();

        if (error) {
            console.error('Project B Access Failed:', error.message);
        } else {
            console.log(`Success! Project B has ${users.length} users.`);
            const user = users.find(u => u.email.includes('pblromero'));
            if (user) {
                console.log('Found pblromero404 in Project B!');
                console.log('Confirmed?', user.email_confirmed_at);
            } else {
                console.log('pblromero404 NOT found in Project B.');
            }
        }
    } catch (e) {
        console.error('Crash:', e);
    }
}

checkProjectB();
