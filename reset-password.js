import {
    auth,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from './src/firebase.js';

const email = 'luisar2ro@gmail.com';

async function resetPassword() {
    try {
        console.log(`Enviando email de recuperación a: ${email}`);

        await sendPasswordResetEmail(auth, email);

        console.log('✅ Email de recuperación enviado exitosamente!');
        console.log('Revisa tu bandeja de entrada (y spam) para el enlace de reseteo.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);

        if (error.code === 'auth/user-not-found') {
            console.log('El usuario no existe en Firebase Auth.');
        } else if (error.code === 'auth/invalid-email') {
            console.log('Email inválido.');
        }

        process.exit(1);
    }
}

resetPassword();
