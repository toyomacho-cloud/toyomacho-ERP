// Agregar admin@toyomacho.com a todas las compañías como miembro
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ombjcmefbpxgruxdvnjl.supabase.co',
    'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P'
);

async function addUserToAllCompanies() {
    console.log('\n🔧 Agregando usuario a todas las compañías...\n');

    // Obtener UID del usuario admin@toyomacho.com
    const { data: user } = await supabase
        .from('users')
        .select('uid, firebase_id')
        .eq('email', 'admin@toyomacho.com')
        .single();

    if (!user) {
        console.log('❌ Usuario no encontrado\n');
        process.exit(1);
    }

    const userUid = user.firebase_id || user.uid;
    console.log(`Usuario UID: ${userUid}\n`);

    // Obtener todas las compañías
    const { data: companies } = await supabase
        .from('companies')
        .select('*');

    console.log(`Total compañías: ${companies.length}\n`);

    for (const company of companies) {
        let members = company.members || [];

        // Agregar usuario si no está
        if (!members.includes(userUid)) {
            members.push(userUid);

            const { error } = await supabase
                .from('companies')
                .update({ members })
                .eq('id', company.id);

            if (error) {
                console.log(`❌ ${company.name}: ${error.message}`);
            } else {
                console.log(`✅ ${company.name}: Usuario agregado`);
            }
        } else {
            console.log(`   ${company.name}: Ya es miembro`);
        }
    }

    console.log('\n✅ Proceso completado\n');
    console.log('📋 INSTRUCCIONES:\n');
    console.log('1. Recarga la página (F5)');
    console.log('2. Busca el panel de "Empresa" en el sidebar');
    console.log('3. Verás un botón "Cambiar" abajo del nombre de la empresa\n');
    console.log('🏢 Ahora tienes acceso a ' + companies.length + ' compañías\n');

    process.exit(0);
}

addUserToAllCompanies();
