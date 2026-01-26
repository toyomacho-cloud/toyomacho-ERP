// Script para diagnosticar y arreglar acceso a compañía
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bqczdtdpadmwugzcvcrg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxY3pkdGRwYWRtd3VnemN2Y3JnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzAzNjEzNiwiZXhwIjoyMDUyNjEyMTM2fQ.hWCdLYhv3aXUunVOQnP5Q5dFejt8a7BX2InBvJ54jxQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function diagnoseAndFix() {
    console.log('🔍 Diagnosticando acceso a compañía...\n');

    // 1. Obtener todas las compañías
    const { data: companies, error: compError } = await supabase.from('companies').select('*');

    if (compError) {
        console.error('❌ Error obteniendo compañías:', compError);
        return;
    }

    console.log(`📊 Compañías encontradas: ${companies?.length || 0}`);
    companies?.forEach(c => {
        console.log(`  - ${c.name} (ID: ${c.id})`);
        console.log(`    Owner: ${c.owner_id}`);
        console.log(`    Members: ${JSON.stringify(c.members)}`);
    });

    // 2. Obtener usuario
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'luisar2ro@gmail.com');

    if (userError) {
        console.error('❌ Error obteniendo usuario:', userError);
    }

    console.log('\n👤 Usuario encontrado:', users?.length > 0 ? 'Sí' : 'No');
    if (users?.length > 0) {
        console.log(`  UID: ${users[0].uid}`);
        console.log(`  Email: ${users[0].email}`);
    }

    // 3. Si hay compañía y usuario, agregar como miembro
    if (companies?.length > 0 && users?.length > 0) {
        const company = companies[0];
        const user = users[0];

        let members = company.members || [];
        if (!members.includes(user.uid)) {
            members.push(user.uid);

            console.log('\n🔧 Agregando usuario a members de compañía...');
            const { error: updateError } = await supabase
                .from('companies')
                .update({
                    members: members,
                    owner_id: user.uid // También establecer como owner
                })
                .eq('id', company.id);

            if (updateError) {
                console.error('❌ Error actualizando:', updateError);
            } else {
                console.log('✅ Usuario agregado exitosamente como miembro y owner!');
            }
        } else {
            console.log('\n✅ Usuario ya es miembro de la compañía');
        }
    } else if (companies?.length === 0) {
        console.log('\n⚠️ No hay compañías. Creando una...');

        // Obtener el UID del auth user
        const { data: authData } = await supabase.auth.admin.listUsers();
        const authUser = authData?.users?.find(u => u.email === 'luisar2ro@gmail.com');

        if (authUser) {
            const { data: newCompany, error: createError } = await supabase
                .from('companies')
                .insert({
                    name: 'TOYOMACHO SAN FELIX',
                    rif: 'J-123456789',
                    owner_id: authUser.id,
                    members: [authUser.id],
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                console.error('❌ Error creando compañía:', createError);
            } else {
                console.log('✅ Compañía creada:', newCompany.name);
            }
        }
    }

    console.log('\n✅ Diagnóstico completado. Recarga la página.');
}

diagnoseAndFix().catch(console.error);
