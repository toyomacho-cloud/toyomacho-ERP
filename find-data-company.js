// Verificar en qué compañía están los datos reales
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ombjcmefbpxgruxdvnjl.supabase.co',
    'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P'
);

async function findDataCompany() {
    console.log('\n🔍 BUSCANDO COMPAÑÍA CON DATOS\n');

    // Obtener todas las compañías
    const { data: companies } = await supabase
        .from('companies')
        .select('*');

    console.log(`Total compañías: ${companies.length}\n`);

    // Para cada compañía, contar registros
    for (const company of companies) {
        console.log(`📊 ${company.name} (${company.id})`);

        // Contar productos
        const { count: productsCount } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

        // Contar ventas
        const { count: salesCount } = await supabase
            .from('sales')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

        // Contar compras
        const { count: purchasesCount } = await supabase
            .from('purchases')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

        console.log(`   Productos: ${productsCount || 0}`);
        console.log(`   Ventas: ${salesCount || 0}`);
        console.log(`   Compras: ${purchasesCount || 0}`);

        if (productsCount > 0 || salesCount > 0 || purchasesCount > 0) {
            console.log(`   ✅ TIENE DATOS\n`);

            // Asignar admin@toyomacho.com a esta compañía
            console.log('🔧 Reasignando admin@toyomacho.com a esta compañía...');

            const { error } = await supabase
                .from('users')
                .update({ company_id: company.id })
                .eq('email', 'admin@toyomacho.com');

            if (error) {
                console.log(`   ❌ Error: ${error.message}`);
            } else {
                console.log(`   ✅ Usuario reasignado exitosamente`);
                console.log(`\n🎯 SOLUCIÓN APLICADA:`);
                console.log(`   Usuario: admin@toyomacho.com`);
                console.log(`   Compañía: ${company.name}`);
                console.log(`   ${productsCount} productos disponibles\n`);
                console.log(`💡 RECARGA LA PÁGINA para ver los datos.\n`);
            }

            return;
        } else {
            console.log(`   ⚠️ Sin datos\n`);
        }
    }

    console.log('⚠️ Ninguna compañía tiene datos.\n');
    console.log('Esto podría significar que los datos están en otra base de datos');
    console.log('o que necesitas importar/crear productos primero.\n');
}

findDataCompany();
