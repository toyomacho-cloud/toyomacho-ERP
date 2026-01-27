/**
 * SaleSummary Component
 * Pantalla de resumen/exito de venta completada
 */
import React from 'react';
import { CheckCircle, Printer, Download, Plus } from 'lucide-react';
import { formatearUSD, formatearBs } from '../utils/salesCalculations';

const SaleSummary = ({
    ventaCompletada,
    onNuevaVenta,
    onImprimir,
    onDescargar
}) => {
    if (!ventaCompletada) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-secondary)'
            }}>
                Cargando...
            </div>
        );
    }

    const {
        items,
        cliente,
        tipoDocumento,
        tipoPago,
        total,
        totalBs,
        tasaCambio,
        fecha,
        numeroDocumento,
        esPresupuesto
    } = ventaCompletada;

    return (
        <div className="glass-panel" style={{
            padding: '3rem',
            maxWidth: '600px',
            margin: '0 auto',
            width: '100%',
            textAlign: 'center',
            borderRadius: 'var(--radius-lg)'
        }}>
            {/* Icono de exito */}
            <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem'
            }}>
                <CheckCircle size={48} color="var(--success)" />
            </div>

            {/* Mensaje de exito */}
            <h2 style={{
                color: 'var(--success)',
                marginBottom: '0.5rem',
                fontSize: '1.75rem'
            }}>
                {esPresupuesto ? '¡Presupuesto Generado!' : '¡Venta Exitosa!'}
            </h2>

            <p style={{
                color: 'var(--text-secondary)',
                marginBottom: '2rem',
                fontSize: '1rem'
            }}>
                {esPresupuesto
                    ? 'El presupuesto ha sido creado correctamente'
                    : 'La venta ha sido registrada correctamente'
                }
            </p>

            {/* Detalles de la venta */}
            <div style={{
                background: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                marginBottom: '2rem',
                textAlign: 'left'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginBottom: '1rem'
                }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Numero de Documento
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {numeroDocumento}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Tipo
                        </div>
                        <div style={{ fontWeight: '500' }}>
                            {esPresupuesto ? 'Presupuesto' : tipoDocumento === 'factura' ? 'Factura' : 'Pedido'}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Cliente
                        </div>
                        <div style={{ fontWeight: '500' }}>
                            {cliente?.name || cliente?.nombre || 'Venta Rapida'}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Forma de Pago
                        </div>
                        <div style={{ fontWeight: '500' }}>
                            {esPresupuesto ? 'Pendiente' : tipoPago === 'credito' ? 'Credito' : 'Contado'}
                        </div>
                    </div>
                </div>

                <div style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '1rem'
                }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Productos: {items?.length || 0}
                    </div>
                </div>
            </div>

            {/* Total */}
            <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                marginBottom: '2rem'
            }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Total de la Venta
                </div>
                <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    color: 'var(--success)'
                }}>
                    {formatearUSD(total)}
                </div>
                <div style={{
                    fontSize: '1rem',
                    color: 'var(--text-secondary)'
                }}>
                    {formatearBs(totalBs)}
                </div>
            </div>

            {/* Acciones */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                marginBottom: '1.5rem'
            }}>
                <button
                    onClick={onImprimir}
                    className="btn btn-secondary"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '1rem'
                    }}
                >
                    <Printer size={20} />
                    <span style={{ fontSize: '0.8rem' }}>Imprimir</span>
                </button>
                <button
                    onClick={onDescargar}
                    className="btn btn-secondary"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '1rem'
                    }}
                >
                    <Download size={20} />
                    <span style={{ fontSize: '0.8rem' }}>Descargar</span>
                </button>
                <button
                    onClick={onNuevaVenta}
                    className="btn btn-primary"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '1rem'
                    }}
                >
                    <Plus size={20} />
                    <span style={{ fontSize: '0.8rem' }}>Nueva Venta</span>
                </button>
            </div>
        </div>
    );
};

export default SaleSummary;
