import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const supabaseUrl = 'https://wfxbzcndaqsvwflqmxei.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmeGJ6Y25kYXFzdndmbHFteGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5OTE1NjgsImV4cCI6MjA0ODU2NzU2OH0.WfbfnDpuZp0R0WIqePiB9iPHBx-WsZnBdA3Bwno2VJ4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCashSessionCreation() {
    console.log('=== Testing Cash Session Creation ===\n');

    try {
        // Test 1: Check if cash_sessions table exists
        console.log('1. Checking if cash_sessions table exists...');
        const { data: existingData, error: checkError } = await supabase
            .from('cash_sessions')
            .select('*')
            .limit(1);

        if (checkError) {
            console.error('❌ Table query error:', checkError);
            return;
        }
        console.log('✅ cash_sessions table exists');
        console.log(`   Found ${existingData?.length || 0} existing records\n`);

        // Test 2: Try to insert a test session
        console.log('2. Attempting to create test cash session...');
        const testSession = {
            company_id: 1, // Assuming company_id 1 exists
            cashier_id: 'test_user_123',
            cashier_name: 'Test Cashier',
            status: 'open',
            opening_usd: 100,
            opening_bs: 0,
            opened_at: new Date().toISOString()
        };

        const { data: insertData, error: insertError } = await supabase
            .from('cash_sessions')
            .insert(testSession)
            .select()
            .single();

        if (insertError) {
            console.error('❌ Insert error:', insertError);
            console.error('   Error code:', insertError.code);
            console.error('   Error details:', insertError.details);
            console.error('   Error hint:', insertError.hint);
            console.error('   Error message:', insertError.message);
        } else {
            console.log('✅ Successfully created cash session!');
            console.log('   Session ID:', insertData.id);
            console.log('   Session data:', JSON.stringify(insertData, null, 2));

            // Clean up test data
            console.log('\n3. Cleaning up test session...');
            const { error: deleteError } = await supabase
                .from('cash_sessions')
                .delete()
                .eq('id', insertData.id);

            if (deleteError) {
                console.error('❌ Could not delete test session:', deleteError);
            } else {
                console.log('✅ Test session deleted');
            }
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

testCashSessionCreation();
