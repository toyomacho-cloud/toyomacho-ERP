import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYmpjbWVmYnB4Z3J1eGR2bmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODk0NTUsImV4cCI6MjA4NDA2NTQ1NX0.7LnGOYhv6R1OHj6YfpDNPEr78YXbMm3Dgh4cYQmJI5A';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log('--- SCHEMA CHECK ---');

    // Login first to bypass RLS
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'luisar2ro@gmail.com',
        password: 'Nova2026!'
    });

    if (authError) {
        console.error('Login Error:', authError.message);
        return;
    }

    const COMPANY_ID = 'f021036e-bbf5-4151-b59d-ac5a0d295d81';

    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', COMPANY_ID)
        .limit(1);

    if (error) {
        console.error('Fetch Error:', error);
    }

    if (products && products.length > 0) {
        console.log('Full Product Object Keys:', Object.keys(products[0]));
        console.log('Sample Product:', JSON.stringify(products[0], null, 2));
    } else {
        console.log('No products found to inspect.');
    }
}

checkSchema();
