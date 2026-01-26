// Script para verificar y arreglar la asignación de compañía del usuario
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ombjcmefbpxgruxdvnjl.supabase.co',
    'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P'
);

async function diagnose() {
    console.log('\n🔍 DIAGNÓSTICO DE COMPAÑÍA\n');

    // 1. Verificar usuarios
    console.log('📋 Usuarios en el sistema:');
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (usersError) {
        console.error('Error:', usersError.message);
        return;
    }

    users.forEach(u => {
        console.log(`  - ${u.email}`);
        console.log(`    Company ID: ${u.company_id || '❌ SIN COMPAÑÍA'}`);
        console.log(`    Rol: ${u.role}`);
        console.log(`    Activo: ${u.active}`);
        console.log('');
    });

    // 2. Verificar compañías
    console.log('🏢 Compañías en el sistema:');
    const { data: companies, error: compError } = await supabase
        .from('companies')
        .select('*');

    if (compError) {
        console.error('Error:', compError.message);
        return;
    }

    if (companies.length === 0) {
        console.log('  ❌ NO HAY COMPAÑÍAS REGISTRADAS\n');
        console.log('  🔧 SOLUCIÓN: Crear compañía...\n');
        await createCompany();
    } else {
        companies.forEach(c => {
            console.log(`  - ${c.name} (ID: ${c.id})`);
            console.log(`    RIF: ${c.rif}`);
            console.log(`    Owner: ${c.owner_id || 'Sin dueño'}`);
            console.log('');
        });

        // Asignar compañía a usuarios sin compañía
        const usersWithoutCompany = users.filter(u => !u.company_id);
        if (usersWithoutCompany.length > 0) {
            console.log('🔧 Asignando compañía a usuarios...\n');
            const mainCompany = companies[0];

            for (const user of usersWithoutCompany) {
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ company_id: mainCompany.id })
                    .eq('id', user.id);

                if (updateError) {
                    console.log(`  ❌ Error asignando a ${user.email}: ${updateError.message}`);
                } else {
                    console.log(`  ✅ ${user.email} → ${mainCompany.name}`);
                }
            }
        }
    }

    console.log('\n✅ Diagnóstico completado.\n');
}

async function createCompany() {
    const { data: adminUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'admin@toyomacho.com')
        .single();

    if (!adminUser) {
        console.log('  ⚠️ No se encontró usuario admin');
        return;
    }

    const { data: newCompany, error } = await supabase
        .from('companies')
        .insert({
            name: 'TOYOMACHO SAN FELIX',
            rif: 'J-123456789',
            owner_id: adminUser.uid,
            members: [adminUser.uid],
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.log(`  ❌ Error creando compañía: ${error.message}`);
        return;
    }

    console.log(`  ✅ Compañía creada: ${newCompany.name}`);

    // Asignar a usuarios
    const { data: allUsers } = await supabase
        .from('users')
        .select('*');

    for (const user of allUsers) {
        await supabase
            .from('users')
            .update({ company_id: newCompany.id })
            .eq('id', user.id);
    }

    console.log(`  ✅ Todos los usuarios asignados a ${newCompany.name}\n`);
}

diagnose();
