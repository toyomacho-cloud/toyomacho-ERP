import { useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Inventory from './components/Inventory'
import InventoryControl from './components/InventoryControl'
import Purchases from './components/Purchases'
import SkuGenerator from './components/SkuGenerator'
import Sales from './components/Sales'


function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <Inventory />;
      case 'control':
        return <InventoryControl />;
      case 'purchases':
        return <Purchases />;

      case 'sku-generator':
        return <SkuGenerator />;
      case 'sales':
        return <Sales />;
      case 'settings':
        return <div className="animate-fade-in"><h1>Settings</h1><p>Coming soon...</p></div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  )
}

export default App
