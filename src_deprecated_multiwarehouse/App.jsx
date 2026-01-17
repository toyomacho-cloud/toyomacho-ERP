import { useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Inventory from './components/Inventory'
import InventoryControl from './components/InventoryControl'
import Purchases from './components/Purchases'
import Sales from './components/Sales'
import Settings from './components/Settings'
import Warehouses from './components/Warehouses'
import Login from './components/Login'
import { AuthProvider, useAuth } from './context/AuthContext'

// Main App Content (requires auth)
function AppContent() {
  const { currentUser, loading, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Show loading while checking auth state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Show login if not authenticated
  if (!currentUser) {
    return <Login />;
  }

  // Check if user is active
  if (userProfile && !userProfile.active) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: '2rem'
      }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Cuenta Desactivada</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Tu cuenta ha sido desactivada. Contacta al administrador para más información.
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <Inventory />;
      case 'warehouses':
        return <Warehouses />;
      case 'control':
        return <InventoryControl />;
      case 'purchases':
        return <Purchases />;
      case 'sales':
        return <Sales />;
      case 'settings':
        return <Settings />;
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

// App wrapper with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
