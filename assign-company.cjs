// Script to assign companyId to all users
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyCiwW7dh_m30sDAS1BsIMbtKgn4idRfF6o",
    authDomain: "nova-inv-eb210.firebaseapp.com",
    projectId: "nova-inv-eb210",
    storageBucket: "nova-inv-eb210.firebasestorage.app",
    messagingSenderId: "862577308416",
    appId: "1:862577308416:web:6d3034d4dd96ff89fcb9e5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Company ID for TOYOMACHO SAN FELIX
const COMPANY_ID = 'FhgVBaWh524jWqcP4QXY';

async function assignCompanyToUsers() {
    console.log('\n=== ASIGNANDO COMPANYID A TODOS LOS USUARIOS ===\n');
    console.log(`Empresa: TOYOMACHO SAN FELIX (${COMPANY_ID})\n`);

    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    let updated = 0;

    for (const userDoc of snapshot.docs) {
        const data = userDoc.data();
        console.log(`Actualizando: ${data.displayName || data.email}...`);

        await updateDoc(doc(db, 'users', userDoc.id), {
            companyId: COMPANY_ID
        });

        console.log(`  ✅ CompanyId asignado`);
        updated++;
    }

    console.log(`\n=== COMPLETADO ===`);
    console.log(`Total usuarios actualizados: ${updated}`);

    process.exit(0);
}

assignCompanyToUsers().catch(console.error);
