import React from 'react';
import { LayoutDashboard, Package, Settings, LogOut, ClipboardList, ShoppingCart, Hash, ArrowRightLeft, X, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ activeTab, setActiveTab, isOpen, onClose }) => {
    const { logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'inventory', label: 'Productos', icon: Package },
        { id: 'warehouses', label: 'Almacenes', icon: Building },
        { id: 'control', label: 'Control de Inventario', icon: ClipboardList },
        { id: 'purchases', label: 'Compras', icon: ShoppingCart },
        { id: 'sales', label: 'Ventas / Egresos', icon: ArrowRightLeft },
        { id: 'settings', label: 'Configuración', icon: Settings },
    ];

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 45,
                        backdropFilter: 'blur(2px)'
                    }}
                    className="sidebar-overlay"
                />
            )}

            <aside className={`glass-panel sidebar ${isOpen ? 'open' : ''}`}>
                <div className="logo" style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--border-color)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                            src="/logo.png"
                            alt="Nova"
                            style={{
                                height: '40px',
                                filter: 'drop-shadow(0 0 5px rgba(220, 38, 38, 0.3))'
                            }}
                        />
                        <span style={{ fontWeight: 'bold', letterSpacing: '1px' }}>NOVA</span>
                    </div>


                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="btn btn-ghost mobile-close-btn"
                        style={{ display: 'none', padding: '0.5rem' }}
                    >
                        <X size={24} />
                    </button>
                </div >

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                                style={{
                                    justifyContent: 'flex-start',
                                    width: '100%',
                                    background: isActive ? undefined : 'transparent',
                                    border: isActive ? undefined : 'none',
                                    color: isActive ? 'white' : 'var(--text-secondary)'
                                }}
                            >
                                <Icon size={20} /> {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <button
                        onClick={handleLogout}
                        className="btn btn-secondary"
                        style={{ justifyContent: 'flex-start', width: '100%', color: 'var(--danger)', borderColor: 'transparent' }}
                    >
                        <LogOut size={20} /> Cerrar Sesión
                    </button>
                </div>
            </aside >

            <style>{`
                .sidebar {
                    width: 260px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    height: 100vh;
                    position: sticky;
                    top: 0;
                    transition: transform 0.3s ease;
                    z-index: 50;
                    background: var(--bg-secondary);
                }

                @media (max-width: 768px) {
                    .sidebar {
                        position: fixed;
                        left: 0;
                        transform: translateX(-100%);
                        width: 85%;
                        max-width: 300px;
                        border-right: 1px solid var(--border-color);
                        box-shadow: 4px 0 24px rgba(0,0,0,0.3);
                    }
                    .sidebar.open {
                        transform: translateX(0);
                    }
                    .mobile-close-btn {
                        display: flex !important;
                    }
                }
            `}</style>
        </>
    );
};

export default Sidebar;
