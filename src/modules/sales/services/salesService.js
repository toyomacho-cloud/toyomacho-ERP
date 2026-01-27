/**
 * Sales Service - Logica de negocio del modulo de ventas
 */

/**
 * Buscar productos
 * @param {string} termino - Termino de busqueda
 * @param {Array} productos - Lista de productos
 * @param {number} limite - Limite de resultados
 * @returns {Array} Productos filtrados
 */
export const buscarProductos = (termino, productos, limite = 100) => {
    if (!termino || !termino.trim()) {
        return [];
    }

    const terminoLower = termino.toLowerCase().trim();

    const resultados = productos.filter(p => {
        const descripcion = (p.description || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const referencia = (p.reference || '').toLowerCase();
        const marca = (p.brand || '').toLowerCase();

        return descripcion.includes(terminoLower) ||
            sku.includes(terminoLower) ||
            referencia.includes(terminoLower) ||
            marca.includes(terminoLower);
    });

    return resultados.slice(0, limite);
};

/**
 * Validar stock disponible
 * @param {Object} producto - Producto a validar
 * @param {number} cantidadSolicitada - Cantidad solicitada
 * @returns {Object} Resultado de validacion
 */
export const validarStock = (producto, cantidadSolicitada) => {
    const stockDisponible = producto.quantity || 0;
    const esValido = cantidadSolicitada <= stockDisponible;

    return {
        valido: esValido,
        stockDisponible,
        cantidadSolicitada,
        mensaje: esValido
            ? null
            : `Stock insuficiente. Disponible: ${stockDisponible}`
    };
};

/**
 * Preparar datos de venta para guardar
 * @param {Object} carritoActivo - Estado del carrito activo
 * @param {Object} calculos - Calculos de totales
 * @param {number} tasaCambio - Tasa de cambio
 * @param {Array} ventasDelDia - Ventas del dia para generar numero
 * @returns {Array} Items de venta preparados
 */
export const prepararDatosVenta = (carritoActivo, calculos, tasaCambio, ventasDelDia = []) => {
    const hoy = new Date();
    const esPresupuesto = false; // TODO: Obtener del modo

    // Calcular fecha de vencimiento para credito
    const fechaVencimiento = carritoActivo.tipoVenta === 'credito'
        ? new Date(hoy.getTime() + (carritoActivo.diasCredito * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        : null;

    // Generar numero de documento
    const prefijo = esPresupuesto ? 'PR-' : '';
    const numeroDocumento = prefijo + String(ventasDelDia.length + 1).padStart(6, '0');

    // Mapear items del carrito a items de venta
    const tipoDocumento = carritoActivo.tipoDocumento || 'pedido';
    const itemsVenta = carritoActivo.carrito.map(item => ({
        product_id: item.productoId,
        sku: item.sku,
        reference: item.referencia || '',
        description: item.descripcion,
        quantity: item.cantidad,
        unit_price: item.precioUSD,
        amount_usd: item.precioUSD * item.cantidad,
        amount_bs: item.precioUSD * item.cantidad * tasaCambio,
        date: hoy.toISOString().split('T')[0],
        payment_type: esPresupuesto ? 'presupuesto' : carritoActivo.tipoVenta,
        credit_days: carritoActivo.tipoVenta === 'credito' ? carritoActivo.diasCredito : null,
        due_date: fechaVencimiento,
        payment_currency: 'USD',
        exchange_rate: tasaCambio,
        document_type: esPresupuesto ? 'presupuesto' : tipoDocumento,
        document_number: numeroDocumento,
        has_iva: tipoDocumento === 'factura' && !esPresupuesto,
        iva_amount: tipoDocumento === 'factura' && !esPresupuesto
            ? (item.precioUSD * item.cantidad) * 0.16
            : 0,
        customer_id: carritoActivo.tipoCliente === 'rapida' ? null : carritoActivo.clienteSeleccionado?.id,
        is_quote: esPresupuesto,
        status: esPresupuesto ? 'pending' : (carritoActivo.tipoVenta === 'credito' ? 'pending' : 'paid'),
        payment_status: esPresupuesto ? 'pending' : (carritoActivo.tipoVenta === 'credito' ? 'pending' : 'paid'),
        paid_amount: (carritoActivo.tipoVenta === 'credito' || esPresupuesto) ? 0 : (item.precioUSD * item.cantidad),
        remaining_amount: (carritoActivo.tipoVenta === 'credito' || esPresupuesto) ? (item.precioUSD * item.cantidad) : 0
    }));

    return {
        items: itemsVenta,
        numeroDocumento,
        fechaVencimiento,
        esPresupuesto
    };
};

/**
 * Generar datos de factura completada
 * @param {Object} carritoActivo - Estado del carrito
 * @param {Object} calculos - Calculos de totales
 * @param {string} numeroDocumento - Numero de documento
 * @param {number} tasaCambio - Tasa de cambio
 * @returns {Object} Datos de factura
 */
export const generarDatosFactura = (carritoActivo, calculos, numeroDocumento, tasaCambio) => {
    const hoy = new Date();
    const fechaVencimiento = carritoActivo.tipoVenta === 'credito'
        ? new Date(hoy.getTime() + (carritoActivo.diasCredito * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        : null;

    return {
        items: carritoActivo.carrito,
        cliente: carritoActivo.tipoCliente === 'rapida' ? null : carritoActivo.clienteSeleccionado,
        tipoDocumento: carritoActivo.tipoDocumento || 'pedido',
        tipoPago: carritoActivo.tipoVenta,
        diasCredito: carritoActivo.tipoVenta === 'credito' ? carritoActivo.diasCredito : null,
        fechaVencimiento,
        subtotal: calculos.subtotal,
        iva: calculos.iva,
        total: calculos.total,
        totalBs: calculos.totalBs,
        tasaCambio,
        fecha: hoy.toISOString(),
        esPresupuesto: false,
        numeroDocumento
    };
};

/**
 * Debounce utility
 * @param {Function} func - Funcion a ejecutar
 * @param {number} espera - Tiempo de espera en ms
 * @returns {Function} Funcion con debounce
 */
export const debounce = (func, espera) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), espera);
    };
};

export default {
    buscarProductos,
    validarStock,
    prepararDatosVenta,
    generarDatosFactura,
    debounce
};
