// SOLUCIÓN: Este script intenta hacer login con varias contraseñas comunes
// para identificar cuál es la correcta, o te guía para resetearla

import {
    auth,
    signInWithEmailAndPassword
} from './src/firebase.js';
import { supabase } from './src/supabase.js';

const email = 'luisar2ro@gmail.com';

// Lista de contraseñas comunes que podrías haber usado
const possiblePasswords = [
    'Nova2026!',
    'nova2026',
    'Nova2026',
    'admin123',
    'Admin123',
    'password123',
    // Agrega otras que hayas podido usar
];

async function tryLogin() {
    console.log(`\n🔍 Intentando encontrar contraseña correcta para: ${email}\n`);

    for (const password of possiblePasswords) {
        try {
            console.log(`Probando: ${password.substring(0, 3)}${'*'.repeat(password.length - 3)}`);

            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            console.log(`\n✅ ¡CONTRASEÑA ENCONTRADA!`);
            console.log(`Contraseña correcta: ${password}`);
            console.log(`\nPuedes usar estas credenciales para iniciar sesión.`);

            // Verificar si tiene perfil en Supabase
            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (profile) {
                console.log(`\n✅ Perfil en Supabase encontrado:`);
                console.log(`   Nombre: ${profile.display_name}`);
                console.log(`   Rol: ${profile.role}`);
                console.log(`   Activo: ${profile.active}`);
            } else {
                console.log(`\n⚠️ Usuario existe en Firebase pero NO en Supabase.`);
                console.log(`   Necesitas crear el perfil en Supabase.`);
            }

            await auth.signOut();
            process.exit(0);
            return;

        } catch (error) {
            if (error.code !== 'auth/wrong-password' &&
                error.code !== 'auth/invalid-credential') {
                console.error(`Error inesperado: ${error.message}`);
            }
            // Continuar con la siguiente contraseña
        }
    }

    console.log(`\n❌ Ninguna contraseña funcionó.`);
    console.log(`\n📧 Solución: Resetear contraseña\n`);
    console.log(`Opción 1: Ejecuta → node reset-password.js`);
    console.log(`          (Te enviará un email para resetear)`);
    console.log(`\nOpción 2: Ve a la pantalla de login y usa "¿Olvidaste tu contraseña?"`);
    console.log(`          (si agregamos esa función)`);

    process.exit(1);
}

tryLogin();
