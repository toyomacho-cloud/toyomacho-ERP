import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

const Layout = ({ children, activeTab, setActiveTab }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="app-container" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative' }}>
            {/* Mobile Menu Button */}
            <button
                className="btn btn-secondary mobile-menu-btn"
                onClick={() => setIsMobileMenuOpen(true)}
                style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '1rem',
                    zIndex: 40,
                    padding: '0.5rem',
                    display: 'none', // Hidden by default, shown in media query
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                }}
            >
                <Menu size={24} />
            </button>

            <Sidebar
                activeTab={activeTab}
                setActiveTab={(tab) => {
                    setActiveTab(tab);
                    setIsMobileMenuOpen(false); // Close on selection
                }}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', width: '100%' }}>
                <div className="main-content" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    {children}
                </div>
            </main>

            <style>{`
                @media (max-width: 768px) {
                    .mobile-menu-btn {
                        display: flex !important;
                    }
                    main {
                        padding: 1rem !important;
                        padding-top: 5rem !important; /* Space for menu button */
                    }
                }
            `}</style>
        </div>
    );
};

export default Layout;
