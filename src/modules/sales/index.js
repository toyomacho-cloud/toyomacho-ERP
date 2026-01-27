/**
 * Sales Module - Export principal
 * Modulo de ventas modular para Nova ERP
 */

// Componentes
export { default as SalesPanel } from './components/SalesPanel';
export { default as ProductSearch } from './components/ProductSearch';
export { default as CartTable } from './components/CartTable';
export { default as CustomerSelector } from './components/CustomerSelector';
export { default as PaymentSelector } from './components/PaymentSelector';
export { default as SaleTypeSelector } from './components/SaleTypeSelector';
export { default as SaleSummary } from './components/SaleSummary';
export { default as DailyStatsBar } from './components/DailyStatsBar';
export { default as WizardNav } from './components/WizardNav';

// Store
export { useSalesStore } from './store/useSalesStore';

// Services
export * from './services/salesService';

// Utils
export * from './utils/salesCalculations';

// Types
export * from './types/sales.types';

// Default export - Componente principal
export { default } from './components/SalesPanel';
