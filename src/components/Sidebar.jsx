import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Package, Settings, LogOut, ClipboardList, ShoppingCart, ArrowRightLeft, X, Building2, Mail, FileSpreadsheet, Scale, ChevronDown, Boxes, RefreshCw, Users, DollarSign, AlertTriangle, Wallet } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';

const Sidebar = ({ activeTab, setActiveTab, isOpen, onClose }) => {
    const { logout, userProfile, canAccessModule } = useAuth();
    const { currentCompany, clearSelection, companies } = useCompany();
    const [unreadCount, setUnreadCount] = useState(0);
    const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
    const [expandedMenus, setExpandedMenus] = useState(['inventoryManagement']);

    // Subscribe to unread mail count
    useEffect(() => {
        if (!currentCompany?.id || !userProfile?.uid) return;

        const mailQuery = query(
            collection(db, 'internalMail'),
            where('companyId', '==', currentCompany.id),
            where('to.uid', '==', userProfile.uid),
            where('read', '==', false)
        );

        const unsubscribe = onSnapshot(mailQuery, (snapshot) => {
            setUnreadCount(snapshot.docs.length);
        });

        return () => unsubscribe();
    }, [currentCompany?.id, userProfile?.uid]);

    // Subscribe to pending payments count
    useEffect(() => {
        if (!currentCompany?.id) return;

        const salesQuery = query(
            collection(db, 'sales'),
            where('companyId', '==', currentCompany.id),
            where('paymentStatus', '==', 'pending_payment')
        );

        const unsubscribe = onSnapshot(salesQuery, (snapshot) => {
            setPendingPaymentsCount(snapshot.docs.length);
        });

        return () => unsubscribe();
    }, [currentCompany?.id]);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        {
            id: 'inventoryManagement',
            label: 'Gestión De Inventarios',
            icon: Boxes,
            submenu: [
                { id: 'inventory', label: 'Productos', icon: Package },
                { id: 'control', label: 'Control de Inventario', icon: ClipboardList }
            ]
        },
        { id: 'purchases', label: 'Compras', icon: ShoppingCart },
        { id: 'pos', label: 'POS', icon: ArrowRightLeft },
        { id: 'cashregister', label: 'Caja', icon: Wallet, badge: pendingPaymentsCount },
        { id: 'receivables', label: 'Cuentas x Cobrar', icon: DollarSign },
        { id: 'clients', label: 'Contactos', icon: Users },
        { id: 'mail', label: 'NovaMail', icon: Mail, badge: unreadCount },
        {
            id: 'informes',
            label: 'Informes',
            icon: FileSpreadsheet,
            submenu: [
                { id: 'reports', label: 'Reportes', icon: FileSpreadsheet },
                { id: 'article177', label: 'Art. 177 ISLR', icon: Scale }
            ]
        },
        { id: 'settings', label: 'Configuración', icon: Settings },
    ];

    const toggleSubmenu = (menuId) => {
        setExpandedMenus(prev =>
            prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
        );
    };

    const isSubmenuExpanded = (menuId) => expandedMenus.includes(menuId);

    // Filter menu items based on permissions
    const filteredMenuItems = menuItems.reduce((acc, item) => {
        // If item has submenu, filter submenu items
        if (item.submenu) {
            const visibleSubmenu = item.submenu.filter(subItem => canAccessModule(subItem.id));
            // Only show parent if it has visible children
            if (visibleSubmenu.length > 0) {
                acc.push({ ...item, submenu: visibleSubmenu });
            }
        }
        // If item is a direct link, check permission
        else if (canAccessModule(item.id)) {
            acc.push(item);
        }
        return acc;
    }, []);

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
                                height: '60px',
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
                </div>

                {/* Current Company */}
                {currentCompany && (
                    <div style={{
                        padding: '0.75rem',
                        background: 'rgba(220, 38, 38, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(220, 38, 38, 0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <Building2 size={14} style={{ color: 'var(--accent-primary)' }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Empresa</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{currentCompany.name}</div>
                        {companies.length > 1 && (
                            <button
                                onClick={clearSelection}
                                className="btn btn-ghost"
                                style={{
                                    marginTop: '0.5rem',
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.7rem',
                                    width: '100%',
                                    justifyContent: 'center',
                                    color: 'var(--text-secondary)'
                                }}
                            >
                                <RefreshCw size={12} /> Cambiar
                            </button>
                        )}
                    </div>
                )}

                {/* Current User */}
                {userProfile && (
                    <div style={{
                        marginTop: '0.25rem',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                        }}>
                            {userProfile.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{
                                fontSize: '0.9rem',
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {userProfile.displayName || 'Usuario'}
                            </div>
                            <div style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-secondary)',
                                textTransform: 'capitalize'
                            }}>
                                {userProfile.role || 'Rol desconocido'}
                            </div>
                        </div>
                    </div>
                )}

                <nav style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    paddingRight: '0.25rem'
                }}>
                    {filteredMenuItems.map((item) => {
                        const Icon = item.icon;

                        // Item with submenu
                        if (item.submenu) {
                            const isExpanded = isSubmenuExpanded(item.id);
                            const hasActiveChild = item.submenu.some(sub => activeTab === sub.id);
                            return (
                                <div key={item.id}>
                                    <button
                                        onClick={() => toggleSubmenu(item.id)}
                                        className={`btn ${hasActiveChild ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{
                                            justifyContent: 'space-between',
                                            width: '100%',
                                            background: hasActiveChild ? 'rgba(220, 38, 38, 0.15)' : 'transparent',
                                            border: 'none',
                                            color: hasActiveChild ? 'var(--accent-primary)' : 'var(--text-secondary)'
                                        }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Icon size={20} /> {item.label}
                                        </span>
                                        <ChevronDown
                                            size={16}
                                            style={{
                                                transition: 'transform 0.2s',
                                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                            }}
                                        />
                                    </button>
                                    {isExpanded && (
                                        <div style={{
                                            marginLeft: '1rem',
                                            paddingLeft: '0.75rem',
                                            borderLeft: '2px solid var(--border-color)',
                                            marginTop: '0.25rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.25rem'
                                        }}>
                                            {item.submenu.map(subItem => {
                                                const SubIcon = subItem.icon;
                                                const isSubActive = activeTab === subItem.id;
                                                return (
                                                    <button
                                                        key={subItem.id}
                                                        onClick={() => setActiveTab(subItem.id)}
                                                        className={`btn ${isSubActive ? 'btn-primary' : 'btn-secondary'}`}
                                                        style={{
                                                            justifyContent: 'flex-start',
                                                            width: '100%',
                                                            background: isSubActive ? undefined : 'transparent',
                                                            border: isSubActive ? undefined : 'none',
                                                            color: isSubActive ? 'white' : 'var(--text-secondary)',
                                                            fontSize: '0.9rem',
                                                            padding: '0.5rem 0.75rem'
                                                        }}
                                                    >
                                                        <SubIcon size={18} /> {subItem.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // Regular menu item
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
                                    color: isActive ? 'white' : 'var(--text-secondary)',
                                    position: 'relative'
                                }}
                            >
                                <Icon size={20} /> {item.label}
                                {item.badge > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        right: '0.75rem',
                                        background: 'var(--danger)',
                                        color: 'white',
                                        padding: '0.125rem 0.5rem',
                                        borderRadius: '999px',
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        minWidth: '1.25rem',
                                        textAlign: 'center'
                                    }}>
                                        {item.badge}
                                    </span>
                                )}
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
            </aside>

            <style>{`
                .sidebar {
                    width: 260px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
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
