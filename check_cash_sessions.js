
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseKey = 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCashSessions() {
    console.log('Checking cash_sessions table...');

    const { data: sessions, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .in('status', ['open', 'pending_verification']);

    if (error) {
        console.error('Error fetching sessions:', error);
        return;
    }

    console.log(`Found ${sessions.length} open/pending sessions.`);

    if (sessions.length > 0) {
        sessions.forEach(session => {
            console.log('--------------------------------------------------');
            console.log(`Session ID: ${session.id}`);
            console.log(`Company ID: ${session.company_id}`);
            console.log(`Status:     ${session.status}`);
            console.log(`Opened At:  ${session.opened_at}`);
            console.log(`Cashier:    ${session.cashier_name}`);
        });
    } else {
        console.log('No open sessions found.');
    }
}

checkCashSessions();
