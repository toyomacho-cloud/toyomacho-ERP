import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYmpjbWVmYnB4Z3J1eGR2bmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODk0NTUsImV4cCI6MjA4NDA2NTQ1NX0.7LnGOYhv6R1OHj6YfpDNPEr78YXbMm3Dgh4cYQmJI5A';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkInventoryWithAuth() {
    console.log('--- AUTHENTICATED INVENTORY CHECK ---');

    // 1. Login
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'luisar2ro@gmail.com',
        password: 'Nova2026!'
    });

    if (authError) {
        console.error('Login Failed:', authError.message);
        return;
    }
    console.log(`Logged in as: ${user.email} (${user.id})`);

    // 2. Verified Company Count (ID: f021036e-bbf5-4151-b59d-ac5a0d295d81)
    const COMPANY_ID = 'f021036e-bbf5-4151-b59d-ac5a0d295d81';

    // Check access to products
    const { count: companyCount, error: companyError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', COMPANY_ID);

    if (companyError) {
        console.error('Company Products Query Error:', companyError.message);
    } else {
        console.log(`Company (${COMPANY_ID}) Products Count: ${companyCount}`);
    }

    // 3. List some actual products to verify structure
    const { data: products, error: dataError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', COMPANY_ID)
        .limit(3);

    if (dataError) {
        console.error('Data Fetch Error:', dataError.message);
    } else if (products.length === 0) {
        console.log('NO PRODUCTS FOUND for this company.');
    } else {
        console.log('First 3 Products found:', products.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku
        })));
    }
}

checkInventoryWithAuth();
