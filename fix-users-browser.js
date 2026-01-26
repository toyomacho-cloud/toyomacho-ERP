
// BROWSER CONSOLE SCRIPT - Run this in browser developer console
// This script assigns company_id to users who don't have one

async function fixUserCompanyIds() {
    // Get supabase from the global window (already loaded in the app)
    const { supabase } = await import('./src/supabase.js');

    console.log('=== Assigning company_id to User Profiles ===\n');

    try {
        // Step 1: Get all users
        console.log('1. Fetching all users...');
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, company_id');

        if (usersError) {
            console.error('❌ Error fetching users:', usersError);
            return;
        }

        console.log(`✅ Found ${users.length} users`);
        console.table(users);

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

        // Step 3: Update users who don't have company_id
        console.log('3. Updating users without company_id...');
        let updated = 0;

        for (const user of users) {
            if (!user.company_id) {
                console.log(`   Updating user: ${user.email}`);
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ company_id: companyId })
                    .eq('id', user.id);

                if (updateError) {
                    console.error(`      ❌ Error updating ${user.email}:`, updateError);
                } else {
                    console.log(`      ✅ Updated ${user.email}`);
                    updated++;
                }
            } else {
                console.log(`   ${user.email} already has company_id: ${user.company_id}`);
            }
        }

        console.log(`\n✅ Update complete! Updated ${updated} users.`);
        console.log('\n🔄 Please refresh the page to load updated profiles.');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Execute the function
fixUserCompanyIds();
