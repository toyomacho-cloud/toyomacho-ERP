// BROWSER CONSOLE SCRIPT
// Fix userProfile.company_id to match the active company in localStorage

async function fixUserProfileCompanyId() {
    const { supabase } = await import('./src/supabase.js');

    console.log('=== Updating User Profile company_id ===\n');

    try {
        // Get current company from localStorage
        const currentCompanyId = localStorage.getItem('currentCompanyId');
        console.log('Current Company ID from localStorage:', currentCompanyId);

        // Get company name
        const { data: company } = await supabase
            .from('companies')
            .select('*')
            .eq('id', currentCompanyId)
            .single();

        console.log('Company:', company.name, current CompanyId);

        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session.user.id;
        const userEmail = session.user.email;

        console.log('Current user:', userEmail);

        // Update user profile
        const { data: updatedProfile, error } = await supabase
            .from('users')
            .update({ company_id: currentCompanyId })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('❌ Error updating profile:', error);
            return;
        }

        console.log('✅ Successfully updated user profile!');
        console.log('New company_id:', updatedProfile.company_id);
        console.log('\n🔄 Please refresh the page to see the pending sales in Caja.');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

fixUserProfileCompanyId();
