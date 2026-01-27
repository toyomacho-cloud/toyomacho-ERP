/**
 * Sales Store - Estado centralizado del modulo de ventas
 * Implementacion tipo Zustand usando React hooks
 */
import { useState, useCallback, useMemo } from 'react';
import {
    calcularSubtotal,
    calcularIVA,
    calcularTotal,
    convertirABolivares,
    calcularTotalPagado,
    calcularRestante,
    estaPagadoCompleto
} from '../utils/salesCalculations';

/**
 * Estado inicial del carrito
 */
const estadoInicial = {
    id: 1,
    carrito: [],
    clienteSeleccionado: null,
    tipoCliente: 'rapida', // 'rapida' | 'existente' | 'nuevo'
    tipoVenta: 'contado', // 'contado' | 'credito'
    diasCredito: 15,
    tipoDocumento: 'pedido', // 'pedido' | 'factura'
    metodosPago: [],
    pasoActual: 1,
    nuevoCliente: { tipo: 'V', nombre: '', rif: '', telefono: '', direccion: '' }
};

/**
 * Crear carrito vacio
 */
const crearCarritoVacio = (id) => ({
    ...estadoInicial,
    id
});

/**
 * Hook principal del store de ventas
 * @param {number} tasaCambio - Tasa de cambio actual
 * @returns {Object} Estado y acciones del store
 */
