// Diagnóstico y corrección de acceso a empresa
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYmpjbWVmYnB4Z3J1eGR2bmpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTQ1NSwiZXhwIjoyMDg0MDY1NDU1fQ.WlZyjCR--cXGGQztPCnFCAooIi2EacICZVDQUgVgJTc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseAndFix() {
    console.log('=== Diagnóstico de Acceso a Empresa ===\n');

    // 1. Ver usuarios de Supabase Auth
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    console.log('Usuarios en Supabase Auth:');
    authUsers?.users?.forEach(u => console.log(`  ${u.email}: auth_id=${u.id}`));

    // 2. Ver usuarios en tabla users
    const { data: dbUsers } = await supabase.from('users').select('id, email, uid, company_id');
    console.log('\nUsuarios en tabla users:');
    dbUsers?.forEach(u => console.log(`  ${u.email}: table_id=${u.id}, uid=${u.uid}, company_id=${u.company_id}`));

    // 3. Ver empresas y sus miembros
    const { data: companies } = await supabase.from('companies').select('id, name, members, owner_id');
    console.log('\nEmpresas:');
    companies?.forEach(c => console.log(`  ${c.name}: id=${c.id}, members=${JSON.stringify(c.members)}, owner=${c.owner_id}`));

    // 4. Mapeo de usuarios Auth a empresa
    // El usuario logueado con email X tiene auth_id Y
    // Pero la empresa tiene members=[] que debe incluir Y
    console.log('\n=== Corrección ===');

    for (const authUser of authUsers?.users || []) {
        // Buscar el usuario en la tabla users por email
        const dbUser = dbUsers?.find(u => u.email?.toLowerCase() === authUser.email?.toLowerCase());
        if (dbUser && dbUser.company_id) {
            // Buscar la empresa
            const company = companies?.find(c => c.id === dbUser.company_id);
            if (company) {
                // Agregar el auth_id a members si no está
                const members = company.members || [];
                if (!members.includes(authUser.id)) {
                    members.push(authUser.id);
                    const { error } = await supabase
                        .from('companies')
                        .update({ members })
                        .eq('id', company.id);
                    if (!error) {
                        console.log(`✓ Agregado ${authUser.email} (${authUser.id}) a empresa ${company.name}`);
                    } else {
                        console.log(`✗ Error agregando a empresa: ${error.message}`);
                    }
                }
            }
        }
    }

    console.log('\n=== Verificación Final ===');
    const { data: finalCompanies } = await supabase.from('companies').select('id, name, members');
    finalCompanies?.forEach(c => console.log(`  ${c.name}: members=${JSON.stringify(c.members)}`));
}

diagnoseAndFix().catch(console.error);
