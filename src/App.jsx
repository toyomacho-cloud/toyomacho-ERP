import { useState, lazy, Suspense } from 'react'
import Layout from './components/Layout'
import Login from './components/Login'
import CompanySelector from './components/CompanySelector'
import { AuthProvider, useAuth } from './context/AuthContextSupabase'
import { CompanyProvider, useCompany } from './context/CompanyContextSupabase'
import { InventoryProvider } from './context/InventoryContext'

// Lazy load heavy components for better performance
const Dashboard = lazy(() => import('./components/Dashboard'));
const Inventory = lazy(() => import('./components/Inventory'));
const InventoryControl = lazy(() => import('./components/InventoryControl'));
const Purchases = lazy(() => import('./components/Purchases'));
const POS = lazy(() => import('./components/POS'));
const Settings = lazy(() => import('./components/Settings'));
const NovaMail = lazy(() => import('./components/NovaMail'));
const Reports = lazy(() => import('./components/Reports'));
const Article177Report = lazy(() => import('./components/Article177Report'));
const Clients = lazy(() => import('./components/Clients'));
const AccountsReceivable = lazy(() => import('./components/AccountsReceivable'));
const CashRegister = lazy(() => import('./components/CashRegister'));

// Main App Content (requires auth and company)
function AppContent() {
  const { currentUser, loading: authLoading, userProfile } = useAuth();
  const { hasCompany, loading: companyLoading } = useCompany();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Show loading while checking auth state
  if (authLoading || companyLoading) {
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

  // Show company selector if no company selected
  if (!hasCompany) {
    return <CompanySelector />;
  }

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
      case 'pos':
        return <POS />;
      case 'mail':
        return <NovaMail />;
      case 'reports':
        return <Reports />;
      case 'article177':
        return <Article177Report />;
      case 'clients':
        return <Clients />;
      case 'receivables':
        return <AccountsReceivable />;
      case 'cashregister':
        return <CashRegister onNavigate={setActiveTab} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <InventoryProvider>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        <Suspense fallback={
          <div style={{
            minHeight: '50vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--border-color)',
              borderTopColor: 'var(--accent-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        }>
          {renderContent()}
        </Suspense>
      </Layout>
    </InventoryProvider>
  );
}

// App wrapper with all providers
function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <AppContent />
      </CompanyProvider>
    </AuthProvider>
  )
}

export default App
