/**
 * Sales Module Types (JSDoc)
 * Definiciones de tipos para el modulo de ventas
 */

/**
 * @typedef {Object} ProductoCarrito
 * @property {number} productoId - ID del producto
 * @property {string} sku - Codigo SKU
 * @property {string} referencia - Referencia del producto
 * @property {string} descripcion - Descripcion del producto
 * @property {string} marca - Marca del producto
 * @property {string} ubicacion - Ubicacion en almacen
 * @property {number} precioUSD - Precio unitario en USD
 * @property {number} cantidad - Cantidad en carrito
 * @property {number} cantidadMax - Stock disponible
 */

/**
 * @typedef {Object} Cliente
 * @property {number} id - ID del cliente
 * @property {string} nombre - Nombre completo
 * @property {string} rif - RIF/Cedula
 * @property {string} telefono - Telefono de contacto
 * @property {string} direccion - Direccion
 * @property {string} tipo - Tipo: 'V' | 'J' | 'E' | 'G'
 */

/**
 * @typedef {Object} MetodoPago
 * @property {string} metodo - Tipo de metodo
 * @property {number} monto - Monto pagado
 * @property {string} moneda - 'USD' | 'Bs'
 * @property {string} referencia - Referencia de pago
 */

/**
 * @typedef {Object} EstadoVentas
 * @property {ProductoCarrito[]} carrito - Productos en carrito
 * @property {Cliente|null} clienteSeleccionado - Cliente activo
 * @property {'rapida'|'existente'|'nuevo'} tipoCliente - Tipo de cliente
 * @property {'contado'|'credito'} tipoVenta - Tipo de venta
 * @property {number} diasCredito - Dias de credito
 * @property {'pedido'|'factura'} tipoDocumento - Tipo de documento
 * @property {MetodoPago[]} metodosPago - Metodos de pago
 * @property {number} pasoActual - Paso del wizard (1-5)
 * @property {number} tasaCambio - Tasa de cambio activa
 * @property {Object|null} ventaCompletada - Datos de venta finalizada
 */

/**
 * @typedef {Object} EstadisticasDiarias
 * @property {number} ventasHoy - Cantidad de ventas del dia
 * @property {number} porCobrar - Monto pendiente por cobrar
 * @property {number} ventasTotales - Total vendido en USD
 */

/**
 * Metodos de pago disponibles
 */
export const METODOS_PAGO = {
    efectivo_usd: { etiqueta: 'Efectivo USD', moneda: 'USD', requiereRef: false },
    efectivo_bs: { etiqueta: 'Efectivo Bs', moneda: 'Bs', requiereRef: false },
    punto: { etiqueta: 'Punto de Venta', moneda: 'Bs', requiereRef: true },
    transferencia_usd: { etiqueta: 'Transferencia USD', moneda: 'USD', requiereRef: true },
    transferencia_bs: { etiqueta: 'Transferencia Bs', moneda: 'Bs', requiereRef: true },
    zelle: { etiqueta: 'Zelle', moneda: 'USD', requiereRef: true },
    pago_movil: { etiqueta: 'Pago Movil', moneda: 'Bs', requiereRef: true }
};

/**
 * Configuracion de pasos del wizard
 */
export const PASOS_WIZARD = [
    { id: 1, etiqueta: 'Productos', icono: 'Package' },
    { id: 2, etiqueta: 'Cliente', icono: 'User' },
    { id: 3, etiqueta: 'Tipo Venta', icono: 'Receipt' },
    { id: 4, etiqueta: 'Documento', icono: 'FileCheck' },
    { id: 5, etiqueta: 'Listo', icono: 'CheckCircle' }
];

export default {
    METODOS_PAGO,
    PASOS_WIZARD
};
