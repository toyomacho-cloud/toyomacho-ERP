import React, { useState } from 'react';
import { X, User, Mail, Shield, Key, Save, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const UserAccountModal = ({ onClose }) => {
    const { currentUser, userProfile, changePassword } = useAuth();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const getRoleLabel = (role) => {
        switch (role) {
            case 'admin': return 'Administrador';
            case 'vendedor': return 'Vendedor';
            case 'almacenista': return 'Almacenista';
            default: return role || 'Sin rol';
        }
    };

    const handleChangePassword = async () => {
        setError('');
        setSuccess(false);

        if (!newPassword || newPassword.length < 6) {
            setError('La contrasena debe tener al menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Las contrasenas no coinciden.');
            return;
        }

        setLoading(true);
        const result = await changePassword(newPassword);
        if (result.success) {
            setSuccess(true);
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    const displayName = userProfile?.display_name || userProfile?.displayName || currentUser?.displayName || 'Usuario';
    const email = currentUser?.email || '';
    const role = userProfile?.role || '';

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--bg-card, #1e293b)',
                    borderRadius: '16px',
                    width: '100%', maxWidth: '440px',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={20} /> Mi Cuenta
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    {/* Profile Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 700, fontSize: '1.1rem'
                            }}>
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{displayName}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Mail size={12} /> {email}
                                </div>
                            </div>
                        </div>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                            background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', alignSelf: 'flex-start'
                        }}>
                            <Shield size={12} /> {getRoleLabel(role)}
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: '1px solid var(--border-color)', marginBottom: '1.25rem' }} />

                    {/* Change Password */}
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Key size={16} /> Cambiar Contrasena
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
                                Nueva contrasena
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Minimo 6 caracteres"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
                                Confirmar contrasena
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repetir contrasena"
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            marginTop: '0.75rem', padding: '0.5rem 0.75rem',
                            background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px',
                            color: '#dc2626', fontSize: '0.85rem'
                        }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div style={{
                            marginTop: '0.75rem', padding: '0.5rem 0.75rem',
                            background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px',
                            color: '#059669', fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', gap: '0.3rem'
                        }}>
                            <Check size={14} /> Contrasena cambiada exitosamente.
                        </div>
                    )}

                    <button
                        onClick={handleChangePassword}
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ marginTop: '1rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <Save size={16} />
                        {loading ? 'Cambiando...' : 'Cambiar Contrasena'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserAccountModal;
