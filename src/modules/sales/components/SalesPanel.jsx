/**
 * SalesPanel Component
 * Componente orquestador principal del modulo de ventas
 */
import React, { useMemo, useEffect } from 'react';
import {
    ShoppingCart,
    RefreshCw,
    List,
    Plus,
    X,
    FileCheck
} from 'lucide-react';

// Componentes del modulo
import ProductSearch from './ProductSearch';
import CartTable from './CartTable';
import CustomerSelector from './CustomerSelector';
import SimplifiedPayment from './SimplifiedPayment';
import DailyStatsBar from './DailyStatsBar';
import WizardNav from './WizardNav';

// Store y utilidades
import { useSalesStore } from '../store/useSalesStore';
import { calcularEstadisticasDiarias } from '../utils/salesCalculations';
import { prepararDatosVenta, generarDatosFactura } from '../services/salesService';

const SalesPanel = ({
    productos,
    clientes,
    ventas,
    tasaBCV,
    tasaBinance,
    cargandoTasas,
    onRefrescarTasas,
    onGuardarVenta,
    onCrearCliente,
    onMostrarVentasDelDia
}) => {
    // Estado de tasa de cambio
    const [tipoTasaSeleccionada, setTipoTasaSeleccionada] = React.useState(
        () => localStorage.getItem('selectedRateType') || 'bcv'
    );
    const tasaCambio = tipoTasaSeleccionada === 'bcv' ? tasaBCV : tasaBinance;

    // Store de ventas
    const store = useSalesStore(tasaCambio);
    const {
        carritos,
        carritoActivoId,
        carritoActivo,
        modoVenta,
        ventaCompletada,
        subtotal,
        iva,
        total,
        totalBs,
        totalPagado,
        restante,
        pagadoCompleto,
        agregarProducto,
        eliminarProducto,
        actualizarCantidad,
        actualizarPrecio,
        limpiarCarrito,
        seleccionarCliente,
        ventaRapida,
        agregarMetodoPago,
        actualizarMetodoPago,
        eliminarMetodoPago,
        siguientePaso,
        pasoAnterior,
        irAPaso,
        agregarNuevoCarrito,
        cambiarCarrito,
        cerrarCarrito,
        setModoVenta,
        establecerTipoVenta,
        establecerDiasCredito,
        establecerTipoDocumento,
        setVentaCompletada,
        actualizarCarritoActivo
    } = store;

    // Persistir carritos en localStorage
    useEffect(() => {
        localStorage.setItem('pos_carts', JSON.stringify(carritos));
    }, [carritos]);

    useEffect(() => {
        localStorage.setItem('pos_active_cart_id', carritoActivoId.toString());
    }, [carritoActivoId]);

    useEffect(() => {
        localStorage.setItem('selectedRateType', tipoTasaSeleccionada);
    }, [tipoTasaSeleccionada]);

    // Calcular estadisticas diarias
    const estadisticasDiarias = useMemo(() =>
        calcularEstadisticasDiarias(ventas || []),
        [ventas]
    );

    // Finalizar venta
    const finalizarVenta = async (generarPDF = false) => {
        if (carritoActivo.carrito.length === 0) return;

        try {
            const ventasDelDia = ventas.filter(s =>
                s.date === new Date().toISOString().split('T')[0]
            );

            const { items, numeroDocumento, fechaVencimiento, esPresupuesto } = prepararDatosVenta(
                carritoActivo,
                { subtotal, iva, total, totalBs },
                tasaCambio,
                ventasDelDia
            );

            // Guardar ventas
            for (const item of items) {
                await onGuardarVenta(item, []);
            }

            // Generar PDF si se solicito
            if (generarPDF) {
                console.log('📄 Generando PDF para venta', numeroDocumento);
                // TODO: Implementar generacion de PDF
                alert(`Venta ${numeroDocumento} completada. PDF en desarrollo.`);
            } else {
                alert(`Venta ${numeroDocumento} completada exitosamente.`);
            }

            // Limpiar carrito y reiniciar
            limpiarCarrito();

        } catch (error) {
            console.error('Error al finalizar venta:', error);
            alert('Error al finalizar la venta');
        }
    };

    // Iniciar nueva venta
    const iniciarNuevaVenta = () => {
        setVentaCompletada(null);
        cerrarCarrito(carritoActivoId);
    };

    // Obtener datos del paso actual
    const { pasoActual, carrito, clienteSeleccionado, tipoCliente, tipoVenta, diasCredito, tipoDocumento, metodosPago } = carritoActivo;

    return (
        <div className="animate-fade-in" style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        }}>
            {/* BARRA SUPERIOR */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                {/* Titulo y acciones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h1 style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '2rem',
                        margin: 0
                    }}>
                        <ShoppingCart size={32} /> Punto de Venta
                    </h1>

                    {/* Botones de modo */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setModoVenta('venta')}
                            style={{
                                padding: '0.35rem 0.85rem',
                                borderRadius: '20px',
                                border: 'none',
                                background: modoVenta === 'venta' ? '#cbd5e1' : 'transparent',
                                color: modoVenta === 'venta' ? '#ea580c' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            🔥 Venta
                        </button>
                        <button
                            onClick={() => setModoVenta('presupuesto')}
                            style={{
                                padding: '0.35rem 0.85rem',
                                borderRadius: '20px',
                                border: 'none',
                                background: modoVenta === 'presupuesto' ? '#cbd5e1' : 'transparent',
                                color: modoVenta === 'presupuesto' ? '#ea580c' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <FileCheck size={14} /> Presupuesto
                        </button>
                        <button
                            onClick={onMostrarVentasDelDia}
                            style={{
                                padding: '0.35rem 0.85rem',
                                borderRadius: '20px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            <List size={14} /> Ventas del Dia
                        </button>
                    </div>
                </div>

                {/* Multi-carrito */}
                <div style={{
                    background: '#94a3b8',
                    padding: '0.35rem 1rem',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    minWidth: '300px',
                    justifyContent: 'center'
                }}>
                    {carritos.map(c => (
                        <div
                            key={c.id}
                            onClick={() => cambiarCarrito(c.id)}
                            style={{
                                cursor: 'pointer',
                                color: carritoActivoId === c.id ? 'white' : 'rgba(255,255,255,0.7)',
                                fontWeight: carritoActivoId === c.id ? 'bold' : 'normal',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontSize: '0.9rem'
                            }}
                        >
                            <ShoppingCart size={16} /> Carrito {c.id}
                            {carritoActivoId === c.id && (
                                <span style={{
                                    background: 'rgba(255,255,255,0.3)',
                                    color: 'white',
                                    fontSize: '0.75rem',
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    minWidth: '20px',
                                    textAlign: 'center'
                                }}>
                                    {c.carrito.length}
                                </span>
                            )}
                            {carritos.length > 1 && (
                                <X
                                    size={12}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        cerrarCarrito(c.id);
                                    }}
                                    style={{ opacity: 0.6, cursor: 'pointer' }}
                                />
                            )}
                        </div>
                    ))}
                    {carritos.length < 5 && (
                        <button
                            onClick={agregarNuevoCarrito}
                            style={{
                                border: '1px solid #94a3b8',
                                background: '#e2e8f0',
                                color: '#475569',
                                borderRadius: '20px',
                                padding: '0.3rem 1rem',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontWeight: '600'
                            }}
                        >
                            <Plus size={14} /> Nuevo Carrito
                        </button>
                    )}
                </div>

                {/* Tasas de cambio */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div
                            onClick={() => setTipoTasaSeleccionada('bcv')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '12px',
                                border: `2px solid ${tipoTasaSeleccionada === 'bcv' ? '#22c55e' : 'transparent'}`,
                                background: '#dcfce7',
                                cursor: 'pointer',
                                minWidth: '100px'
                            }}
                        >
                            <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: '800', letterSpacing: '0.5px' }}>BCV</div>
                            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#166534' }}>
                                {(tasaBCV || 0).toFixed(2)} <span style={{ fontSize: '0.7rem' }}>Bs/$</span>
                            </div>
                        </div>
                        <div
                            onClick={() => setTipoTasaSeleccionada('binance')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '12px',
                                border: `2px solid ${tipoTasaSeleccionada === 'binance' ? '#eab308' : 'transparent'}`,
                                background: '#fef9c3',
                                cursor: 'pointer',
                                minWidth: '100px'
                            }}
                        >
                            <div style={{ fontSize: '0.7rem', color: '#a16207', fontWeight: '800', letterSpacing: '0.5px' }}>BINANCE</div>
                            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#854d0e' }}>
                                {(tasaBinance || 0).toFixed(2)} <span style={{ fontSize: '0.7rem' }}>Bs/$</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onRefrescarTasas}
                        className="btn-icon"
                        style={{
                            background: 'white',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-sm)',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <RefreshCw size={18} className={cargandoTasas ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* BARRA DE ESTADISTICAS */}
            <DailyStatsBar estadisticas={estadisticasDiarias} ventas={ventas} />

            {/* NAVEGACION WIZARD */}
            <WizardNav pasoActual={pasoActual} onIrAPaso={irAPaso} />

            {/* CONTENIDO PRINCIPAL */}
            <div style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: pasoActual === 1 ? '1fr 400px' : '1fr',
                gap: '1.5rem',
                minHeight: 0,
                overflow: 'hidden'
            }}>
                {/* PASO 1: PRODUCTOS */}
                {pasoActual === 1 && (
                    <>
                        <ProductSearch
                            productos={productos}
                            onAgregarProducto={agregarProducto}
                        />
                        <CartTable
                            carrito={carrito}
                            tasaCambio={tasaCambio}
                            subtotal={subtotal}
                            total={total}
                            totalBs={totalBs}
                            onEliminarProducto={eliminarProducto}
                            onActualizarCantidad={actualizarCantidad}
                            onActualizarPrecio={actualizarPrecio}
                            onLimpiarCarrito={limpiarCarrito}
                            onSiguiente={siguientePaso}
                        />
                    </>
                )}

                {/* PASO 2: CLIENTE */}
                {pasoActual === 2 && (
                    <CustomerSelector
                        clientes={clientes}
                        clienteSeleccionado={clienteSeleccionado}
                        tipoCliente={tipoCliente}
                        onSeleccionarCliente={seleccionarCliente}
                        onVentaRapida={ventaRapida}
                        onCrearCliente={onCrearCliente}
                        onAnterior={pasoAnterior}
                        onSiguiente={siguientePaso}
                    />
                )}

                {/* PASO 3: PAGO SIMPLIFICADO */}
                {pasoActual === 3 && (
                    <SimplifiedPayment
                        total={total}
                        totalBs={totalBs}
                        tasaCambio={tasaCambio}
                        tipoVenta={tipoVenta}
                        diasCredito={diasCredito}
                        clienteSeleccionado={clienteSeleccionado}
                        tipoCliente={tipoCliente}
                        onEstablecerTipoVenta={establecerTipoVenta}
                        onEstablecerDiasCredito={establecerDiasCredito}
                        onAnterior={pasoAnterior}
                        onFinalizar={finalizarVenta}
                    />
                )}
            </div>
        </div>
    );
};

export default SalesPanel;
