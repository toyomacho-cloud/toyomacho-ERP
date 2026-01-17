import React, { createContext, useContext } from 'react';
import { useInventory } from '../hooks/useInventory';
import { useCompany } from './CompanyContext';

const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
    // Get current company ID from CompanyContext
    const { currentCompanyId } = useCompany();

    // Pass companyId to useInventory hook
    const inventory = useInventory(currentCompanyId);

    return (
        <InventoryContext.Provider value={inventory}>
            {children}
        </InventoryContext.Provider>
    );
};

export const useInventoryContext = () => {
    const context = useContext(InventoryContext);
    if (!context) {
        throw new Error('useInventoryContext must be used within an InventoryProvider');
    }
    return context;
};
