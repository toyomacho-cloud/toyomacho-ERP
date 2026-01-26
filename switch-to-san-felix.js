// Cambiar admin@toyomacho.com a TOYOMACHO SAN FELIX
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ombjcmefbpxgruxdvnjl.supabase.co',
    'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P'
);

const TOYOMACHO_SAN_FELIX_ID = 'f021036e-bbf5-4151-b59d-ac5a0d295d81';

async function switchToSanFelix() {
    console.log('\n🔄 Cambiando a TOYOMACHO SAN FELIX...\n');

    // Verificar datos en San Felix
    const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', TOYOMACHO_SAN_FELIX_ID);

    console.log(`📊 TOYOMACHO SAN FELIX tiene ${productsCount || 0} productos\n`);

    // Cambiar usuario
    const { error } = await supabase
        .from('users')
        .update({ company_id: TOYOMACHO_SAN_FELIX_ID })
        .eq('email', 'admin@toyomacho.com');

    if (error) {
        console.log(`❌ Error: ${error.message}\n`);
        process.exit(1);
    }

    console.log('✅ Usuario admin@toyomacho.com cambiado a TOYOMACHO SAN FELIX\n');
    console.log('💡 RECARGA LA PÁGINA (F5) para ver los datos.\n');

    process.exit(0);
}

switchToSanFelix();
