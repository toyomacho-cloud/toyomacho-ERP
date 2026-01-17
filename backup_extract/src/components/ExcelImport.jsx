import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, Check } from 'lucide-react';

const ExcelImport = ({ onDataLoaded, onClose }) => {
    const [parsedData, setParsedData] = useState(null);
    const [fileName, setFileName] = useState('');
    const [headers, setHeaders] = useState([]);
    const [previewData, setPreviewData] = useState([]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];

            // Get raw data for preview (array of arrays)
            const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

            // Get object data for processing
            const objectData = XLSX.utils.sheet_to_json(ws);

            if (rawData.length > 0) {
                setHeaders(rawData[0]);
                setPreviewData(rawData.slice(1, 6)); // Preview first 5 rows
                setParsedData(objectData); // Store data, don't send yet
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleConfirm = () => {
        if (parsedData) {
            onDataLoaded(parsedData);
            // onClose is handled by parent or we can call it here if parent doesn't close automatically
            // But usually parent handles logic. We'll assume parent closes modal or we call onClose after.
            // In Inventory.jsx, handleExcelDataLoaded calls setIsImportModalOpen(false), so we are good.
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <FileSpreadsheet size={24} color="var(--success)" />
                        Importar desde Excel
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '150px',
                        border: '2px dashed var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                        <Upload size={32} style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }} />
                        <p style={{ marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Click para subir</span> o arrastra el archivo
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>XLSX, XLS</p>
                        <input type="file" style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleFileUpload} />
                    </label>
                </div>

                {fileName && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.875rem' }}>Archivo: {fileName}</span>
                        <Check size={16} color="var(--success)" />
                    </div>
                )}



                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={onClose} className="btn btn-secondary">
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!parsedData}
                        className="btn btn-primary"
                    >
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExcelImport;
