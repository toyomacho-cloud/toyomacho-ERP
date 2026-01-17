import React, { useState, useMemo } from 'react';
import {
    Users, Search, Plus, Edit, Trash2, History, ArrowLeft,
    Smartphone, MapPin, Building, User, FileText, DollarSign, Calendar
} from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const Clients = () => {
    const { customers, sales, addCustomer, updateCustomer, deleteCustomer } = useInventoryContext();
    const [view, setView] = useState('list'); // list, form, history
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        rif: '',
        phone: '',
        address: '',
        type: 'V'
    });
    const [error, setError] = useState('');

    // Filtered clients
    const filteredClients = useMemo(() => {
        if (!searchTerm) return customers;
        const term = searchTerm.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(term) ||
            c.rif?.toLowerCase().includes(term) ||
            c.phone?.includes(term)
        );
    }, [customers, searchTerm]);

    // Client History
    const clientHistory = useMemo(() => {
        if (!selectedClient) return [];
        return sales.filter(s => s.customer?.id === selectedClient.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [sales, selectedClient]);

    const handleEdit = (client) => {
        setSelectedClient(client);
        setFormData({
            name: client.name,
            rif: client.rif || '',
            phone: client.phone || '',
            address: client.address || '',
            type: client.type || 'V'
        });
        setView('form');
        setError('');
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
            await deleteCustomer(id);
        }
    };

    const handleViewHistory = (client) => {
        setSelectedClient(client);
        setView('history');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim()) {
            setError('El nombre es obligatorio');
            return;
        }

        try {
            if (selectedClient && view === 'form') {
                await updateCustomer(selectedClient.id, formData);
            } else {
                await addCustomer(formData);
            }
            setView('list');
            setSelectedClient(null);
            setFormData({ name: '', rif: '', phone: '', address: '', type: 'V' });
        } catch (err) {
            console.error(err);
            setError('Error al guardar el cliente');
        }
    };

    const exportHistoryPDF = () => {
        if (!selectedClient) return;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text(`Historial de Compras`, 14, 20);
        doc.setFontSize(12);
        doc.text(`Cliente: ${selectedClient.name}`, 14, 30);
        doc.text(`RIF/CI: ${selectedClient.rif || 'N/A'}`, 14, 36);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 42);

        // Stats
        const totalSpent = clientHistory.reduce((acc, curr) => acc + (curr.amountUSD || 0), 0);
        const totalTx = clientHistory.length;

        doc.text(`Total Comprado: $${totalSpent.toFixed(2)}`, 14, 52);
        doc.text(`Transacciones: ${totalTx}`, 80, 52);

        // Table
        const tableColumn = ["Fecha", "Documento", "Descripción", "Monto USD", "Monto Bs"];
        const tableRows = clientHistory.map(sale => [
            new Date(sale.date).toLocaleDateString(),
            `${sale.documentType?.toUpperCase() || 'NOTA'}`,
            sale.description || 'Venta General',
            `$${(sale.amountUSD || 0).toFixed(2)}`,
            `Bs ${(sale.amountBs || 0).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: 60,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [66, 66, 66] }
        });

        doc.save(`historial_${selectedClient.name.replace(/\s+/g, '_')}.pdf`);
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                    }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                            {view === 'list' ? 'Gestión de Clientes' :
                                view === 'form' ? (selectedClient ? 'Editar Cliente' : 'Nuevo Cliente') :
                                    `Historial: ${selectedClient?.name}`}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                            {view === 'list' ? 'Administra tu base de datos de clientes' :
                                view === 'history' ? 'Registro de compras y movimientos' :
                                    'Información del contacto'}
                        </p>
                    </div>
                </div>

                {view === 'list' ? (
                    <button onClick={() => { setSelectedClient(null); setView('form'); }} className="btn btn-primary">
                        <Plus size={18} /> Nuevo Cliente
                    </button>
                ) : (
                    <button onClick={() => setView('list')} className="btn btn-secondary">
                        <ArrowLeft size={18} /> Volver
                    </button>
                )}
            </div>

            {/* ERROR ALERT */}
            {error && (
                <div style={{
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--danger)',
                    color: 'var(--danger)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem'
                }}>
                    {error}
                </div>
            )}

            {/* SEARCH BAR (List View Only) */}
            {view === 'list' && (
                <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                    <div className="input-group" style={{ flex: 1 }}>
                        <Search className="input-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, RIF o teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
            )}

            {/* LIST VIEW */}
            {view === 'list' && (
                <div className="glass-panel" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Cliente</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Identificación</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Contacto</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Dirección</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.length > 0 ? (
                                filteredClients.map(client => (
                                    <tr key={client.id} className="table-row">
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                    background: 'var(--bg-secondary)', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    color: 'var(--text-secondary)', fontWeight: 'bold'
                                                }}>
                                                    {client.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 500 }}>{client.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                            {client.type}-{client.rif || 'N/A'}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                                <Smartphone size={14} />
                                                <span>{client.phone || '-'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <MapPin size={14} />
                                                <span style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {client.address || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button onClick={() => handleViewHistory(client)} className="btn btn-ghost" title="Ver Historial">
                                                    <History size={18} style={{ color: 'var(--accent-primary)' }} />
                                                </button>
                                                <button onClick={() => handleEdit(client)} className="btn btn-ghost" title="Editar">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(client.id)} className="btn btn-ghost" title="Eliminar">
                                                    <Trash2 size={18} style={{ color: 'var(--danger)' }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                        <p>No se encontraron clientes</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* FORM VIEW */}
            {view === 'form' && (
                <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        <div className="form-group">
                            <label>Nombre Completo / Razón Social *</label>
                            <div className="input-group">
                                <User className="input-icon" size={18} />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej. Juan Pérez"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Tipo</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
                                >
                                    <option value="V">V - Natural</option>
                                    <option value="J">J - Jurídico</option>
                                    <option value="E">E - Extranjero</option>
                                    <option value="G">G - Guber.</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Cédula / RIF</label>
                                <div className="input-group">
                                    <FileText className="input-icon" size={18} />
                                    <input
                                        type="text"
                                        value={formData.rif}
                                        onChange={e => setFormData({ ...formData, rif: e.target.value })}
                                        placeholder="Ej. 12345678"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Teléfono</label>
                            <div className="input-group">
                                <Smartphone className="input-icon" size={18} />
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="Ej. 0412-1234567"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Dirección Fiscal</label>
                            <div className="input-group">
                                <MapPin className="input-icon" size={18} />
                                <textarea
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Dirección completa..."
                                    rows="3"
                                    style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', background: 'transparent', border: 'none', resize: 'vertical' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="button" onClick={() => setView('list')} className="btn btn-secondary" style={{ flex: 1 }}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                {selectedClient ? 'Actualizar Cliente' : 'Guardar Cliente'}
                            </button>
                        </div>

                    </form>
                </div>
            )}

            {/* HISTORY VIEW */}
            {view === 'history' && selectedClient && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Gastado</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                    ${clientHistory.reduce((acc, curr) => acc + (curr.amountUSD || 0), 0).toFixed(2)}
                                </div>
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                                <History size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Transacciones</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                    {clientHistory.length}
                                </div>
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                                <Calendar size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Última Compra</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                                    {clientHistory.length > 0 ? new Date(clientHistory[0].date).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel">
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Detalle de Operaciones</h3>
                            <button onClick={exportHistoryPDF} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                                <FileText size={14} style={{ marginRight: '0.5rem' }} /> Exportar PDF
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Fecha</th>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Tipo</th>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Descripción</th>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Método</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Monto USD</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Monto Bs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientHistory.map(sale => (
                                        <tr key={sale.id} className="table-row">
                                            <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                                                {new Date(sale.date).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '99px',
                                                    fontSize: '0.75rem',
                                                    background: sale.documentType === 'factura' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                    color: sale.documentType === 'factura' ? '#10B981' : '#3B82F6',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {sale.documentType || 'Pedido'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                                {sale.description}
                                            </td>
                                            <td style={{ padding: '1rem', textTransform: 'capitalize' }}>
                                                {sale.paymentType}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                                                ${(sale.amountUSD || 0).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                                Bs {(sale.amountBs || 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {clientHistory.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                No hay historial de compras registrado
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;
