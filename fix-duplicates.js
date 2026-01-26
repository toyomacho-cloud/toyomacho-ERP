// Verificar y limpiar usuarios duplicados de luisar2ro@gmail.com
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ombjcmefbpxgruxdvnjl.supabase.co',
    'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P'
);

const ADMIN_MODULES = {
    dashboard: true,
    inventory: true,
    control: true,
    purchases: true,
    pos: true,
    cashregister: true,
    receivables: true,
    clients: true,
    mail: true,
    reports: true,
    article177: true,
    settings: true
};

const TOYOMACHO_SAN_FELIX_ID = 'f021036e-bbf5-4151-b59d-ac5a0d295d81';
const USER_EMAIL = 'luisar2ro@gmail.com';

async function fixDuplicates() {
    console.log(`\n🔍 Buscando todos los registros de ${USER_EMAIL}...\n`);

    // Buscar TODOS los usuarios con ese email (sin .single())
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', USER_EMAIL);

    console.log(`Encontrados: ${users?.length || 0} registros\n`);

    if (!users || users.length === 0) {
        console.log('❌ No hay usuarios con ese email.');
        console.log('Creando perfil nuevo...\n');

        const { error: insertErr } = await supabase
            .from('users')
            .insert({
                email: USER_EMAIL,
                display_name: 'Luis Rivas',
                role: 'admin',
                active: true,
                modules: ADMIN_MODULES,
                company_id: TOYOMACHO_SAN_FELIX_ID
            });

        if (insertErr) {
            console.log('❌ Error:', insertErr.message);
        } else {
            console.log('✅ Usuario creado');
        }

        process.exit(0);
    }

    // Mostrar registros encontrados
    users.forEach((u, i) => {
        console.log(`📋 Registro ${i + 1}:`);
        console.log(`   ID: ${u.id}`);
        console.log(`   uid: ${u.uid || 'N/A'}`);
        console.log(`   email: ${u.email}`);
        console.log(`   role: ${u.role}`);
        console.log(`   active: ${u.active}`);
        console.log(`   modules: ${u.modules ? Object.keys(u.modules).length + ' módulos' : 'NINGUNO'}`);
        console.log(`   company_id: ${u.company_id || 'N/A'}`);
        console.log('');
    });

    if (users.length > 1) {
        console.log('⚠️ HAY DUPLICADOS! Esto causa el error 406.\n');
        console.log('Limpiando duplicados y dejando solo el primer registro...\n');

        // Mantener el primer registro, eliminar los demás
        const keepId = users[0].id;
        const deleteIds = users.slice(1).map(u => u.id);

        for (const id of deleteIds) {
            const { error: delErr } = await supabase
                .from('users')
                .delete()
                .eq('id', id);

            if (delErr) {
                console.log(`❌ Error eliminando ${id}: ${delErr.message}`);
            } else {
                console.log(`✅ Eliminado registro duplicado: ${id}`);
            }
        }

        console.log('');
    }

    // Actualizar el registro que queda con módulos de admin
    const mainUser = users[0];
    console.log('🔧 Actualizando registro principal con módulos de admin...');

    const { error: updateErr } = await supabase
        .from('users')
        .update({
            role: 'admin',
            active: true,
            modules: ADMIN_MODULES,
            company_id: TOYOMACHO_SAN_FELIX_ID
        })
        .eq('id', mainUser.id);

    if (updateErr) {
        console.log('❌ Error actualizando:', updateErr.message);
    } else {
        console.log('✅ Registro actualizado exitosamente');
    }

    // Verificar estado final
    console.log('\n📋 Verificación final...');
    const { data: finalUsers } = await supabase
        .from('users')
        .select('id, email, role, active, modules')
        .eq('email', USER_EMAIL);

    console.log(`\nTotal registros ahora: ${finalUsers?.length}`);
    if (finalUsers?.[0]) {
        console.log(`Módulos: ${Object.keys(finalUsers[0].modules || {}).length} configurados`);
    }

    console.log('\n💡 CIERRA SESIÓN, luego vuelve a entrar y recarga la página.\n');
    process.exit(0);
}

fixDuplicates();
