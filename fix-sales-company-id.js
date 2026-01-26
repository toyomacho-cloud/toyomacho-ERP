// BROWSER CONSOLE SCRIPT - Run this in browser developer console
// This script assigns company_id to sales that don't have one

async function fixSalesCompanyId() {
    const { supabase } = await import('./src/supabase.js');

    console.log('=== Assigning company_id to Sales ===\n');

    try {
        // Step 1: Get all sales without company_id
        console.log('1. Fetching sales without company_id...');
        const { data: salesWithoutCompany, error: salesError } = await supabase
            .from('sales')
            .select('id, document_number, payment_status, company_id')
            .is('company_id', null);

        if (salesError) {
            console.error('❌ Error fetching sales:', salesError);
            return;
        }

        console.log(`✅ Found ${salesWithoutCompany.length} sales without company_id`);
        console.table(salesWithoutCompany.slice(0, 5)); // Show first 5

        // Step 2: Get the first company
        console.log('\n2. Fetching first company...');
        const { data: companies, error: companiesError } = await supabase
            .from('companies')
            .select('id, name')
            .limit(1);

        if (companiesError || !companies || companies.length === 0) {
            console.error('❌ Error fetching company or no companies found:', companiesError);
            return;
        }

        const companyId = companies[0].id;
        const companyName = companies[0].name;
        console.log(`✅ Using company: ${companyName} (ID: ${companyId})\n`);

        // Step 3: Update sales
        console.log('3. Updating sales with company_id...');
        const { data: updatedSales, error: updateError } = await supabase
            .from('sales')
            .update({ company_id: companyId })
            .is('company_id', null)
            .select();

        if (updateError) {
            console.error('❌ Error updating sales:', updateError);
            return;
        }

        console.log(`✅ Successfully updated ${updatedSales.length} sales!`);
        console.table(updatedSales.slice(0, 5));

        console.log('\n🔄 Please refresh the page to see the updated sales in Caja.');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Execute the function
fixSalesCompanyId();
