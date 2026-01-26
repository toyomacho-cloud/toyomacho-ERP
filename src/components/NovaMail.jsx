import React, { useState, useEffect } from 'react';
import { Mail, Send, Inbox, PlusCircle, Paperclip, Download, ArrowLeft, Clock, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';
import { useInternalMail } from '../hooks/useInternalMail';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';

const NovaMail = () => {
    const { inbox, sent, loading, unreadCount, sendMessage, markAsRead, deleteMessage } = useInternalMail();
    const { userProfile } = useAuth();
    const { currentCompany } = useCompany();
    const [activeFolder, setActiveFolder] = useState('inbox');
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [showCompose, setShowCompose] = useState(false);
    const [companyUsers, setCompanyUsers] = useState([]);

    // Compose form state
    const [composeTo, setComposeTo] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [composeAttachments, setComposeAttachments] = useState([]);
    const [sending, setSending] = useState(false);

    const messages = activeFolder === 'inbox' ? inbox : sent;

    // Fetch users from the current company
    useEffect(() => {
        const fetchCompanyUsers = async () => {
            if (!currentCompany?.id) return;

            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*');

                if (error) throw error;

                const usersList = data || [];
                setCompanyUsers(usersList);
            } catch (error) {
                console.error('Error fetching company users:', error);
            }
        };

        fetchCompanyUsers();
    }, [currentCompany?.id]);

    // Get available users (exclude current user)
    const availableUsers = companyUsers.filter(u => u.uid !== userProfile?.uid) || [];

    const handleSelectMessage = async (message) => {
        setSelectedMessage(message);
        if (activeFolder === 'inbox' && !message.read) {
            await markAsRead(message.id);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!composeTo || !composeSubject || !composeBody) {
            alert('Por favor completa todos los campos');
            return;
        }

        const recipient = availableUsers.find(u => u.uid === composeTo);
        if (!recipient) {
            alert('Destinatario no válido');
            return;
        }

        setSending(true);
        try {
            await sendMessage({
                to: recipient,
                subject: composeSubject,
                body: composeBody,
                attachments: composeAttachments
            });

            // Reset form
            setComposeTo('');
            setComposeSubject('');
            setComposeBody('');
            setComposeAttachments([]);
            setShowCompose(false);
            alert('✅ Mensaje enviado correctamente');
        } catch (error) {
            alert('❌ Error al enviar: ' + error.message);
        }
        setSending(false);
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setComposeAttachments([...composeAttachments, ...files]);
    };

    const removeAttachment = (index) => {
        setComposeAttachments(composeAttachments.filter((_, i) => i !== index));
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('es-VE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDelete = async () => {
        if (!selectedMessage) return;

        if (window.confirm('¿Estás seguro de que deseas eliminar este mensaje?')) {
            try {
                // Determine if we are deleting from inbox (received) or sent
                const type = activeFolder === 'inbox' ? 'received' : 'sent';
                await deleteMessage(selectedMessage.id, type);
                setSelectedMessage(null);
            } catch (error) {
                console.error('Error deleting message:', error);
                alert('Error al eliminar el mensaje');
            }
        }
    };

    if (loading) {
        return (
            <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <Mail size={48} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
                    <p>Cargando mensajes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Mail size={28} /> NovaMail
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Sistema de correo interno</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCompose(true)}>
                    <PlusCircle size={20} /> Redactar
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '1.5rem', minHeight: '60vh' }}>
                {/* Sidebar - Folders */}
                <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                    <div
                        onClick={() => { setActiveFolder('inbox'); setSelectedMessage(null); }}
                        style={{
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: activeFolder === 'inbox' ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                            color: activeFolder === 'inbox' ? 'var(--accent-primary)' : 'var(--text-primary)',
                            marginBottom: '0.5rem'
                        }}
                    >
                        <Inbox size={18} />
                        <span style={{ flex: 1 }}>Bandeja de entrada</span>
                        {unreadCount > 0 && (
                            <span style={{
                                background: 'var(--accent-primary)',
                                color: 'white',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <div
                        onClick={() => { setActiveFolder('sent'); setSelectedMessage(null); }}
                        style={{
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: activeFolder === 'sent' ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                            color: activeFolder === 'sent' ? 'var(--accent-primary)' : 'var(--text-primary)'
                        }}
                    >
                        <Send size={18} />
                        <span>Enviados</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                    {selectedMessage ? (
                        // Message Detail View
                        <div>
                            <button
                                onClick={() => setSelectedMessage(null)}
                                className="btn btn-secondary"
                                style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <ArrowLeft size={16} /> Volver
                            </button>

                            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                <h2 style={{ marginBottom: '0.5rem' }}>{selectedMessage.subject}</h2>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    <p><strong>De:</strong> {selectedMessage.from?.name} ({selectedMessage.from?.email})</p>
                                    <p><strong>Para:</strong> {selectedMessage.to?.name} ({selectedMessage.to?.email})</p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Clock size={14} /> {formatDate(selectedMessage.timestamp)}
                                    </p>
                                </div>
                            </div>

                            <div style={{ whiteSpace: 'pre-wrap', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                {selectedMessage.body}
                            </div>

                            {selectedMessage.attachments?.length > 0 && (
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <Paperclip size={16} /> Adjuntos ({selectedMessage.attachments.length})
                                    </h4>
                                    {selectedMessage.attachments.map((att, i) => (
                                        <a
                                            key={i}
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.5rem 1rem',
                                                background: 'rgba(var(--primary-rgb), 0.1)',
                                                borderRadius: 'var(--radius-md)',
                                                marginRight: '0.5rem',
                                                marginBottom: '0.5rem',
                                                color: 'var(--accent-primary)',
                                                textDecoration: 'none'
                                            }}
                                        >
                                            <Download size={14} />
                                            {att.name} ({att.size})
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* Delete Button - Bottom */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <button
                                    onClick={handleDelete}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(220, 38, 38, 0.1)',
                                        color: '#ef4444',
                                        border: '1px solid rgba(220, 38, 38, 0.2)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontWeight: '500'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(220, 38, 38, 0.2)';
                                        e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
                                        e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.2)';
                                    }}
                                >
                                    <Trash2 size={16} /> Eliminar
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Message List View
                        <div>
                            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>
                                {activeFolder === 'inbox' ? 'Bandeja de entrada' : 'Mensajes enviados'}
                            </h3>

                            {messages.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    <Mail size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                    <p>No hay mensajes</p>
                                </div>
                            ) : (
                                <div>
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            onClick={() => handleSelectMessage(msg)}
                                            style={{
                                                padding: '1rem',
                                                borderBottom: '1px solid var(--border-color)',
                                                cursor: 'pointer',
                                                background: !msg.read && activeFolder === 'inbox' ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = !msg.read && activeFolder === 'inbox' ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent'}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        fontWeight: !msg.read && activeFolder === 'inbox' ? 'bold' : 'normal',
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        {activeFolder === 'inbox' ? msg.from?.name : msg.to?.name}
                                                    </div>
                                                    <div style={{
                                                        fontWeight: !msg.read && activeFolder === 'inbox' ? '600' : 'normal',
                                                        color: 'var(--text-primary)'
                                                    }}>
                                                        {msg.subject}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.875rem',
                                                        color: 'var(--text-secondary)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        maxWidth: '400px'
                                                    }}>
                                                        {msg.body}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                    {formatDate(msg.timestamp)}
                                                    {msg.attachments?.length > 0 && (
                                                        <Paperclip size={12} style={{ marginLeft: '0.5rem' }} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Compose Modal */}
            {showCompose && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50
                }}>
                    <div className="glass-panel animate-fade-in" style={{
                        width: '100%',
                        maxWidth: '600px',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Mail size={24} /> Nuevo Mensaje
                        </h2>

                        <form onSubmit={handleSendMessage}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Para:</label>
                                <select
                                    value={composeTo}
                                    onChange={(e) => setComposeTo(e.target.value)}
                                    required
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Seleccionar destinatario...</option>
                                    {availableUsers.map(user => (
                                        <option key={user.uid} value={user.uid}>
                                            {user.displayName || user.email} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Asunto:</label>
                                <input
                                    type="text"
                                    value={composeSubject}
                                    onChange={(e) => setComposeSubject(e.target.value)}
                                    placeholder="Asunto del mensaje"
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Mensaje:</label>
                                <textarea
                                    value={composeBody}
                                    onChange={(e) => setComposeBody(e.target.value)}
                                    placeholder="Escribe tu mensaje aquí..."
                                    required
                                    rows={8}
                                    style={{ width: '100%', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                    <Paperclip size={14} style={{ marginRight: '0.25rem' }} />
                                    Adjuntos:
                                </label>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    style={{ marginBottom: '0.5rem' }}
                                />
                                {composeAttachments.length > 0 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        {composeAttachments.map((file, i) => (
                                            <div key={i} style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.25rem 0.75rem',
                                                background: 'rgba(var(--primary-rgb), 0.1)',
                                                borderRadius: 'var(--radius-sm)',
                                                marginRight: '0.5rem',
                                                marginBottom: '0.5rem',
                                                fontSize: '0.875rem'
                                            }}>
                                                {file.name}
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttachment(i)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--danger)',
                                                        cursor: 'pointer',
                                                        padding: '0'
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowCompose(false)}
                                    style={{ flex: 1 }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={sending}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    <Send size={18} />
                                    {sending ? 'Enviando...' : 'Enviar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NovaMail;
