import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYmpjbWVmYnB4Z3J1eGR2bmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODk0NTUsImV4cCI6MjA4NDA2NTQ1NX0.7LnGOYhv6R1OHj6YfpDNPEr78YXbMm3Dgh4cYQmJI5A';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkFullMigration() {
    console.log('--- FULL MIGRATION AUDIT ---');

    // 1. Login as Admin to bypass RLS
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'luisar2ro@gmail.com',
        password: 'Nova2026!'
    });

    if (authError) {
        console.error('FATAL: Login failed', authError.message);
        return;
    }
    console.log(`Logged in as: ${user.email}`);

    // 2. Check Companies
    const { data: companies, count: companiesCount, error: coError } = await supabase
        .from('companies')
        .select('id, name', { count: 'exact' });

    if (coError) console.error('Companies Error:', coError.message);
    else {
        console.log(`\n📋 COMPANIES FOUND: ${companiesCount}`);
        companies.forEach(c => console.log(` - [${c.id}] ${c.name}`));
    }

    // 3. Check Users
    const { count: usersCount, error: uError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
    console.log(`\n👥 USERS COUNT: ${usersCount} (Error: ${uError?.message || 'None'})`);

    // 4. Check Movements (Traceability)
    const { count: movCount, error: mError } = await supabase
        .from('movements')
        .select('*', { count: 'exact', head: true });
    console.log(`\n📉 MOVEMENTS HISTORY (Traceability): ${movCount} (Error: ${mError?.message || 'None'})`);

    // 5. Check Inventory per Company
    if (companies && companies.length > 0) {
        console.log('\n📦 INVENTORY BY COMPANY:');
        for (const company of companies) {
            const { count } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', company.id);
            console.log(` - ${company.name}: ${count} products`);
        }
    }
}

checkFullMigration();
