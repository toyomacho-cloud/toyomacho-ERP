import * as XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('Tarea.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

// Collect unique brands and categories
const brands = new Set();
const categories = new Set();
const examples = [];

data.forEach((item, index) => {
    if (item.MARCA) brands.add(item.MARCA);
    if (item.CATEGORIA) categories.add(item.CATEGORIA);

    // Collect first 10 examples
    if (index < 15 && item.DESCRIPCION) {
        examples.push({
            marca: item.MARCA,
            categoria: item.CATEGORIA,
            descripcion: item.DESCRIPCION?.substring(0, 50)
        });
    }
});

console.log('=== ANÁLISIS DE DATOS DEL EXCEL ===\n');
console.log(`Total de filas: ${data.length}`);
console.log(`\n=== MARCAS ÚNICAS (${brands.size}) ===`);

// Show brands with their 3-char codes
const brandList = [...brands].sort();
brandList.forEach(brand => {
    const code = String(brand).substring(0, 3).toUpperCase();
    console.log(`  "${brand}" => Código: ${code}`);
});

console.log(`\n=== CATEGORÍAS ÚNICAS (${categories.size}) ===`);
const catList = [...categories].sort();
catList.forEach((cat, index) => {
    const code = ((index + 1) * 10).toString().padStart(3, '0');
    console.log(`  "${cat}" => Código: ${code}`);
});

console.log('\n=== EJEMPLOS DE SKUs GENERADOS ===');

// Simulate SKU generation
const catCodes = {};
catList.forEach((cat, index) => {
    catCodes[cat] = ((index + 1) * 10).toString().padStart(3, '0');
});

const sequences = {};

examples.forEach(item => {
    const brandCode = String(item.marca || 'GEN').substring(0, 3).toUpperCase();
    const catCode = catCodes[item.categoria] || '000';

    const key = `${brandCode}-${catCode}`;
    sequences[key] = (sequences[key] || 0) + 1;
    const seq = sequences[key].toString().padStart(3, '0');

    const sku = `${brandCode}-${catCode}-${seq}`;
    console.log(`  ${sku} | Marca: ${item.marca} | Cat: ${item.categoria}`);
});
