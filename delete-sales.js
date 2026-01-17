import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBwzc6VczJBBXKOvhpOMhwLzF5FhZBCJzc",
    authDomain: "nova-inv-eb210.firebaseapp.com",
    projectId: "nova-inv-eb210",
    storageBucket: "nova-inv-eb210.firebasestorage.app",
    messagingSenderId: "779697746697",
    appId: "1:779697746697:web:4e95d63f8ba49a3da60373"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAllSales() {
    try {
        console.log('🔍 Buscando ventas en Firestore...');
        const salesSnapshot = await getDocs(collection(db, 'sales'));
        console.log(`📊 Encontradas ${salesSnapshot.size} ventas`);

        if (salesSnapshot.size === 0) {
            console.log('✅ No hay ventas para eliminar');
            process.exit(0);
        }

        if (salesSnapshot.size <= 500) {
            // Batch delete (faster for small amounts)
            console.log('⏳ Eliminando ventas en lote...');
            const batch = writeBatch(db);
            salesSnapshot.docs.forEach(docSnapshot => {
                batch.delete(docSnapshot.ref);
            });
            await batch.commit();
            console.log(`✅ ${salesSnapshot.size} ventas eliminadas exitosamente (batch)`);
        } else {
            // Delete one by one for large amounts
            console.log('⏳ Eliminando ventas una por una...');
            let count = 0;
            for (const saleDoc of salesSnapshot.docs) {
                await saleDoc.ref.delete();
                count++;
                if (count % 100 === 0) {
                    console.log(`   Progreso: ${count}/${salesSnapshot.size} ventas...`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            console.log(`✅ ${count} ventas eliminadas exitosamente`);
        }

        console.log('🎉 Historial de ventas limpiado completamente');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error al eliminar ventas:', error);
        process.exit(1);
    }
}

console.log('🚀 Iniciando limpieza de historial de ventas...');
deleteAllSales();
