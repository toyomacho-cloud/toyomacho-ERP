import React, { useState } from 'react';
import { Shield, X, Save } from 'lucide-react';
import { useAuth, AVAILABLE_MODULES } from '../context/AuthContext';

const UserPermissionsModal = ({ user, onClose, onSave }) => {
    const { updateUserModules } = useAuth();
    const [tempModules, setTempModules] = useState(user.modules || {});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSave = async () => {
        setLoading(true);
        const result = await updateUserModules(user.id, tempModules);
        setLoading(false);

        if (result.success) {
            if (onSave) onSave();
            onClose();
        } else {
            setMessage({ type: 'error', text: 'Error al actualizar permisos' });
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="glass-panel animate-fade-in" style={{
                width: '90%',
                maxWidth: '600px',
                padding: '2rem',
                maxHeight: '80vh',
                overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Shield size={22} /> Permisos de Módulos
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {message && (
                    <div style={{
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
                        border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`
                    }}>
                        {message.text}
                    </div>
                )}

                <div style={{
                    padding: '1rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold'
                    }}>
                        {user.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600 }}>{user.displayName}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                    </div>
                </div>

                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Selecciona los módulos que este usuario puede ver:
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '1.5rem'
                }}>
                    {Object.values(AVAILABLE_MODULES).map(mod => (
                        <label
                            key={mod.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1rem',
                                background: tempModules[mod.id] ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                                border: tempModules[mod.id] ? '1px solid var(--success)' : '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={tempModules[mod.id] || false}
                                onChange={(e) => setTempModules({ ...tempModules, [mod.id]: e.target.checked })}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--success)' }}
                            />
                            <span style={{ fontWeight: tempModules[mod.id] ? 500 : 400 }}>{mod.label}</span>
                        </label>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Save size={16} /> {loading ? 'Guardando...' : 'Guardar Permisos'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserPermissionsModal;
