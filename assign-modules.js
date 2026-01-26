// Asignar módulos de admin al usuario
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

async function assignModules() {
    console.log('🔧 Asignando módulos a admin@toyomacho.com...');

    const { error } = await supabase
        .from('users')
        .update({ modules: ADMIN_MODULES })
        .eq('email', 'admin@toyomacho.com');

    if (error) {
        console.log('❌ Error:', error.message);
    } else {
        console.log('✅ Módulos asignados correctamente');
        console.log('💡 Recarga la página (F5)');
    }

    process.exit(0);
}

assignModules();
