// Crear/actualizar perfil de luisar2ro@gmail.com en Supabase con módulos de admin
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

async function fixUserProfile() {
    console.log(`\n🔧 Buscando perfil de ${USER_EMAIL}...\n`);

    // Buscar usuario existente
    const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', USER_EMAIL)
        .maybeSingle();

    if (existingUser) {
        console.log('📋 Usuario encontrado. Actualizando módulos...');
        console.log(`   ID: ${existingUser.id}`);
        console.log(`   Rol actual: ${existingUser.role}`);
        console.log(`   Módulos actuales:`, existingUser.modules || 'NINGUNO');

        // Actualizar módulos
        const { error: updateError } = await supabase
            .from('users')
            .update({
                modules: ADMIN_MODULES,
                role: 'admin',
                active: true,
                company_id: TOYOMACHO_SAN_FELIX_ID
            })
            .eq('id', existingUser.id);

        if (updateError) {
            console.log('\n❌ Error actualizando:', updateError.message);
        } else {
            console.log('\n✅ Perfil actualizado con módulos de admin');
        }
    } else {
        console.log('⚠️ Usuario no existe en Supabase. Creando perfil...');

        // Crear nuevo perfil
        const { error: insertError } = await supabase
            .from('users')
            .insert({
                email: USER_EMAIL,
                display_name: 'Luis Rivas',
                role: 'admin',
                active: true,
                modules: ADMIN_MODULES,
                company_id: TOYOMACHO_SAN_FELIX_ID,
                created_at: new Date().toISOString()
            });

        if (insertError) {
            console.log('\n❌ Error creando perfil:', insertError.message);
        } else {
            console.log('\n✅ Perfil creado exitosamente con módulos de admin');
        }
    }

    // Verificar resultado
    const { data: finalUser } = await supabase
        .from('users')
        .select('email, role, active, modules')
        .eq('email', USER_EMAIL)
        .single();

    if (finalUser) {
        console.log('\n📋 Estado final:');
        console.log(`   Email: ${finalUser.email}`);
        console.log(`   Rol: ${finalUser.role}`);
        console.log(`   Activo: ${finalUser.active}`);
        console.log(`   Módulos: ${Object.keys(finalUser.modules || {}).length} configurados`);
    }

    console.log('\n💡 RECARGA LA PÁGINA (F5) para ver los módulos en el sidebar.\n');
    process.exit(0);
}

fixUserProfile();
