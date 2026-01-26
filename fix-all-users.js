// Asignar módulos a TODOS los usuarios según su rol
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ombjcmefbpxgruxdvnjl.supabase.co',
    'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P'
);

// Módulos por rol
const MODULES_BY_ROLE = {
    admin: {
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
    },
    vendedor: {
        dashboard: true,
        inventory: true,
        control: false,
        purchases: false,
        pos: true,
        cashregister: true,
        receivables: true,
        clients: true,
        mail: true,
        reports: false,
        article177: false,
        settings: false
    },
    almacenista: {
        dashboard: true,
        inventory: true,
        control: true,
        purchases: true,
        pos: false,
        cashregister: false,
        receivables: false,
        clients: true,
        mail: true,
        reports: false,
        article177: false,
        settings: false
    }
};

const TOYOMACHO_SAN_FELIX_ID = 'f021036e-bbf5-4151-b59d-ac5a0d295d81';

async function fixAllUsers() {
    console.log('\n🔧 Arreglando módulos de TODOS los usuarios...\n');

    // Obtener todos los usuarios
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('active', true);

    if (error) {
        console.log('❌ Error obteniendo usuarios:', error.message);
        process.exit(1);
    }

    console.log(`📋 Encontrados ${users.length} usuarios activos:\n`);

    for (const user of users) {
        const role = user.role || 'vendedor';
        const modules = MODULES_BY_ROLE[role] || MODULES_BY_ROLE.vendedor;
        const hasModules = user.modules && Object.keys(user.modules).length > 0;

        console.log(`👤 ${user.email}`);
        console.log(`   Rol: ${role}`);
        console.log(`   Módulos actuales: ${hasModules ? Object.keys(user.modules).length : 'NINGUNO'}`);

        if (!hasModules) {
            console.log(`   ⚠️ SIN MÓDULOS - Asignando...`);

            const { error: updateErr } = await supabase
                .from('users')
                .update({
                    modules: modules,
                    company_id: user.company_id || TOYOMACHO_SAN_FELIX_ID
                })
                .eq('id', user.id);

            if (updateErr) {
                console.log(`   ❌ Error: ${updateErr.message}`);
            } else {
                console.log(`   ✅ Módulos asignados (${Object.keys(modules).filter(k => modules[k]).length} activos)`);
            }
        } else {
            console.log(`   ✅ Ya tiene módulos configurados`);
        }
        console.log('');
    }

    console.log('═══════════════════════════════════════════════');
    console.log('💡 Cada usuario debe CERRAR SESIÓN y volver a INICIAR SESIÓN');
    console.log('   para que los cambios surtan efecto.\n');
    process.exit(0);
}

fixAllUsers();
