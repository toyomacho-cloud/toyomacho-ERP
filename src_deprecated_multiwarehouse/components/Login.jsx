import React, { useState } from 'react';
import { LogIn, UserPlus, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth, ROLES } from '../context/AuthContext';

const Login = () => {
    const { login, register, error } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        displayName: '',
        confirmPassword: ''
    });
    const [localError, setLocalError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setLoading(true);

        if (isRegister) {
            if (formData.password !== formData.confirmPassword) {
                setLocalError('Las contraseñas no coinciden');
                setLoading(false);
                return;
            }
            if (formData.password.length < 6) {
                setLocalError('La contraseña debe tener al menos 6 caracteres');
                setLoading(false);
                return;
            }
            // First user registers as admin
            const result = await register(
                formData.email,
                formData.password,
                formData.displayName,
                ROLES.ADMIN  // First user is admin
            );
            if (!result.success) {
                setLocalError(result.error);
            }
        } else {
            const result = await login(formData.email, formData.password);
            if (!result.success) {
                setLocalError(result.error);
            }
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
            padding: '1rem'
        }}>
            <div className="glass-panel animate-fade-in" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '2.5rem',
                borderRadius: 'var(--radius-lg)'
            }}>
                {/* Logo */}
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <img
                        src="/logo.png"
                        alt="Dynamic Nova"
                        style={{
                            height: '100px',
                            marginBottom: '1rem',
                            filter: 'drop-shadow(0 0 10px rgba(220, 38, 38, 0.3))'
                        }}
                    />
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                        By TOYOMACHO
                    </p>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    marginBottom: '2rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.25rem'
                }}>
                    <button
                        onClick={() => setIsRegister(false)}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            background: !isRegister ? 'var(--accent-primary)' : 'transparent',
                            color: !isRegister ? 'white' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        <LogIn size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        Iniciar Sesión
                    </button>
                    <button
                        onClick={() => setIsRegister(true)}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            background: isRegister ? 'var(--accent-primary)' : 'transparent',
                            color: isRegister ? 'white' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        <UserPlus size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        Registrarse
                    </button>
                </div>

                {/* Error Message */}
                {(localError || error) && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--danger)'
                    }}>
                        <AlertCircle size={18} />
                        {localError || error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {isRegister && (
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Nombre Completo
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input
                                    type="text"
                                    required
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    placeholder="Tu nombre"
                                    style={{ paddingLeft: '3rem' }}
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Correo Electrónico
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="correo@ejemplo.com"
                                style={{ paddingLeft: '3rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Contraseña
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                                style={{ paddingLeft: '3rem' }}
                            />
                        </div>
                    </div>

                    {isRegister && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Confirmar Contraseña
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input
                                    type="password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="••••••••"
                                    style={{ paddingLeft: '3rem' }}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            fontSize: '1rem',
                            fontWeight: 600
                        }}
                    >
                        {loading ? 'Cargando...' : (isRegister ? 'Crear Cuenta' : 'Iniciar Sesión')}
                    </button>
                </form>

                {isRegister && (
                    <p style={{
                        marginTop: '1.5rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-tertiary)',
                        textAlign: 'center'
                    }}>
                        ℹ️ El primer usuario registrado será Administrador
                    </p>
                )}
            </div>
        </div>
    );
};

export default Login;
