// Script para resetear contraseña de luisar2ro@gmail.com
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

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

const email = 'luisar2ro@gmail.com';

// Lista de contraseñas posibles
const passwords = [
    'Nova2026!',
    'nova2026',
    'Nova2026',
    'admin123',
    'Admin123!',
    'Toyomacho2026',
    'toyomacho2026',
];

async function tryPasswords() {
    console.log(`\n🔍 Probando contraseñas para: ${email}\n`);

    for (const pwd of passwords) {
        try {
            console.log(`Probando: ${pwd.substring(0, 2)}${'*'.repeat(pwd.length - 2)}`);
            await signInWithEmailAndPassword(auth, email, pwd);

            console.log(`\n✅ ¡CONTRASEÑA CORRECTA!: ${pwd}\n`);
            console.log(`Usa esta contraseña para entrar al sistema.`);

            await auth.signOut();
            process.exit(0);

        } catch (error) {
            if (!error.code.includes('wrong-password') && !error.code.includes('invalid-credential')) {
                console.error(`\nError: ${error.message}`);
            }
        }
    }

    console.log(`\n❌ Ninguna contraseña funcionó.\n`);
    console.log(`📧 Opción 1: Resetear vía email`);
    console.log(`   Ejecuta: node reset-password-email.js\n`);
    console.log(`💡 Opción 2: Usar otra cuenta de admin para crear usuario nuevo\n`);

    process.exit(1);
}

tryPasswords();
