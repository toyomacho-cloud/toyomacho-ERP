/**
 * ZPL (Zebra Programming Language) Label Generation Utilities
 * For Zebra TLP 2824 Thermal Printer
 * Label Size: 2" × 3" (50.8mm × 76.2mm)
 * Resolution: 203 DPI
 */

// Murciélago cipher mapping
const CIPHER = {
    '0': 'O', '1': 'M', '2': 'U', '3': 'R', '4': 'C',
    '5': 'I', '6': 'E', '7': 'L', '8': 'A', '9': 'G'
};

/**
 * Encode price to Murciélago pattern (with 2 decimals)
 * Example: $45.30 → CI.RO
 */
export function encodePriceToMurcielago(price) {
    const integerPart = Math.floor(price);
    const decimalPart = Math.round((price - integerPart) * 100); // Two decimals

    const integerStr = integerPart.toString();
    let encoded = integerStr.split('').map(digit => CIPHER[digit]).join('');

    // Add decimals (always 2 digits, pad with 0 if needed)
    const decimalStr = decimalPart.toString().padStart(2, '0');
    encoded += '.' + decimalStr.split('').map(digit => CIPHER[digit]).join('');

    return encoded;
}

/**
 * Calculate price with profit margin
 */
export function calculatePrice(cost, margin) {
    return cost * (1 + margin / 100);
}

/**
 * Truncate text to maximum length
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Generate ZPL code for a single label (2" × 3")
 * Layout optimized for Zebra TLP 2824
 */
export function generateZPL(product, config = {}) {
    const ref = truncateText(product.reference || '-', 20);
    const desc = truncateText(product.description || 'Sin descripción', 35);
    const location = truncateText(product.location || '-', 15);
    const price = encodePriceToMurcielago(product.price || 0);

    // ZPL coordinates are in dots (203 DPI)
    // 2" = 406 dots, 3" = 609 dots

    return `^XA
^FO20,20^A0N,28,28^FDTOYOMACHO^FS
^FO280,20^A0N,18,18^FDPROV: 001^FS
^FO20,60^GB360,3,3^FS
^FO20,80^A0N,40,40^FD${ref}^FS
^FO20,140^A0N,24,24^FD${desc}^FS
^FO20,180^A0N,20,20^FD${location}^FS
^FO20,220^GB360,3,3^FS
^FO20,240^A0N,16,16^FD@toyomacho^FS
^FO20,265^A0N,16,16^FD0414-8972342^FS
^FO240,240^A0N,32,32^FD${price}^FS
^XZ
`;
}

/**
 * Generate ZPL for multiple labels
 */
export function generateBatchZPL(products, config = {}) {
    return products.map(product => generateZPL(product, config)).join('\n');
}

/**
 * Download ZPL file
 */
export function downloadZPL(zplContent, filename = null) {
    const name = filename || `etiquetas_zebra_${Date.now()}.zpl`;
    const blob = new Blob([zplContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Open ZPL in new window for copying
 */
export function previewZPL(zplContent) {
    const printWindow = window.open('', 'ZPL Preview', 'width=700,height=500');

    if (printWindow) {
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>ZPL Preview - Zebra Labels</title>
                <style>
                    body {
                        font-family: 'Courier New', monospace;
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    h2 {
                        color: #333;
                    }
                    .instructions {
                        background: #fff3cd;
                        border: 1px solid #ffc107;
                        padding: 15px;
                        margin-bottom: 20px;
                        border-radius: 4px;
                    }
                    .zpl-content {
                        background: white;
                        border: 1px solid #ddd;
                        padding: 15px;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        font-size: 12px;
                        max-height: 300px;
                        overflow-y: auto;
                    }
                    button {
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        margin: 10px 5px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    button:hover {
                        background: #0056b3;
                    }
                    .success {
                        color: #28a745;
                        display: none;
                        margin-top: 10px;
                    }
                </style>
            </head>
            <body>
                <h2>🏷️ Código ZPL para Impresora Zebra</h2>
                
                <div class="instructions">
                    <strong>📝 Instrucciones:</strong>
                    <ol>
                        <li>Click en "Copiar ZPL" para copiar el código</li>
                        <li>Abre el software de tu impresora Zebra (Zebra Setup Utilities)</li>
                        <li>Pega el código ZPL</li>
                        <li>Envía a imprimir</li>
                    </ol>
                    <p><strong>O:</strong> Descarga el archivo .zpl y envíalo directamente a la impresora</p>
                </div>
                
                <button onclick="copyZPL()">📋 Copiar ZPL</button>
                <button onclick="downloadFile()">💾 Descargar Archivo</button>
                <button onclick="window.close()">✖️ Cerrar</button>
                <div class="success" id="success">✅ Código copiado al portapapeles!</div>
                
                <h3>Código ZPL:</h3>
                <div class="zpl-content" id="zplContent">${zplContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                
                <script>
                    function copyZPL() {
                        const text = document.getElementById('zplContent').innerText;
                        navigator.clipboard.writeText(text).then(() => {
                            const success = document.getElementById('success');
                            success.style.display = 'block';
                            setTimeout(() => { success.style.display = 'none'; }, 3000);
                        });
                    }
                    
                    function downloadFile() {
                        const text = document.getElementById('zplContent').innerText;
                        const blob = new Blob([text], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'etiquetas_zebra_${Date.now()}.zpl';
                        a.click();
                        URL.revokeObjectURL(url);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
}
