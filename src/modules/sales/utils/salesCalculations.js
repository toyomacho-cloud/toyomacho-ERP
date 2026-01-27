/**
 * Sales Calculations Utilities
 * Funciones de calculo para el modulo de ventas
 */

/**
 * Calcular subtotal del carrito
 * @param {Array} carrito - Array de productos en carrito
 * @returns {number} Subtotal en USD
 */
export const calcularSubtotal = (carrito) => {
    return carrito.reduce((suma, item) => {
        const precio = parseFloat(item.precioUSD) || 0;
        const cantidad = parseInt(item.cantidad) || 0;
        return suma + (precio * cantidad);
    }, 0);
};

/**
 * Calcular IVA (16%)
 * @param {number} subtotal - Subtotal en USD
 * @param {boolean} aplicaIVA - Si aplica IVA
 * @returns {number} Monto de IVA
 */
export const calcularIVA = (subtotal, aplicaIVA = false) => {
    if (!aplicaIVA) return 0;
    return subtotal * 0.16;
};

/**
 * Calcular total
 * @param {number} subtotal - Subtotal en USD
 * @param {number} iva - Monto de IVA
 * @returns {number} Total en USD
 */
export const calcularTotal = (subtotal, iva = 0) => {
    return subtotal + iva;
};

/**
 * Convertir USD a Bolivares
 * @param {number} montoUSD - Monto en USD
 * @param {number} tasaCambio - Tasa de cambio
 * @returns {number} Monto en Bolivares
 */
export const convertirABolivares = (montoUSD, tasaCambio) => {
    return montoUSD * (tasaCambio || 0);
};

/**
 * Calcular total pagado
 * @param {Array} metodosPago - Array de metodos de pago
 * @returns {number} Total pagado en USD
 */
export const calcularTotalPagado = (metodosPago) => {
    return metodosPago.reduce((suma, pago) => {
        return suma + (parseFloat(pago.monto) || 0);
    }, 0);
};

/**
 * Calcular monto restante por pagar
 * @param {number} total - Total de la venta
 * @param {number} totalPagado - Total pagado
 * @returns {number} Monto restante
 */
export const calcularRestante = (total, totalPagado) => {
    return Math.max(0, total - totalPagado);
};

/**
 * Verificar si el pago esta completo
 * @param {number} total - Total de la venta
 * @param {number} totalPagado - Total pagado
 * @returns {boolean} True si esta pagado completamente
 */
export const estaPagadoCompleto = (total, totalPagado) => {
    return totalPagado >= total - 0.01; // Tolerancia de 1 centavo
};

/**
 * Calcular estadisticas diarias
 * @param {Array} ventas - Array de ventas
 * @returns {Object} Estadisticas del dia
 */
export const calcularEstadisticasDiarias = (ventas) => {
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date();
    finDia.setHours(23, 59, 59, 999);

    return ventas.reduce((stats, venta) => {
        const fechaVenta = new Date(venta.createdAt || venta.created_at);
        if (fechaVenta >= inicioDia && fechaVenta <= finDia) {
            const montoUSD = parseFloat(venta.total || venta.amount_usd) || 0;
            const esPendiente = venta.status === 'pending' || venta.payment_status === 'pending';

            stats.ventasTotales += montoUSD;
            if (esPendiente) {
                stats.porCobrar += montoUSD;
            }
            stats.ventasHoy++;
        }
        return stats;
    }, { ventasHoy: 0, porCobrar: 0, ventasTotales: 0 });
};

/**
 * Formatear precio en USD
 * @param {number} monto - Monto a formatear
 * @returns {string} Monto formateado
 */
export const formatearUSD = (monto) => {
    return `$${(monto || 0).toFixed(2)}`;
};

/**
 * Formatear precio en Bolivares
 * @param {number} monto - Monto a formatear
 * @returns {string} Monto formateado
 */
export const formatearBs = (monto) => {
    return `Bs ${(monto || 0).toFixed(2)}`;
};

export default {
    calcularSubtotal,
    calcularIVA,
    calcularTotal,
    convertirABolivares,
    calcularTotalPagado,
    calcularRestante,
    estaPagadoCompleto,
    calcularEstadisticasDiarias,
    formatearUSD,
    formatearBs
};
