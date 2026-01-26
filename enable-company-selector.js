// Script para forzar el selector de compañía
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ombjcmefbpxgruxdvnjl.supabase.co',
    'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P'
);

async function clearCompanySelection() {
    console.log('\n🔄 Limpiando selección de compañía...\n');

    // Limpiar company_id del usuario en la base de datos
    const { error } = await supabase
        .from('users')
        .update({ company_id: null })
        .eq('email', 'admin@toyomacho.com');

    if (error) {
        console.error(`❌ Error: ${error.message}\n`);
        process.exit(1);
    }

    console.log('✅ company_id limpiado de la base de datos\n');
    console.log('📋 INSTRUCCIONES:\n');
    console.log('1. Cierra sesión en el sistema');
    console.log('2. Borra caché del navegador (Ctrl+Shift+Del)');
    console.log('3. Vuelve a iniciar sesión');
    console.log('4. Verás un selector para elegir la compañía/sucursal\n');
    console.log('🏢 Compañías disponibles:\n');

    // Listar compañías
    const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .order('name');

    companies.forEach(c => {
        console.log(`   - ${c.name} (ID: ${c.id})`);
    });

    console.log('');
    process.exit(0);
}

clearCompanySelection();
