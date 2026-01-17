// Script para exportar inventario de Firebase a CSV
// Ejecutar con: node scripts/export-inventory.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Configuración de Firebase (misma que en src/firebase.js)
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

async function exportInventory() {
    console.log('🔄 Conectando a Firebase...');

    try {
        // Obtener todos los productos
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const products = productsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`✅ Se encontraron ${products.length} productos`);

        if (products.length === 0) {
            console.log('⚠️ No hay productos para exportar');
            process.exit(0);
        }

        // Definir columnas CSV
        const headers = [
            'ID',
            'SKU',
            'Referencia',
            'Descripción',
            'Marca',
            'Categoría',
            'Ubicación',
            'Cantidad',
            'Precio (USD)',
            'Costo (USD)',
            'Estado',
            'Empresa ID',
            'Fecha Creación'
        ];

        // Convertir productos a filas CSV
        const rows = products.map(p => [
            p.id || '',
            p.sku || '',
            p.reference || '',
            `"${(p.description || '').replace(/"/g, '""')}"`, // Escapar comillas
            p.brand || '',
            p.category || '',
            p.location || '',
            p.quantity || 0,
            p.price || 0,
            p.cost || 0,
            p.status || '',
            p.companyId || '',
            p.createdAt || ''
        ].join(','));

        // Crear contenido CSV
        const csvContent = [headers.join(','), ...rows].join('\n');

        // Guardar archivo
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `inventario_${timestamp}.csv`;
        const outputPath = path.join(process.cwd(), fileName);

        fs.writeFileSync(outputPath, '\ufeff' + csvContent, 'utf8'); // BOM para Excel

        console.log(`\n✅ Archivo exportado exitosamente:`);
        console.log(`   📁 ${outputPath}`);
        console.log(`   📊 ${products.length} productos exportados`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error al exportar:', error.message);
        process.exit(1);
    }
}

exportInventory();
