import React, { createContext, useContext } from 'react';
import { useInventory } from '../hooks/useInventory';

const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
    const inventory = useInventory();

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
