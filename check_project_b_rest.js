
const urlB = 'https://bqczdtdpadmwugzcvcrg.supabase.co';
const keyB = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxY3pkdGRwYWRtd3VnemN2Y3JnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzAzNjEzNiwiZXhwIjoyMDUyNjEyMTM2fQ.hWCdLYhv3aXUunVOQnP5Q5dFejt8a7BX2InBvJ54jxQ';

async function check() {
    console.log('Fetching users from Project B via REST...');
    try {
        const resp = await fetch(`${urlB}/auth/v1/admin/users`, {
            headers: {
                'apikey': keyB,
                'Authorization': `Bearer ${keyB}`
            }
        });

        if (!resp.ok) {
            console.log('Error:', await resp.text());
            return;
        }

        const data = await resp.json();
        const users = data.users || [];
        console.log(`Users found: ${users.length}`);

        const target = users.find(u => u.email.includes('pblromero'));
        if (target) {
            console.log(`FOUND: ${target.email}`);
            console.log(`ID: ${target.id}`);
            console.log(`Confirmed At: ${target.email_confirmed_at}`);
        } else {
            console.log('User pblromero NOT found in Project B.');
            users.forEach(u => console.log(` - ${u.email}`));
        }
    } catch (e) {
        console.error(e);
    }
}

check();
