import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ExchangeRateContext = createContext();

export const useExchangeRates = () => {
    const context = useContext(ExchangeRateContext);
    if (!context) {
        throw new Error('useExchangeRates must be used within an ExchangeRateProvider');
    }
    return context;
};

export const ExchangeRateProvider = ({ children }) => {
    const [bcvRate, setBcvRate] = useState(0);
    const [usdtRate, setUsdtRate] = useState(0); // Binance P2P Rate
    const [lastUpdate, setLastUpdate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Initial load from localStorage
    useEffect(() => {
        const savedBcv = localStorage.getItem('bcvRate');
        const savedUsdt = localStorage.getItem('binanceRate'); // Using same key as POS used
        const savedDate = localStorage.getItem('exchangeRatesLastUpdate');

        if (savedBcv) setBcvRate(parseFloat(savedBcv));
        if (savedUsdt) setUsdtRate(parseFloat(savedUsdt));
        if (savedDate) setLastUpdate(new Date(savedDate));
    }, []);

    const fetchRates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('🔄 Fetching centralized exchange rates...');

            // 1. Fetch BCV Rate
            // ==========================================
            let newBcvRate = null;
            try {
                // Official source
                const bcvResponse = await fetch('https://api.exchangedyn.com/markets/quotes/usdves/bcv');
                if (bcvResponse.ok) {
                    const data = await bcvResponse.json();
                    if (data?.sources?.BCV?.quote) {
                        newBcvRate = parseFloat(data.sources.BCV.quote);
                    }
                }

                // Fallback source if primary fails
                if (!newBcvRate) {
                    const fallbackResponse = await fetch('https://ve.dolarapi.com/v1/dolares');
                    if (fallbackResponse.ok) {
                        const fallbackData = await fallbackResponse.json();
                        const oficialRate = fallbackData.find(item => item.fuente === 'oficial');
                        if (oficialRate?.promedio) {
                            newBcvRate = parseFloat(oficialRate.promedio);
                        }
                    }
                }

                if (newBcvRate) {
                    newBcvRate = Math.round(newBcvRate * 100) / 100;
                    setBcvRate(newBcvRate);
                    localStorage.setItem('bcvRate', newBcvRate.toString());
                    localStorage.setItem('dashboardBcvRate', newBcvRate.toString()); // Legacy compat
                }
            } catch (err) {
                console.warn('Failed to fetch BCV rate:', err);
                // Keep existing rate in state if fetch fails
            }

            // 2. Fetch Paralelo Rate (USDT/Binance equivalent) from same API
            // ==========================================
            // The 'paralelo' rate from ve.dolarapi.com closely tracks Binance P2P
            let newUsdtRate = null;
            try {
                const paraleloResponse = await fetch('https://ve.dolarapi.com/v1/dolares');
                if (paraleloResponse.ok) {
                    const allRates = await paraleloResponse.json();
                    const paraleloRate = allRates.find(item => item.fuente === 'paralelo');
                    if (paraleloRate?.promedio) {
                        newUsdtRate = Math.round(parseFloat(paraleloRate.promedio) * 100) / 100;
                    }
                }

                if (newUsdtRate) {
                    setUsdtRate(newUsdtRate);
                    localStorage.setItem('binanceRate', newUsdtRate.toString());
                    localStorage.setItem('dashboardUsdtRate', newUsdtRate.toString()); // Legacy compat
                }

            } catch (err) {
                console.warn('Failed to fetch Paralelo rate:', err);
                // Keep existing rate
            }

            // Update timestamp
            if (newBcvRate || newUsdtRate) {
                const now = new Date();
                setLastUpdate(now);
                localStorage.setItem('exchangeRatesLastUpdate', now.toISOString());
            }

        } catch (e) {
            console.error('Error in exchange rate service:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-refresh every 5 minutes
    useEffect(() => {
        fetchRates();
        const interval = setInterval(fetchRates, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchRates]);

    const value = {
        bcvRate,
        usdtRate,
        lastUpdate,
        loading,
        error,
        refreshRates: fetchRates,
        // Helper to format consistent string "Bs 123.45"
        formatRate: (rate) => `Bs ${rate?.toFixed(2) || '0.00'}`
    };

    return (
        <ExchangeRateContext.Provider value={value}>
            {children}
        </ExchangeRateContext.Provider>
    );
};
