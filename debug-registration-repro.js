
import { createClient } from '@supabase/supabase-js';

// Hardcoded creds from supabase.js
const SUPABASE_URL = 'https://ombjcmefbpxgruxdvnjl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTQ1NSwiZXhwIjoyMDg0MDY1NDU1fQ.WlZyjCR--cXGGQztPCnFCAooIi2EacICZVDQUgVgJTc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRegistration() {
    console.log("Testing Registration Flow...");

    // Generate random email
    const email = `testuser${Math.floor(Math.random() * 10000)}@example.com`;
    const password = 'password123';

    console.log(`Attempting to sign up ${email}...`);

    // 1. Create User via Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true // Auto confirm
    });

    if (authError) {
        console.error("❌ SignUp failed in Auth:", authError.message);
        return;
    }

    console.log("✅ SignUp successful in Auth. User ID:", authData.user?.id);

    // Check if we have a session
    if (!authData.session) {
        console.log("⚠️ No session returned (Email confirmation likely enabled). Cannot verify profile insertion as 'self' immediately without login.");
        // If no session, we can't insert the profile row as "authenticated" user.
        // But the current code tries to insert it using the *main* client which is anonymous?
        // Let's try to insert the profile using the 'anon' client (simulating the app's current behavior)
    } else {
        console.log("✅ Session obtained.");
    }

    // 2. Insert Profile (Simulating app behavior)
    console.log("Attempting to insert into 'users' table...");

    const { error: profileError } = await supabase
        .from('users')
        .insert({
            uid: authData.user.id,
            email: email,
            display_name: 'Test Instance',
            role: 'vendedor',
            active: true
        });

    if (profileError) {
        console.error("❌ Profile insertion failed:", profileError);
    } else {
        console.log("✅ Profile inserted successfully!");
    }
}

testRegistration();
