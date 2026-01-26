// Verificar y arreglar permisos de módulos del usuario admin@toyomacho.com
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ombjcmefbpxgruxdvnjl.supabase.co',
    'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P'
);

// Módulos por defecto para admin
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

async function fixUserModules() {
    console.log('\n🔍 Verificando permisos de módulos del usuario admin@toyomacho.com...\n');

    // Buscar usuario
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'admin@toyomacho.com')
        .single();

    if (error || !user) {
        console.log('❌ Usuario no encontrado:', error?.message);
        process.exit(1);
    }

    console.log('📋 Estado actual:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Rol: ${user.role}`);
    console.log(`   Activo: ${user.active}`);
    console.log(`   Módulos actuales:`, user.modules || 'NO DEFINIDOS');
    console.log('');

    // Verificar si tiene módulos
    if (!user.modules || Object.keys(user.modules).length === 0) {
        console.log('⚠️ Usuario sin módulos configurados. Asignando permisos de admin...\n');

        const { error: updateError } = await supabase
            .from('users')
            .update({
                modules: ADMIN_MODULES,
                role: 'admin'
            })
            .eq('id', user.id);

        if (updateError) {
            console.log('❌ Error actualizando:', updateError.message);
            process.exit(1);
        }

        console.log('✅ Módulos asignados correctamente:\n');
        Object.entries(ADMIN_MODULES).forEach(([mod, val]) => {
            console.log(`   ${val ? '✓' : '✗'} ${mod}`);
        });
    } else {
        console.log('✅ Usuario ya tiene módulos configurados.');

        // Verificar si son todos los módulos
        const missingModules = Object.keys(ADMIN_MODULES).filter(
            mod => !user.modules[mod]
        );

        if (missingModules.length > 0) {
            console.log(`\n⚠️ Faltan algunos módulos: ${missingModules.join(', ')}`);
            console.log('   Actualizando a permisos completos de admin...\n');

            const { error: updateError } = await supabase
                .from('users')
                .update({ modules: ADMIN_MODULES })
                .eq('id', user.id);

            if (updateError) {
                console.log('❌ Error:', updateError.message);
            } else {
                console.log('✅ Módulos actualizados correctamente.');
            }
        }
    }

    console.log('\n💡 Recarga la página (F5) para ver los cambios.\n');
    process.exit(0);
}

fixUserModules();
