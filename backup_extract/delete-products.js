// Script to delete all products from Firestore with retry logic
// Run with: node delete-products.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDPYLfpsfQOfKrGVl7r4mvgcT5JRGE-h6s",
    authDomain: "nova-inv-eb210.firebaseapp.com",
    projectId: "nova-inv-eb210",
    storageBucket: "nova-inv-eb210.firebasestorage.app",
    messagingSenderId: "917755245382",
    appId: "1:917755245382:web:4fd500f5e2f56de8a4f20f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Delete with retry
async function deleteWithRetry(docRef, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await deleteDoc(docRef);
            return true;
        } catch (error) {
            if (error.code === 'resource-exhausted' && i < retries - 1) {
                console.log(`  Quota hit, waiting 30s before retry...`);
                await delay(30000);
            } else {
                throw error;
            }
        }
    }
    return false;
}

async function deleteAllProducts() {
    console.log('Fetching all products...');

    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);

    console.log(`Found ${snapshot.docs.length} products to delete.`);

    if (snapshot.docs.length === 0) {
        console.log('No products to delete.');
        process.exit(0);
    }

    // Delete one by one with delays to handle quota
    let deleted = 0;
    const total = snapshot.docs.length;

    for (const docSnapshot of snapshot.docs) {
        try {
            const docRef = doc(db, 'products', docSnapshot.id);
            await deleteWithRetry(docRef);
            deleted++;

            if (deleted % 50 === 0) {
                console.log(`Progress: ${deleted}/${total} products deleted...`);
            }

            // Small delay between deletes
            await delay(100);
        } catch (error) {
            console.error(`Failed to delete product ${docSnapshot.id}:`, error.message);
        }
    }

    console.log(`\n✅ Deleted ${deleted}/${total} products!`);
    process.exit(0);
}

deleteAllProducts().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
