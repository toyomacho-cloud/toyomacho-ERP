// Crear cuenta temporal de admin para acceso inmediato
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { createClient } from '@supabase/supabase-js';

const firebaseConfig = {
    apiKey: "AIzaSyCiwW7dh_m30sDAS1BsIMbtKgn4idRfF6o",
    authDomain: "nova-inv-eb210.firebaseapp.com",
    projectId: "nova-inv-eb210",
    storageBucket: "nova-inv-eb210.firebasestorage.app",
    messagingSenderId: "862577308416",
    appId: "1:862577308416:web:6d3034d4dd96ff89fcb9e5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const supabase = createClient(
    'https://ombjcmefbpxgruxdvnjl.supabase.co',
    'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P'
);

const TEMP_ADMIN = {
    email: 'admin@toyomacho.com',
    password: 'Admin123!',
    displayName: 'Administrador Temporal'
};

async function createTempAdmin() {
    try {
        console.log('\n🔐 Creando cuenta temporal de administrador...\n');
        console.log(`Email: ${TEMP_ADMIN.email}`);
        console.log(`Contraseña: ${TEMP_ADMIN.password}\n`);

        // 1. Crear en Firebase
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            TEMP_ADMIN.email,
            TEMP_ADMIN.password
        );

        console.log('✅ Usuario creado en Firebase');

        // 2. Crear perfil en Supabase
        const { error: dbError } = await supabase
            .from('users')
            .insert({
                uid: userCredential.user.uid,
                email: TEMP_ADMIN.email,
                display_name: TEMP_ADMIN.displayName,
                role: 'admin',
                active: true,
                modules: {
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
                created_at: new Date().toISOString(),
                firebase_id: userCredential.user.uid
            });

        if (dbError) {
            console.warn('⚠️ Error creando perfil en Supabase:', dbError.message);
            console.log('   (Puedes crear el perfil manualmente desde Settings)');
        } else {
            console.log('✅ Perfil creado en Supabase');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ CUENTA TEMPORAL CREADA EXITOSAMENTE');
        console.log('='.repeat(60));
        console.log('\n📋 CREDENCIALES:');
        console.log(`   Email:      ${TEMP_ADMIN.email}`);
        console.log(`   Contraseña: ${TEMP_ADMIN.password}`);
        console.log('\n🌐 ENLACES:');
        console.log(`   Local: http://localhost:5173`);
        console.log(`   Red:   http://192.168.1.124:5173`);
        console.log('\n💡 TIP: Usa esta cuenta para entrar AHORA.');
        console.log('   Luego resetea tu cuenta principal desde Gmail.\n');

        await auth.signOut();
        process.exit(0);

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}\n`);

        if (error.code === 'auth/email-already-in-use') {
            console.log('✅ La cuenta ya existe! Usa estas credenciales:\n');
            console.log(`   Email:      ${TEMP_ADMIN.email}`);
            console.log(`   Contraseña: ${TEMP_ADMIN.password}\n`);
            process.exit(0);
        }

        process.exit(1);
    }
}

createTempAdmin();
