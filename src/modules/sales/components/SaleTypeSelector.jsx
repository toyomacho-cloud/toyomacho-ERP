/**
 * SaleTypeSelector Component
 * Selector de tipo de venta (contado/credito) y tipo de documento
 */
import React from 'react';
import { DollarSign, Receipt, FileText, FileCheck } from 'lucide-react';

const SaleTypeSelector = ({
    tipoVenta,
    diasCredito,
    tipoDocumento,
    modoVenta,
    onEstablecerTipoVenta,
    onEstablecerDiasCredito,
    onEstablecerTipoDocumento,
    onAnterior,
    onSiguiente,
    onFinalizar
}) => {
    const esPresupuesto = modoVenta === 'presupuesto';

    return (
        <div className="glass-panel" style={{
            padding: '2rem',
            maxWidth: '600px',
            margin: '0 auto',
            width: '100%',
            alignSelf: 'start',
            borderRadius: 'var(--radius-lg)'
        }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Detalles de Venta</h2>

            {/* Selector de tipo de venta */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <button
                    onClick={() => onEstablecerTipoVenta('contado')}
                    className={`btn ${tipoVenta === 'contado' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                        padding: '2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        height: 'auto',
                        alignItems: 'center'
                    }}
                >
                    <DollarSign size={32} />
                    <span style={{ fontWeight: '600' }}>Contado</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Pago inmediato</span>
                </button>
                <button
                    onClick={() => onEstablecerTipoVenta('credito')}
                    className={`btn ${tipoVenta === 'credito' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                        padding: '2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        height: 'auto',
                        alignItems: 'center'
                    }}
                >
                    <Receipt size={32} />
                    <span style={{ fontWeight: '600' }}>Credito</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Pago diferido</span>
                </button>
            </div>

            {/* Dias de credito */}
            {tipoVenta === 'credito' && (
                <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: 'rgba(234, 179, 8, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(234, 179, 8, 0.3)'
                }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '0.75rem',
                        color: '#eab308',
                        fontWeight: 'bold'
                    }}>
                        Dias de Credito
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[7, 15, 30, 45, 60].map(dias => (
                            <button
                                key={dias}
                                onClick={() => onEstablecerDiasCredito(dias)}
                                className={`btn ${diasCredito === dias ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ flex: 1, padding: '0.75rem' }}
                            >
                                {dias} dias
                            </button>
                        ))}
                    </div>
                    <div style={{
                        marginTop: '0.75rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)'
                    }}>
                        Fecha de vencimiento: {
                            new Date(Date.now() + diasCredito * 24 * 60 * 60 * 1000)
                                .toLocaleDateString('es-VE')
                        }
                    </div>
                </div>
            )}

            {/* Selector de tipo de documento */}
            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                    display: 'block',
                    marginBottom: '0.75rem',
                    fontWeight: '500'
                }}>
                    Tipo de Documento
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => onEstablecerTipoDocumento('pedido')}
                        className={`btn ${tipoDocumento === 'pedido' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <FileText size={18} />
                        Pedido
                    </button>
                    <button
                        onClick={() => onEstablecerTipoDocumento('factura')}
                        className={`btn ${tipoDocumento === 'factura' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <FileCheck size={18} />
                        Factura (+IVA)
                    </button>
                </div>
                {tipoDocumento === 'factura' && (
                    <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        padding: '0.5rem',
                        background: 'rgba(59, 130, 246, 0.05)',
                        borderRadius: 'var(--radius-sm)'
                    }}>
                        ℹ️ Se aplicara IVA del 16% al subtotal
                    </div>
                )}
            </div>

            {/* Botones de navegacion */}
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button
                    onClick={onAnterior}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                >
                    ← Atras
                </button>
                <button
                    onClick={() => {
                        if (tipoVenta === 'contado' && !esPresupuesto) {
                            onSiguiente(); // Ir a pago
                        } else {
                            onFinalizar(); // Finalizar directamente
                        }
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                >
                    {tipoVenta === 'contado' && !esPresupuesto ? 'Ir a Pagar →' : 'Finalizar ✓'}
                </button>
            </div>
        </div>
    );
};

export default SaleTypeSelector;