export const useSalesStore = (tasaCambio = 0) => {
    // Estado de carritos multiples
    const [carritos, setCarritos] = useState([crearCarritoVacio(1)]);
    const [carritoActivoId, setCarritoActivoId] = useState(1);
    const [modoVenta, setModoVenta] = useState('venta'); // 'venta' | 'presupuesto'
    const [ventaCompletada, setVentaCompletada] = useState(null);

    // Obtener carrito activo
    const carritoActivo = useMemo(() =>
        carritos.find(c => c.id === carritoActivoId) || carritos[0],
        [carritos, carritoActivoId]
    );

    // Calculos derivados
    const calculos = useMemo(() => {
        const subtotal = calcularSubtotal(carritoActivo.carrito);
        const aplicaIVA = carritoActivo.tipoDocumento === 'factura' && modoVenta !== 'presupuesto';
        const iva = calcularIVA(subtotal, aplicaIVA);
        const total = calcularTotal(subtotal, iva);
        const totalBs = convertirABolivares(total, tasaCambio);
        const totalPagado = calcularTotalPagado(carritoActivo.metodosPago);
        const restante = calcularRestante(total, totalPagado);
        const pagadoCompleto = estaPagadoCompleto(total, totalPagado);

        return {
            subtotal,
            iva,
            total,
            totalBs,
            totalPagado,
            restante,
            pagadoCompleto
        };
    }, [carritoActivo.carrito, carritoActivo.tipoDocumento, carritoActivo.metodosPago, tasaCambio, modoVenta]);

    // Actualizar carrito activo
    const actualizarCarritoActivo = useCallback((actualizaciones) => {
        setCarritos(prev => prev.map(c =>
            c.id === carritoActivoId ? { ...c, ...actualizaciones } : c
        ));
    }, [carritoActivoId]);

    // ACCIONES DEL CARRITO

    /**
     * Agregar producto al carrito
     */
    const agregarProducto = useCallback((producto) => {
        const existente = carritoActivo.carrito.find(item => item.productoId === producto.id);
        const esPresupuesto = modoVenta === 'presupuesto';

        if (existente) {
            const carritoActualizado = carritoActivo.carrito.map(item =>
                item.productoId === producto.id
                    ? {
                        ...item,
                        cantidad: esPresupuesto
                            ? item.cantidad + 1
                            : Math.min(item.cantidad + 1, producto.quantity)
                    }
                    : item
            );
            actualizarCarritoActivo({ carrito: carritoActualizado });
        } else {
            const nuevoItem = {
                productoId: producto.id,
                sku: producto.sku,
                referencia: producto.reference || producto.sku,
                descripcion: producto.description,
                marca: producto.brand || '',
                ubicacion: producto.location || '',
                precioUSD: producto.price || 0,
                cantidad: 1,
                cantidadMax: esPresupuesto ? 9999 : producto.quantity
            };
            actualizarCarritoActivo({ carrito: [...carritoActivo.carrito, nuevoItem] });
        }
    }, [carritoActivo.carrito, modoVenta, actualizarCarritoActivo]);

    /**
     * Eliminar producto del carrito
     */
    const eliminarProducto = useCallback((indice) => {
        const carritoActualizado = carritoActivo.carrito.filter((_, i) => i !== indice);
        actualizarCarritoActivo({ carrito: carritoActualizado });
    }, [carritoActivo.carrito, actualizarCarritoActivo]);

    /**
     * Actualizar cantidad de producto
     */
    const actualizarCantidad = useCallback((indice, nuevaCantidad) => {
        const carritoActualizado = carritoActivo.carrito.map((item, i) =>
            i === indice
                ? { ...item, cantidad: Math.max(1, Math.min(nuevaCantidad, item.cantidadMax)) }
                : item
        );
        actualizarCarritoActivo({ carrito: carritoActualizado });
    }, [carritoActivo.carrito, actualizarCarritoActivo]);

    /**
     * Actualizar precio de producto
     */
    const actualizarPrecio = useCallback((indice, nuevoPrecio) => {
        const carritoActualizado = carritoActivo.carrito.map((item, i) =>
            i === indice ? { ...item, precioUSD: parseFloat(nuevoPrecio) || 0 } : item
        );
        actualizarCarritoActivo({ carrito: carritoActualizado });
    }, [carritoActivo.carrito, actualizarCarritoActivo]);

    /**
     * Limpiar carrito
     */
    const limpiarCarrito = useCallback(() => {
        actualizarCarritoActivo({
            carrito: [],
            metodosPago: [],
            pasoActual: 1
        });
    }, [actualizarCarritoActivo]);

    // ACCIONES DE CLIENTE

    /**
     * Seleccionar cliente
     */
    const seleccionarCliente = useCallback((cliente) => {
        actualizarCarritoActivo({
            clienteSeleccionado: cliente,
            tipoCliente: 'existente'
        });
    }, [actualizarCarritoActivo]);

    /**
     * Establecer venta rapida (sin cliente)
     */
    const ventaRapida = useCallback(() => {
        actualizarCarritoActivo({
            clienteSeleccionado: null,
            tipoCliente: 'rapida'
        });
    }, [actualizarCarritoActivo]);

    // ACCIONES DE PAGO

    /**
     * Agregar metodo de pago con soporte para multiples monedas
     */
    const agregarMetodoPago = useCallback((metodo, opciones = {}) => {
        const esBs = metodo.includes('bs') || metodo === 'punto' || metodo === 'pago_movil';
        const monedaDefault = esBs ? 'Bs' : 'USD';

        const nuevoPago = {
            metodo,
            monto: opciones.monto ?? (esBs ? calculos.restante * tasaCambio : calculos.restante),
            moneda: opciones.moneda ?? monedaDefault,
            referencia: '',
            tasaCambioUsada: opciones.tasaCambioUsada ?? tasaCambio
        };
        actualizarCarritoActivo({
            metodosPago: [...carritoActivo.metodosPago, nuevoPago]
        });
    }, [carritoActivo.metodosPago, calculos.restante, tasaCambio, actualizarCarritoActivo]);

    /**
     * Actualizar metodo de pago
     */
    const actualizarMetodoPago = useCallback((indice, campo, valor) => {
        const pagosActualizados = [...carritoActivo.metodosPago];
        pagosActualizados[indice] = { ...pagosActualizados[indice], [campo]: valor };
        actualizarCarritoActivo({ metodosPago: pagosActualizados });
    }, [carritoActivo.metodosPago, actualizarCarritoActivo]);

    /**
     * Eliminar metodo de pago
     */
    const eliminarMetodoPago = useCallback((indice) => {
        actualizarCarritoActivo({
            metodosPago: carritoActivo.metodosPago.filter((_, i) => i !== indice)
        });
    }, [carritoActivo.metodosPago, actualizarCarritoActivo]);

    // ACCIONES DE NAVEGACION

    /**
     * Ir al siguiente paso
     */
    const siguientePaso = useCallback(() => {
        if (carritoActivo.pasoActual < 5) {
            actualizarCarritoActivo({ pasoActual: carritoActivo.pasoActual + 1 });
        }
    }, [carritoActivo.pasoActual, actualizarCarritoActivo]);

    /**
     * Ir al paso anterior
     */
    const pasoAnterior = useCallback(() => {
        if (carritoActivo.pasoActual > 1) {
            actualizarCarritoActivo({ pasoActual: carritoActivo.pasoActual - 1 });
        }
    }, [carritoActivo.pasoActual, actualizarCarritoActivo]);

    /**
     * Ir a paso especifico
     */
    const irAPaso = useCallback((paso) => {
        if (paso >= 1 && paso <= 5 && paso <= carritoActivo.pasoActual) {
            actualizarCarritoActivo({ pasoActual: paso });
        }
    }, [carritoActivo.pasoActual, actualizarCarritoActivo]);

    // ACCIONES DE MULTI-CARRITO

    /**
     * Agregar nuevo carrito
     */
    const agregarNuevoCarrito = useCallback(() => {
        if (carritos.length >= 5) {
            alert('Maximo 5 carritos simultaneos permitidos');
            return;
        }
        const nuevoId = Math.max(...carritos.map(c => c.id), 0) + 1;
        const nuevoCarrito = crearCarritoVacio(nuevoId);
        setCarritos([...carritos, nuevoCarrito]);
        setCarritoActivoId(nuevoId);
    }, [carritos]);

    /**
     * Cambiar carrito activo
     */
    const cambiarCarrito = useCallback((carritoId) => {
        setCarritoActivoId(carritoId);
    }, []);

    /**
     * Cerrar carrito
     */
    const cerrarCarrito = useCallback((carritoId) => {
        const carritoACerrar = carritos.find(c => c.id === carritoId);
        if (carritoACerrar?.carrito.length > 0) {
            if (!window.confirm(`Cerrar carrito con ${carritoACerrar.carrito.length} producto(s)?`)) {
                return;
            }
        }

        if (carritos.length === 1) {
            setCarritos([crearCarritoVacio(1)]);
            setCarritoActivoId(1);
            return;
        }

        const restantes = carritos.filter(c => c.id !== carritoId);
        setCarritos(restantes);
        if (carritoActivoId === carritoId) {
            setCarritoActivoId(restantes[0].id);
        }
    }, [carritos, carritoActivoId]);

    // ACCIONES DE CONFIGURACION

    /**
     * Establecer tipo de venta
     */
    const establecerTipoVenta = useCallback((tipo) => {
        actualizarCarritoActivo({ tipoVenta: tipo });
    }, [actualizarCarritoActivo]);

    /**
     * Establecer dias de credito
     */
    const establecerDiasCredito = useCallback((dias) => {
        actualizarCarritoActivo({ diasCredito: dias });
    }, [actualizarCarritoActivo]);

    /**
     * Establecer tipo de documento
     */
    const establecerTipoDocumento = useCallback((tipo) => {
        actualizarCarritoActivo({ tipoDocumento: tipo });
    }, [actualizarCarritoActivo]);

    return {
        // Estado
        carritos,
        carritoActivoId,
        carritoActivo,
        modoVenta,
        ventaCompletada,

        // Calculos
        ...calculos,

        // Acciones de carrito
        agregarProducto,
        eliminarProducto,
        actualizarCantidad,
        actualizarPrecio,
        limpiarCarrito,

        // Acciones de cliente
        seleccionarCliente,
        ventaRapida,

        // Acciones de pago
        agregarMetodoPago,
        actualizarMetodoPago,
        eliminarMetodoPago,

        // Acciones de navegacion
        siguientePaso,
        pasoAnterior,
        irAPaso,

        // Acciones de multi-carrito
        agregarNuevoCarrito,
        cambiarCarrito,
        cerrarCarrito,

        // Acciones de configuracion
        setModoVenta,
        establecerTipoVenta,
        establecerDiasCredito,
        establecerTipoDocumento,
        setVentaCompletada,
        actualizarCarritoActivo
    };
};

export default useSalesStore;
