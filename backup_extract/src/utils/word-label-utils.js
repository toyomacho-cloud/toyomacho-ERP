import { Document, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, BorderStyle, VerticalAlign } from 'docx';
import { saveAs } from 'file-saver';

// Murciélago cipher mapping
const CIPHER = {
    '0': 'O', '1': 'M', '2': 'U', '3': 'R', '4': 'C',
    '5': 'I', '6': 'E', '7': 'L', '8': 'A', '9': 'G'
};

/**
 * Encode price to Murciélago pattern (with 2 decimals)
 */
function encodePriceToMurcielago(price) {
    const integerPart = Math.floor(price);
    const decimalPart = Math.round((price - integerPart) * 100);

    const integerStr = integerPart.toString();
    let encoded = integerStr.split('').map(digit => CIPHER[digit]).join('');

    const decimalStr = decimalPart.toString().padStart(2, '0');
    encoded += '.' + decimalStr.split('').map(digit => CIPHER[digit]).join('');

    return encoded;
}

/**
 * Create a label table for a single product
 */
function createLabelTable(product) {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 }
        },
        rows: [
            // Header row - Logo and Provider
            new TableRow({
                height: { value: 400, rule: "atLeast" },
                children: [
                    new TableCell({
                        width: { size: 60, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [new Paragraph({
                            children: [new TextRun({
                                text: "TOYOMACHO",
                                bold: true,
                                size: 20
                            })]
                        })]
                    }),
                    new TableCell({
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [new TextRun({
                                text: "PROV: 001",
                                size: 14
                            })]
                        })]
                    })
                ]
            }),

            // Reference row
            new TableRow({
                height: { value: 600, rule: "atLeast" },
                children: [
                    new TableCell({
                        columnSpan: 2,
                        verticalAlign: VerticalAlign.CENTER,
                        children: [new Paragraph({
                            children: [new TextRun({
                                text: product.reference || '-',
                                bold: true,
                                size: 28
                            })]
                        })]
                    })
                ]
            }),

            // Description row
            new TableRow({
                height: { value: 500, rule: "atLeast" },
                children: [
                    new TableCell({
                        columnSpan: 2,
                        verticalAlign: VerticalAlign.CENTER,
                        children: [new Paragraph({
                            children: [new TextRun({
                                text: product.description || 'Sin descripción',
                                size: 16
                            })]
                        })]
                    })
                ]
            }),

            // Location row
            new TableRow({
                height: { value: 400, rule: "atLeast" },
                children: [
                    new TableCell({
                        columnSpan: 2,
                        verticalAlign: VerticalAlign.CENTER,
                        children: [new Paragraph({
                            children: [new TextRun({
                                text: product.location || '-',
                                bold: true,
                                size: 14
                            })]
                        })]
                    })
                ]
            }),

            // Footer row - Contact and Price
            new TableRow({
                height: { value: 500, rule: "atLeast" },
                children: [
                    new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                            new Paragraph({
                                children: [new TextRun({ text: "@toyomacho", size: 12 })]
                            }),
                            new Paragraph({
                                children: [new TextRun({ text: "0414-8972342", size: 12 })]
                            })
                        ]
                    }),
                    new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [new TextRun({
                                text: encodePriceToMurcielago(product.price || 0),
                                bold: true,
                                size: 20
                            })]
                        })]
                    })
                ]
            })
        ]
    });
}

/**
 * Generate Word document with labels
 */
export function generateWordLabels(products) {
    const children = [];

    products.forEach((product, index) => {
        // Add label table
        children.push(createLabelTable(product));

        // Add page break after each label except the last one
        if (index < products.length - 1) {
            children.push(
                new Paragraph({
                    pageBreakBefore: true
                })
            );
        }
    });

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    width: 7200,    // 2" in twips (1" = 3600 twips)
                    height: 10800,  // 3" in twips
                    margin: {
                        top: 400,
                        right: 400,
                        bottom: 400,
                        left: 400
                    }
                }
            },
            children: children
        }]
    });

    return doc;
}

/**
 * Download Word document
 */
export async function downloadWord(doc) {
    const { Packer } = await import('docx');
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `etiquetas_${Date.now()}.docx`);
}
