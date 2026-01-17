// Script to check users in Firestore
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkUsers() {
    console.log('\n=== VERIFICANDO USUARIOS EN FIRESTORE ===\n');

    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    console.log(`Total usuarios encontrados: ${snapshot.docs.length}\n`);

    snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`--- Usuario ${index + 1} ---`);
        console.log(`ID: ${doc.id}`);
        console.log(`Email: ${data.email || 'N/A'}`);
        console.log(`Nombre: ${data.displayName || 'N/A'}`);
        console.log(`Rol: ${data.role || 'N/A'}`);
        console.log(`CompanyId: ${data.companyId || '❌ NO TIENE'}`);
        console.log(`Activo: ${data.active !== undefined ? data.active : 'N/A'}`);
        console.log('');
    });

    // Also check companies
    console.log('\n=== VERIFICANDO EMPRESAS EN FIRESTORE ===\n');
    const companiesRef = collection(db, 'companies');
    const compSnapshot = await getDocs(companiesRef);

    console.log(`Total empresas encontradas: ${compSnapshot.docs.length}\n`);

    compSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`--- Empresa ${index + 1} ---`);
        console.log(`ID: ${doc.id}`);
        console.log(`Nombre: ${data.name || 'N/A'}`);
        console.log('');
    });

    process.exit(0);
}

checkUsers().catch(console.error);
