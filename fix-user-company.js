// Asignar empresa al usuario
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYmpjbWVmYnB4Z3J1eGR2bmpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTQ1NSwiZXhwIjoyMDg0MDY1NDU1fQ.WlZyjCR--cXGGQztPCnFCAooIi2EacICZVDQUgVgJTc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fix() {
    // Ver empresas disponibles
    const { data: companies } = await supabase.from('companies').select('id, name');
    console.log('Empresas disponibles:');
    companies?.forEach(c => console.log(`  ${c.id}: ${c.name}`));

    // Ver usuarios sin empresa
    const { data: users } = await supabase.from('users').select('id, email, company_id, role');
    console.log('\nUsuarios:');
    users?.forEach(u => console.log(`  ${u.email}: company_id=${u.company_id}, role=${u.role}`));

    // Asignar la primera empresa a usuarios sin company_id
    if (companies?.length > 0) {
        const defaultCompanyId = companies[0].id;
        console.log(`\nAsignando empresa "${companies[0].name}" a usuarios sin empresa...`);

        const { data, error } = await supabase
            .from('users')
            .update({ company_id: defaultCompanyId })
            .is('company_id', null)
            .select('email');

        if (error) {
            console.log('Error:', error.message);
        } else {
            console.log('Usuarios actualizados:', data?.length || 0);
            data?.forEach(u => console.log(`  - ${u.email}`));
        }
    }
}

fix().catch(console.error);
