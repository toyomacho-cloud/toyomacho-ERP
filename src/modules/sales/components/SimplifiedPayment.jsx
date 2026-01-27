/**
 * SimplifiedPayment Component
 * Paso 3 simplificado: Solo contado/credito + finalizar con opcion PDF
 */
import React, { useState } from 'react';
import { CreditCard, DollarSign, Calendar, ArrowLeft, CheckCircle, FileText } from 'lucide-react';
import { formatearUSD, formatearBs } from '../utils/salesCalculations';

const SimplifiedPayment = ({
    total,
    totalBs,
    tasaCambio,
    tipoVenta,
    diasCredito,
    clienteSeleccionado,
    tipoCliente,
    onEstablecerTipoVenta,
    onEstablecerDiasCredito,
    onAnterior,
    onFinalizar
}) => {
    const [mostrarModalPDF, setMostrarModalPDF] = useState(false);

    const DIAS_CREDITO = [15, 30, 45, 60];

    const handleFinalizar = () => {
        // Validar que credito requiere cliente
        if (tipoVenta === 'credito' && tipoCliente === 'rapida') {
            alert('Para venta a credito debe seleccionar un cliente');
            return;
        }
        setMostrarModalPDF(true);
    };

    const confirmarFinalizacion = (generarPDF) => {
        setMostrarModalPDF(false);
        onFinalizar(generarPDF);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            maxWidth: '600px',
            margin: '0 auto'
        }}>
            {/* Resumen */}
            <div className="glass-panel" style={{
                padding: '2rem',
                background: 'white',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center'
            }}>
                <h2 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>Total a Pagar</h2>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--success)' }}>
                    {formatearUSD(total)}
                </div>
                <div style={{ fontSize: '1.2rem', color: '#64748b' }}>
                    {formatearBs(totalBs)}
                </div>
                {clienteSeleccionado && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f1f5f9', borderRadius: '8px' }}>
                        <span style={{ color: '#64748b' }}>Cliente: </span>
                        <strong>{clienteSeleccionado.name}</strong>
                    </div>
                )}
            </div>

            {/* Tipo de Pago */}
            <div className="glass-panel" style={{
                padding: '1.5rem',
                background: 'white',
                borderRadius: 'var(--radius-lg)'
            }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#475569' }}>
                    Tipo de Pago
                </h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {/* Contado */}
                    <button
                        onClick={() => onEstablecerTipoVenta('contado')}
                        style={{
                            flex: 1,
                            padding: '1.5rem',
                            border: tipoVenta === 'contado' ? '2px solid var(--success)' : '2px solid #e2e8f0',
                            borderRadius: '12px',
                            background: tipoVenta === 'contado' ? '#dcfce7' : 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <DollarSign size={32} color={tipoVenta === 'contado' ? '#16a34a' : '#94a3b8'} />
                        <span style={{
                            fontWeight: '600',
                            color: tipoVenta === 'contado' ? '#16a34a' : '#64748b'
                        }}>
                            Contado
                        </span>
                    </button>

                    {/* Credito */}
                    <button
                        onClick={() => onEstablecerTipoVenta('credito')}
                        style={{
                            flex: 1,
                            padding: '1.5rem',
                            border: tipoVenta === 'credito' ? '2px solid #f59e0b' : '2px solid #e2e8f0',
                            borderRadius: '12px',
                            background: tipoVenta === 'credito' ? '#fef3c7' : 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Calendar size={32} color={tipoVenta === 'credito' ? '#f59e0b' : '#94a3b8'} />
                        <span style={{
                            fontWeight: '600',
                            color: tipoVenta === 'credito' ? '#f59e0b' : '#64748b'
                        }}>
                            Credito
                        </span>
                    </button>
                </div>

                {/* Dias de credito */}
                {tipoVenta === 'credito' && (
                    <div style={{ marginTop: '1rem' }}>
                        <label style={{ fontSize: '0.875rem', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>
                            Dias de credito:
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {DIAS_CREDITO.map(dias => (
                                <button
                                    key={dias}
                                    onClick={() => onEstablecerDiasCredito(dias)}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        border: diasCredito === dias ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        background: diasCredito === dias ? '#fef3c7' : 'white',
                                        cursor: 'pointer',
                                        fontWeight: diasCredito === dias ? '700' : '500',
                                        color: diasCredito === dias ? '#f59e0b' : '#64748b'
                                    }}
                                >
                                    {dias} dias
                                </button>
                            ))}
                        </div>
                        {tipoCliente === 'rapida' && (
                            <div style={{
                                marginTop: '0.75rem',
                                padding: '0.5rem',
                                background: '#fef2f2',
                                borderRadius: '6px',
                                color: '#dc2626',
                                fontSize: '0.8rem',
                                textAlign: 'center'
                            }}>
                                ⚠️ Credito requiere seleccionar un cliente
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                    onClick={onAnterior}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '1rem' }}
                >
                    <ArrowLeft size={18} style={{ marginRight: '0.5rem' }} />
                    Atras
                </button>
                <button
                    onClick={handleFinalizar}
                    className="btn btn-primary"
                    style={{
                        flex: 2,
                        padding: '1rem',
                        fontSize: '1.1rem',
                        fontWeight: '700'
                    }}
                >
                    <CheckCircle size={20} style={{ marginRight: '0.5rem' }} />
                    Finalizar Venta
                </button>
            </div>

            {/* Modal PDF */}
            {mostrarModalPDF && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '16px',
                        maxWidth: '400px',
                        textAlign: 'center'
                    }}>
                        <FileText size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ margin: '0 0 0.5rem 0' }}>Venta Completada</h3>
                        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                            ¿Deseas generar el comprobante en PDF?
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => confirmarFinalizacion(false)}
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                            >
                                No, gracias
                            </button>
                            <button
                                onClick={() => confirmarFinalizacion(true)}
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                            >
                                Si, generar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SimplifiedPayment;
