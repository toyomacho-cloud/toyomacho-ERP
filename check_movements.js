// Test script to check movements table structure and insert
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYmpjbWVmYnB4Z3J1eGR2bmpscm9sZSI6ImFub24iLCJpYXQiOjE3MzMxMDkyMTEsImV4cCI6MjA0ODY4NTIxMX0.sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMovementsSchema() {
    // Try to fetch any existing movement to see the structure
    const { data: movements, error: fetchError } = await supabase
        .from('movements')
        .select('*')
        .limit(3);

    console.log('=== Existing Movements (sample) ===');
    if (fetchError) {
        console.error('Fetch Error:', fetchError);
    } else {
        console.log('Sample movements:', JSON.stringify(movements, null, 2));
        if (movements && movements.length > 0) {
            console.log('Column names:', Object.keys(movements[0]));
        } else {
            console.log('No movements found in table');
        }
    }

    // Try a test insert to see what columns are valid
    console.log('\n=== Testing Insert ===');
    const testInsert = {
        company_id: 'test-company-id',
        product_id: 'test-product-id',
        sku: 'TEST-SKU',
        product_name: 'Test Product',
        type: 'Entrada',
        quantity: 1,
        status: 'pending',
        created_by: 'Test User',
        location: 'Test Location',
        reason: 'Test Reason',
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
    };

    console.log('Attempting to insert:', testInsert);

    // Don't actually insert, just check what the error would be
    const { data: insertResult, error: insertError } = await supabase
        .from('movements')
        .insert(testInsert)
        .select()
        .single();

    if (insertError) {
        console.error('Insert Error:', insertError.message);
        console.error('Full error:', insertError);
    } else {
        console.log('Insert succeeded! Data:', insertResult);
        // Delete the test row
        if (insertResult?.id) {
            await supabase.from('movements').delete().eq('id', insertResult.id);
            console.log('Test row deleted');
        }
    }
}

checkMovementsSchema().catch(console.error);
