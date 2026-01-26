
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYmpjbWVmYnB4Z3J1eGR2bmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODk0NTUsImV4cCI6MjA4NDA2NTQ1NX0.24D39sDqKzTTsw7Wzmj-rIbC9e7KxSkb-8wb2O4Kq2E'; // Anon Key from src/supabase.js

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    console.log('Testing Anonymous Access...');

    // Try to read companies
    const { data: companies, error } = await supabase.from('companies').select('*').limit(1);

    if (error) {
        console.log('Read Companies Error:', error.message);
    } else {
        console.log('Read Companies Success! Count:', companies.length);
    }

    // Try to read users
    const { data: users, error: userError } = await supabase.from('users').select('*').limit(1);
    if (userError) {
        console.log('Read Users Error:', userError.message);
    } else {
        console.log('Read Users Success! Count:', users.length);
    }
}

checkRLS();
