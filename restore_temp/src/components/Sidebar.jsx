import React from 'react';
import { LayoutDashboard, Package, Settings, LogOut, ClipboardList, ShoppingCart, Hash, ArrowRightLeft } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'inventory', label: 'Productos', icon: Package },
        { id: 'control', label: 'Control de Inventario', icon: ClipboardList },
        { id: 'purchases', label: 'Compras', icon: ShoppingCart },
        { id: 'sales', label: 'Ventas / Egresos', icon: ArrowRightLeft },
        { id: 'sku-generator', label: 'Generador SKU', icon: Hash },
        { id: 'settings', label: 'Configuración', icon: Settings },
    ];

    return (
        <aside className="glass-panel" style={{
            width: '260px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            height: '100vh',
            position: 'sticky',
            top: 0
        }}>
            <div className="logo" style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex'
                }}>
                    <Package size={24} color="var(--accent-primary)" />
                </div>
                <span>NovaInv</span>
            </div>

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
                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', width: '100%', color: 'var(--danger)', borderColor: 'transparent' }}>
                    <LogOut size={20} /> Logout
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
