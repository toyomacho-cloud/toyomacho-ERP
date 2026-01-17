import jsPDF from 'jspdf';

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
 * Draw a single label on PDF (2" × 3" page size)
 * Optimized for Zebra TLP 2824 thermal printer
 */
function drawLabel(doc, product, pageNum, config) {
    // Page size = Label size (2" × 3" = 5.08cm × 7.62cm)
    const pageWidth = 5.08;
    const pageHeight = 7.62;

    // Internal margins
    const margin = 0.3;
    const x = margin;
    const y = margin;
    const contentWidth = pageWidth - (margin * 2);

    // Logo and Provider (top)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOYOMACHO', x, y + 0.5);

    doc.setFontSize(7);
    doc.text('PROV: 001', x + 3.3, y + 0.5);

    // Separator line
    doc.setLineWidth(0.02);
    doc.line(x, y + 0.7, x + contentWidth, y + 0.7);

    // Reference (large, bold)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const ref = product.reference || '-';
    doc.text(ref, x, y + 1.1);

    // Description (2 lines max)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const desc = product.description || 'Sin descripción';
    const descLines = doc.splitTextToSize(desc, contentWidth);
    doc.text(descLines.slice(0, 2), x, y + 1.5);

    // Location
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    const location = product.location || '-';
    doc.text(location, x, y + 2.5);

    // Separator line
    doc.line(x, y + 2.8, x + contentWidth, y + 2.8);

    // Contact info (bottom left)
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('@toyomacho', x, y + 3.1);
    doc.text('0414-8972342', x, y + 3.5);

    // Encoded price (bottom right)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const price = encodePriceToMurcielago(product.price || 0);
    const priceWidth = doc.getTextWidth(price);
    doc.text(price, x + contentWidth - priceWidth, y + 3.3);
}

/**
 * Generate PDF with labels
 * Each page = 1 label with exact Zebra size (2" × 3")
 */
export function generatePDFLabels(products, config = null) {
    // Create PDF with page size = label size (2" × 3")
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'cm',
        format: [5.08, 7.62]  // width × height (2" × 3")
    });

    products.forEach((product, index) => {
        // Add new page for each label except the first one
        if (index > 0) {
            doc.addPage([5.08, 7.62], 'landscape');
        }

        // Draw the label (occupies entire page)
        drawLabel(doc, product, index + 1, config);
    });

    return doc;
}

/**
 * Download PDF file
 */
export function downloadPDF(doc, filename = null) {
    const name = filename || `etiquetas_zebra_${Date.now()}.pdf`;
    doc.save(name);
}
