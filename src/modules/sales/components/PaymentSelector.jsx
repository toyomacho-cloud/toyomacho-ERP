/**
 * PaymentSelector Component
 * Selector de metodos de pago con soporte para pagos en Divisas, Bolivares o Combinado
 * El modo Combinado permite ingresar manualmente el monto USD y calcula el restante en Bs
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
    DollarSign,
    CreditCard,
    Smartphone,
    Building,
    Trash2,
    Banknote,
    ArrowRightLeft,
    Plus
} from 'lucide-react';
import { METODOS_PAGO } from '../types/sales.types';
import { formatearUSD, formatearBs } from '../utils/salesCalculations';

// Modos de pago
const MODOS_PAGO = {
    divisas: { etiqueta: 'Divisas (USD)', icono: DollarSign, color: '#22c55e' },
    bolivares: { etiqueta: 'Bolivares (Bs)', icono: Banknote, color: '#3b82f6' },
    combinado: { etiqueta: 'Pago Combinado', icono: ArrowRightLeft, color: '#8b5cf6' }
};

// Metodos por modo
const METODOS_USD = ['efectivo_usd', 'zelle', 'transferencia_usd'];
const METODOS_BS = ['efectivo_bs', 'punto', 'pago_movil', 'transferencia_bs'];

// Iconos por metodo
const ICONOS_METODO = {
    efectivo_usd: DollarSign,
    efectivo_bs: Banknote,
    punto: CreditCard,
    transferencia_usd: Building,
    transferencia_bs: Building,
    zelle: Smartphone,
    pago_movil: Smartphone
};

const PaymentSelector = ({
    metodosPago,
    total,
    totalPagado,
    restante,
    pagadoCompleto,
    tasaCambio,
    onAgregarMetodo,
    onActualizarMetodo,
    onEliminarMetodo,
    onAnterior,
    onFinalizar
}) => {
    const [modoPago, setModoPago] = useState('divisas');

    // Estado para modo combinado
    const [combinadoUSD, setCombinadoUSD] = useState(0);
    const [metodoUSD, setMetodoUSD] = useState('efectivo_usd');
    const [metodoBs, setMetodoBs] = useState('efectivo_bs');
    const [referenciaUSD, setReferenciaUSD] = useState('');
    const [referenciaBs, setReferenciaBs] = useState('');

    // Total en Bs equivalente
    const totalBs = total * tasaCambio;

    // Calcular restante en Bs para modo combinado
    const restanteEnBs = useMemo(() => {
        const usdPagado = Math.min(combinadoUSD, total);
        const restanteUSD = total - usdPagado;
        return restanteUSD * tasaCambio;
    }, [combinadoUSD, total, tasaCambio]);

    // Calcular total pagado considerando conversion
    const resumenPagos = useMemo(() => {
        let totalUSD = 0;
        let totalBsPagado = 0;

        metodosPago.forEach(pago => {
            if (pago.moneda === 'USD') {
                totalUSD += pago.monto;
            } else {
                totalBsPagado += pago.monto;
            }
        });

        // Convertir Bs a USD para el total
        const bsEnUSD = tasaCambio > 0 ? totalBsPagado / tasaCambio : 0;
        const totalPagadoEnUSD = totalUSD + bsEnUSD;

        return {
            totalUSD,
            totalBsPagado,
            bsEnUSD,
            totalPagadoEnUSD,
            restanteUSD: Math.max(0, total - totalPagadoEnUSD),
            restanteBs: Math.max(0, (total - totalPagadoEnUSD) * tasaCambio),
            completo: totalPagadoEnUSD >= total - 0.01
        };
    }, [metodosPago, total, tasaCambio]);

    // Verificar si pago combinado esta completo
    const combinadoCompleto = useMemo(() => {
        if (modoPago !== 'combinado') return false;
        return combinadoUSD >= total - 0.01 || (combinadoUSD >= 0 && restanteEnBs >= 0);
    }, [modoPago, combinadoUSD, total, restanteEnBs]);

    // Handler para agregar metodo con moneda correcta (modos normales)
    const handleAgregarMetodo = (metodo) => {
        const esBs = metodo.includes('bs') || metodo === 'punto' || metodo === 'pago_movil';
        const moneda = esBs ? 'Bs' : 'USD';
        const montoDefault = esBs ? resumenPagos.restanteBs : resumenPagos.restanteUSD;

        onAgregarMetodo(metodo, {
            moneda,
            monto: Math.max(0, parseFloat(montoDefault.toFixed(2))),
            tasaCambioUsada: tasaCambio
        });
    };

    // Handler para aplicar pago combinado
    const handleAplicarCombinado = () => {
        // Limpiar pagos anteriores
        while (metodosPago.length > 0) {
            onEliminarMetodo(0);
        }

        // Agregar pago en USD si hay monto
        if (combinadoUSD > 0) {
            onAgregarMetodo(metodoUSD, {
                moneda: 'USD',
                monto: parseFloat(combinadoUSD.toFixed(2)),
                tasaCambioUsada: tasaCambio,
                referencia: referenciaUSD
            });
        }

        // Agregar pago en Bs si hay restante
        if (restanteEnBs > 0.01) {
            setTimeout(() => {
                onAgregarMetodo(metodoBs, {
                    moneda: 'Bs',
                    monto: parseFloat(restanteEnBs.toFixed(2)),
                    tasaCambioUsada: tasaCambio,
                    referencia: referenciaBs
                });
            }, 50);
        }
    };

    // Metodos a mostrar segun modo
    const getMetodosDisponibles = () => {
        if (modoPago === 'divisas') return METODOS_USD;
        if (modoPago === 'bolivares') return METODOS_BS;
        return [...METODOS_USD, ...METODOS_BS];
    };

    const metodosDisponibles = getMetodosDisponibles();

    // Renderizado del modo combinado especial
    const renderModoCombinado = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Paso 1: Monto en Divisas */}
            <div style={{
                padding: '1.25rem',
                background: 'rgba(34, 197, 94, 0.05)',
                border: '2px solid rgba(34, 197, 94, 0.2)',
                borderRadius: 'var(--radius-md)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    color: '#22c55e',
                    fontWeight: '700'
                }}>
                    <DollarSign size={20} />
                    <span>PASO 1: Monto en Divisas (USD)</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                            Monto USD
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute',
                                left: '0.75rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#22c55e',
                                fontWeight: 'bold'
                            }}>$</span>
                            <input
                                type="number"
                                value={combinadoUSD}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setCombinadoUSD(Math.min(val, total));
                                }}
                                step="0.01"
                                min="0"
                                max={total}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 1.75rem',
                                    border: '2px solid #22c55e',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '1.25rem',
                                    fontWeight: 'bold'
                                }}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                            Metodo USD
                        </label>
                        <select
                            value={metodoUSD}
                            onChange={(e) => setMetodoUSD(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.9rem'
                            }}
                        >
                            {METODOS_USD.map(m => (
                                <option key={m} value={m}>{METODOS_PAGO[m]?.etiqueta}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {(metodoUSD === 'zelle' || metodoUSD === 'transferencia_usd') && (
                    <div style={{ marginTop: '0.75rem' }}>
                        <input
                            type="text"
                            value={referenciaUSD}
                            onChange={(e) => setReferenciaUSD(e.target.value)}
                            placeholder="Referencia (opcional)"
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Paso 2: Restante en Bolivares */}
            <div style={{
                padding: '1.25rem',
                background: 'rgba(59, 130, 246, 0.05)',
                border: '2px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-md)',
                opacity: restanteEnBs > 0.01 ? 1 : 0.5
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    color: '#3b82f6',
                    fontWeight: '700'
                }}>
                    <Banknote size={20} />
                    <span>PASO 2: Restante en Bolivares (Bs)</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                            Monto Bs (calculado)
                        </label>
                        <div style={{
                            padding: '0.75rem',
                            background: '#f1f5f9',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            color: '#3b82f6'
                        }}>
                            {formatearBs(restanteEnBs)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            ≈ {formatearUSD(total - combinadoUSD)} restante
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                            Metodo Bs
                        </label>
                        <select
                            value={metodoBs}
                            onChange={(e) => setMetodoBs(e.target.value)}
                            disabled={restanteEnBs < 0.01}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.9rem'
                            }}
                        >
                            {METODOS_BS.map(m => (
                                <option key={m} value={m}>{METODOS_PAGO[m]?.etiqueta}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {restanteEnBs > 0.01 && (metodoBs === 'pago_movil' || metodoBs === 'transferencia_bs' || metodoBs === 'punto') && (
                    <div style={{ marginTop: '0.75rem' }}>
                        <input
                            type="text"
                            value={referenciaBs}
                            onChange={(e) => setReferenciaBs(e.target.value)}
                            placeholder="Referencia (opcional)"
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Boton aplicar */}
            <button
                onClick={handleAplicarCombinado}
                disabled={combinadoUSD <= 0 && restanteEnBs <= 0}
                className="btn btn-primary"
                style={{
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '1rem'
                }}
            >
                <Plus size={20} />
                Aplicar Pago Combinado
            </button>
        </div>
    );

    // Renderizado de modos normales (USD o Bs)
    const renderModoNormal = () => (
        <>
            {/* Grid de metodos disponibles */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                marginBottom: '1.5rem'
            }}>
                {metodosDisponibles.map(clave => {
                    const info = METODOS_PAGO[clave];
                    const Icono = ICONOS_METODO[clave] || DollarSign;
                    const esBs = clave.includes('bs') || clave === 'punto' || clave === 'pago_movil';

                    return (
                        <button
                            key={clave}
                            onClick={() => handleAgregarMetodo(clave)}
                            disabled={resumenPagos.completo}
                            className="btn btn-secondary"
                            style={{
                                padding: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                justifyContent: 'flex-start',
                                opacity: resumenPagos.completo ? 0.5 : 1,
                                borderLeft: `4px solid ${esBs ? '#3b82f6' : '#22c55e'}`
                            }}
                        >
                            <Icono size={18} />
                            <span style={{ fontSize: '0.85rem' }}>{info?.etiqueta}</span>
                            <span style={{
                                marginLeft: 'auto',
                                fontSize: '0.7rem',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '10px',
                                background: esBs ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                color: esBs ? '#3b82f6' : '#22c55e'
                            }}>
                                {esBs ? 'Bs' : 'USD'}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Pagos agregados */}
            {metodosPago.length > 0 && (
                <div>
                    <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                        Pagos Registrados:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {metodosPago.map((pago, indice) => {
                            const info = METODOS_PAGO[pago.metodo];
                            const Icono = ICONOS_METODO[pago.metodo] || DollarSign;
                            const esBs = pago.moneda === 'Bs';
                            const equivalente = esBs
                                ? (tasaCambio > 0 ? pago.monto / tasaCambio : 0)
                                : pago.monto * tasaCambio;

                            return (
                                <div
                                    key={indice}
                                    style={{
                                        padding: '1rem',
                                        border: `1px solid ${esBs ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        background: esBs ? 'rgba(59, 130, 246, 0.05)' : 'rgba(34, 197, 94, 0.05)'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '0.5rem'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontWeight: '600'
                                        }}>
                                            <Icono size={16} />
                                            {info?.etiqueta || pago.metodo}
                                            <span style={{
                                                fontSize: '0.7rem',
                                                padding: '0.1rem 0.4rem',
                                                borderRadius: '10px',
                                                background: esBs ? '#3b82f6' : '#22c55e',
                                                color: 'white'
                                            }}>
                                                {pago.moneda}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => onEliminarMetodo(indice)}
                                            style={{
                                                color: 'var(--danger)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: info?.requiereRef ? '1fr 1fr' : '1fr',
                                        gap: '0.5rem'
                                    }}>
                                        <div>
                                            <label style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                Monto ({pago.moneda})
                                            </label>
                                            <input
                                                type="number"
                                                value={pago.monto}
                                                onChange={(e) => onActualizarMetodo(indice, 'monto', parseFloat(e.target.value) || 0)}
                                                step="0.01"
                                                style={{
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: 'var(--radius-sm)'
                                                }}
                                            />
                                            <div style={{
                                                fontSize: '0.7rem',
                                                color: 'var(--text-secondary)',
                                                marginTop: '0.25rem'
                                            }}>
                                                ≈ {esBs ? formatearUSD(equivalente) : formatearBs(equivalente)}
                                            </div>
                                        </div>
                                        {info?.requiereRef && (
                                            <div>
                                                <label style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-secondary)'
                                                }}>
                                                    Referencia
                                                </label>
                                                <input
                                                    type="text"
                                                    value={pago.referencia || ''}
                                                    onChange={(e) => onActualizarMetodo(indice, 'referencia', e.target.value)}
                                                    placeholder="Ref..."
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.5rem',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: 'var(--radius-sm)'
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="glass-panel" style={{
            padding: '2rem',
            maxWidth: '900px',
            margin: '0 auto',
            width: '100%',
            alignSelf: 'start',
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: '2rem',
            borderRadius: 'var(--radius-lg)'
        }}>
            {/* Columna izquierda: Metodos */}
            <div>
                <h2 style={{ marginBottom: '1rem' }}>Forma de Pago</h2>

                {/* Selector de modo de pago */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem',
                    marginBottom: '1.5rem'
                }}>
                    {Object.entries(MODOS_PAGO).map(([modo, info]) => {
                        const Icono = info.icono;
                        const activo = modoPago === modo;
                        return (
                            <button
                                key={modo}
                                onClick={() => setModoPago(modo)}
                                style={{
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: activo ? `2px solid ${info.color}` : '2px solid transparent',
                                    background: activo ? `${info.color}15` : '#f8fafc',
                                    color: activo ? info.color : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s',
                                    fontWeight: activo ? '700' : '500'
                                }}
                            >
                                <Icono size={24} />
                                <span style={{ fontSize: '0.85rem' }}>{info.etiqueta}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Equivalencia de tasa */}
                <div style={{
                    padding: '0.75rem 1rem',
                    background: '#f1f5f9',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.9rem'
                }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        Tasa de cambio:
                    </span>
                    <span style={{ fontWeight: 'bold' }}>
                        1 USD = {tasaCambio.toFixed(2)} Bs
                    </span>
                </div>

                {/* Contenido segun modo */}
                {modoPago === 'combinado' ? renderModoCombinado() : renderModoNormal()}
            </div>

            {/* Columna derecha: Resumen */}
            <div style={{
                padding: '1.5rem',
                background: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                height: 'fit-content'
            }}>
                <h3 style={{ marginBottom: '1rem' }}>Resumen de Pago</h3>

                {/* Total a pagar */}
                <div style={{
                    padding: '1rem',
                    background: 'white',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        Total a Pagar
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {formatearUSD(total)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {formatearBs(totalBs)}
                    </div>
                </div>

                {/* Desglose para modo combinado */}
                {modoPago === 'combinado' && combinadoUSD > 0 && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0',
                            borderBottom: '1px solid #e2e8f0'
                        }}>
                            <span style={{ color: '#22c55e' }}>💵 En USD:</span>
                            <span style={{ fontWeight: '600', color: '#22c55e' }}>
                                {formatearUSD(combinadoUSD)}
                            </span>
                        </div>
                        {restanteEnBs > 0.01 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.5rem 0',
                                borderBottom: '1px solid #e2e8f0'
                            }}>
                                <span style={{ color: '#3b82f6' }}>🇻🇪 En Bs:</span>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: '600', color: '#3b82f6' }}>
                                        {formatearBs(restanteEnBs)}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                        ≈ {formatearUSD(total - combinadoUSD)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Desglose de pagos registrados */}
                {metodosPago.length > 0 && modoPago !== 'combinado' && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                        {resumenPagos.totalUSD > 0 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.5rem 0',
                                borderBottom: '1px solid #e2e8f0'
                            }}>
                                <span style={{ color: '#22c55e' }}>💵 Pagado USD:</span>
                                <span style={{ fontWeight: '600', color: '#22c55e' }}>
                                    {formatearUSD(resumenPagos.totalUSD)}
                                </span>
                            </div>
                        )}
                        {resumenPagos.totalBsPagado > 0 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.5rem 0',
                                borderBottom: '1px solid #e2e8f0'
                            }}>
                                <span style={{ color: '#3b82f6' }}>🇻🇪 Pagado Bs:</span>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: '600', color: '#3b82f6' }}>
                                        {formatearBs(resumenPagos.totalBsPagado)}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                        ≈ {formatearUSD(resumenPagos.bsEnUSD)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Restante */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: resumenPagos.completo ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 'bold',
                    color: resumenPagos.completo ? 'var(--success)' : 'var(--warning)'
                }}>
                    <span>Restante:</span>
                    <div style={{ textAlign: 'right' }}>
                        <div>{formatearUSD(resumenPagos.restanteUSD)}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                            {formatearBs(resumenPagos.restanteBs)}
                        </div>
                    </div>
                </div>

                {resumenPagos.completo && (
                    <div style={{
                        padding: '0.75rem',
                        background: 'rgba(16, 185, 129, 0.15)',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        color: 'var(--success)',
                        fontWeight: '700',
                        marginBottom: '1rem',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                        ✓ PAGO COMPLETO
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                        onClick={onAnterior}
                        className="btn btn-secondary"
                    >
                        ← Atras
                    </button>
                    <button
                        onClick={onFinalizar}
                        disabled={!resumenPagos.completo}
                        className="btn btn-primary"
                        style={{
                            opacity: resumenPagos.completo ? 1 : 0.5,
                            padding: '1rem',
                            fontSize: '1.1rem'
                        }}
                    >
                        Finalizar Venta ✓
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentSelector;
