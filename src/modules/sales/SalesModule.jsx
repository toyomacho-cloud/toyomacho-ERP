/**
 * SalesModule Component
 * Wrapper del modulo de ventas con integracion de contextos
 */
import React, { useState } from 'react';
import SalesPanel from './components/SalesPanel';
import { useCompany } from '../../context/CompanyContext';
import { useInventory } from '../../hooks/useInventory';
import { useExchangeRates } from '../../context/ExchangeRateContext';
import DailySalesModal from '../../components/DailySalesModal';

const SalesModule = () => {
    const { currentCompany } = useCompany();
    const { products, sales, customers, addSale } = useInventory(currentCompany?.id);
    const { bcvRate, usdtRate, loading: loadingRates, refreshRates } = useExchangeRates();
    const [showSalesModal, setShowSalesModal] = useState(false);

    // Handler para guardar venta
    const handleGuardarVenta = async (saleData, paymentMethods) => {
        return await addSale(saleData, paymentMethods);
    };

    return (
        <>
            <SalesPanel
                productos={products}
                clientes={customers}
                ventas={sales}
                tasaBCV={bcvRate}
                tasaBinance={usdtRate}
                cargandoTasas={loadingRates}
                onRefrescarTasas={refreshRates}
                onGuardarVenta={handleGuardarVenta}
                onMostrarVentasDelDia={() => setShowSalesModal(true)}
            />

            {/* Modal de ventas del dia */}
            {showSalesModal && (
                <DailySalesModal
                    isOpen={showSalesModal}
                    onClose={() => setShowSalesModal(false)}
                    sales={sales}
                    products={products}
                    exchangeRate={bcvRate}
                />
            )}
        </>
    );
};

export default SalesModule;
