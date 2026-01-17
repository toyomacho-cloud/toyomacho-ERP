import React, { useState } from 'react';
import { Building2, Check, LogOut, Plus, Loader2 } from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';

const CompanySelector = () => {
    const { companies, selectCompany, createCompany, loading } = useCompany();
    const { logout, currentUser, isAdmin } = useAuth();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyRif, setNewCompanyRif] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const handleCreateCompany = async (e) => {
        e.preventDefault();
        if (!newCompanyName.trim()) {
            setError('El nombre de la empresa es requerido');
            return;
        }
        setCreating(true);
        setError('');
        try {
            await createCompany(newCompanyName.trim(), newCompanyRif.trim());
            // Company will be auto-selected after creation
        } catch (err) {
            setError(err.message || 'Error al crear la empresa');
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)'
            }}>
                <p style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
            padding: '1rem'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '450px',
                padding: '2rem',
                borderRadius: 'var(--radius-lg)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <Building2 size={40} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
                    <h2 style={{ margin: 0 }}>Seleccionar Empresa</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.5rem 0 0' }}>
                        {currentUser?.email}
                    </p>
                </div>

                {/* Company List */}
                {companies.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                        {companies.map(company => (
                            <div
                                key={company.id}
                                onClick={() => selectCompany(company)}
                                className="glass-panel"
                                style={{
                                    padding: '1rem',
                                    marginBottom: '0.5rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    border: '1px solid transparent',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                                onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                            >
                                <Building2 size={24} style={{ color: 'var(--accent-primary)' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{company.name}</div>
                                    {company.rif && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>RIF: {company.rif}</div>}
                                </div>
                                <Check size={18} style={{ color: 'var(--success)', opacity: 0.5 }} />
                            </div>
                        ))}
                    </div>
                )}

                {/* No companies message or create form */}
                {companies.length === 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                        {isAdmin() ? (
                            <>
                                {!showCreateForm ? (
                                    <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                            No tienes empresas asignadas. Crea tu primera empresa para comenzar.
                                        </p>
                                        <button
                                            onClick={() => setShowCreateForm(true)}
                                            className="btn btn-primary"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                                        >
                                            <Plus size={18} /> Crear Empresa
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleCreateCompany} className="glass-panel" style={{ padding: '1.5rem' }}>
                                        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Nueva Empresa</h3>

                                        {error && (
                                            <div style={{
                                                padding: '0.75rem',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                borderRadius: 'var(--radius-md)',
                                                marginBottom: '1rem',
                                                color: 'var(--danger)',
                                                fontSize: '0.875rem'
                                            }}>
                                                {error}
                                            </div>
                                        )}

                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                Nombre de la Empresa *
                                            </label>
                                            <input
                                                type="text"
                                                value={newCompanyName}
                                                onChange={(e) => setNewCompanyName(e.target.value)}
                                                placeholder="Ej: Mi Empresa C.A."
                                                disabled={creating}
                                                autoFocus
                                            />
                                        </div>

                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                RIF (opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={newCompanyRif}
                                                onChange={(e) => setNewCompanyRif(e.target.value)}
                                                placeholder="Ej: J-12345678-9"
                                                disabled={creating}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowCreateForm(false);
                                                    setError('');
                                                    setNewCompanyName('');
                                                    setNewCompanyRif('');
                                                }}
                                                className="btn btn-secondary"
                                                style={{ flex: 1 }}
                                                disabled={creating}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                                disabled={creating}
                                            >
                                                {creating ? (
                                                    <>
                                                        <Loader2 size={18} className="spin" /> Creando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={18} /> Crear
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                                <p>No tienes acceso a ninguna empresa. Contacta al administrador para que te asigne a una empresa.</p>
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={logout}
                    className="btn btn-secondary"
                    style={{ width: '100%' }}
                >
                    <LogOut size={18} /> Cerrar Sesión
                </button>
            </div>
        </div>
    );
};

export default CompanySelector;
