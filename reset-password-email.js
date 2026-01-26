// Script para enviar email de recuperación de contraseña
import { initializeApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

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

async function sendReset() {
    try {
        console.log(`\n📧 Enviando email de recuperación a: ${email}\n`);

        await sendPasswordResetEmail(auth, email);

        console.log(`✅ Email enviado exitosamente!\n`);
        console.log(`📬 Revisa tu bandeja de entrada (y carpeta de spam).`);
        console.log(`🔗 Haz clic en el enlace del email para establecer una nueva contraseña.\n`);
        console.log(`💡 Sugerencia: Usa "Nova2026!" como nueva contraseña para recordarla fácil.\n`);

        process.exit(0);

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}\n`);

        if (error.code === 'auth/user-not-found') {
            console.log(`⚠️ El usuario no existe en Firebase.`);
        } else if (error.code === 'auth/too-many-requests') {
            console.log(`⏳ Demasiados intentos. Espera 15-30 minutos e intenta de nuevo.`);
        }

        process.exit(1);
    }
}

sendReset();
