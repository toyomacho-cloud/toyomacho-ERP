import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listPendingSales() {
    console.log('🔍 Searching for PENDING sales (En Caja)...');

    // Get today's range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: sales, error } = await supabase
        .from('sales')
        .select(`
            id, 
            created_at, 
            amount_usd, 
            status, 
            payment_status, 
            client_name,
            customers (name)
        `)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .or('status.eq.pending,payment_status.eq.pending');

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    if (sales.length === 0) {
        console.log('✅ No pending sales found for today.');
    } else {
        console.log(`⚠️ Found ${sales.length} pending sales:`);
        sales.forEach(s => {
            const time = new Date(s.created_at).toLocaleTimeString();
            console.log(`- [${time}] ID: ${s.id.slice(0, 8)}... | Cliente: ${s.client_name || s.customers?.name || 'N/A'} | Monto: $${s.amount_usd}`);
        });
    }
}

listPendingSales();
