import React, { useState, useMemo } from 'react';
import {
    DollarSign, Search, Calendar, AlertTriangle, CheckCircle,
    Clock, Filter, FileText, Phone, Mail, X, CreditCard, Banknote,
    TrendingUp, User, Building
} from 'lucide-react';
import { useInventoryContext } from '../context/InventoryContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const AccountsReceivable = () => {
    const { sales, addPayment } = useInventoryContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, overdue, due-soon, on-time
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('efectivo');
    const [paymentNotes, setPaymentNotes] = useState('');

    // Get credit sales only
    const creditSales = useMemo(() => {
        return sales.filter(s => s.paymentType === 'credito' && s.status !== 'paid');
    }, [sales]);

    // Group by customer to avoid duplicates
    const accountsByCustomer = useMemo(() => {
        const grouped = {};
        creditSales.forEach(sale => {
            const customerId = sale.customerId || 'unknown';
            const customerName = sale.customer?.name || 'Cliente Desconocido';

            if (!grouped[customerId]) {
                grouped[customerId] = {
                    customerId,
                    customer: sale.customer,
                    customerName,
                    sales: [],
                    totalAmount: 0,
                    totalPaid: 0,
                    totalRemaining: 0,
                    earliestDue: null
                };
            }
            grouped[customerId].sales.push(sale);
            grouped[customerId].totalAmount += sale.amountUSD || 0;
            grouped[customerId].totalPaid += sale.paidAmount || 0;
            grouped[customerId].totalRemaining += sale.remainingAmount || (sale.amountUSD - (sale.paidAmount || 0));

            // Track earliest due date
            if (sale.dueDate) {
                const dueDate = new Date(sale.dueDate);
                if (!grouped[customerId].earliestDue || dueDate < grouped[customerId].earliestDue) {
                    grouped[customerId].earliestDue = dueDate;
                }
            }
        });
        return Object.values(grouped);
    }, [creditSales]);

    // Calculate status for each account
    const getAccountStatus = (account) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!account.earliestDue) return 'on-time';

        const dueDate = new Date(account.earliestDue);
        dueDate.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'overdue';
        if (diffDays <= 7) return 'due-soon';
        return 'on-time';
    };

    // Filter accounts
    const filteredAccounts = useMemo(() => {
        let filtered = accountsByCustomer;

        // Apply status filter
        if (filter !== 'all') {
            filtered = filtered.filter(acc => getAccountStatus(acc) === filter);
        }

        // Apply search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(acc =>
                acc.customerName.toLowerCase().includes(term) ||
                acc.customer?.rif?.toLowerCase().includes(term)
            );
        }

        // Sort by due date (overdue first)
        filtered.sort((a, b) => {
            const statusA = getAccountStatus(a);
            const statusB = getAccountStatus(b);
            const order = { 'overdue': 0, 'due-soon': 1, 'on-time': 2 };
            return order[statusA] - order[statusB];
        });

        return filtered;
    }, [accountsByCustomer, filter, searchTerm]);

    // Stats
    const stats = useMemo(() => {
        const overdue = accountsByCustomer.filter(a => getAccountStatus(a) === 'overdue');
        const dueSoon = accountsByCustomer.filter(a => getAccountStatus(a) === 'due-soon');
        const onTime = accountsByCustomer.filter(a => getAccountStatus(a) === 'on-time');

        return {
            overdueCount: overdue.length,
            overdueAmount: overdue.reduce((sum, a) => sum + a.totalRemaining, 0),
            dueSoonCount: dueSoon.length,
            dueSoonAmount: dueSoon.reduce((sum, a) => sum + a.totalRemaining, 0),
            onTimeCount: onTime.length,
            onTimeAmount: onTime.reduce((sum, a) => sum + a.totalRemaining, 0),
            totalRemaining: accountsByCustomer.reduce((sum, a) => sum + a.totalRemaining, 0)
        };
    }, [accountsByCustomer]);

    // Handle payment
    const handleRegisterPayment = async () => {
        if (!selectedAccount || !paymentAmount || parseFloat(paymentAmount) <= 0) {
            alert('Por favor ingresa un monto válido');
            return;
        }

        const amount = parseFloat(paymentAmount);

        // For now, we'll update through addPayment function (to be implemented in useInventory)
        // This will update the sale's paidAmount and remainingAmount
        try {
            // Iterate through sales and apply payment
            let remainingPayment = amount;
            for (const sale of selectedAccount.sales) {
                if (remainingPayment <= 0) break;

                const saleRemaining = sale.remainingAmount || (sale.amountUSD - (sale.paidAmount || 0));
                const payThisSale = Math.min(remainingPayment, saleRemaining);

                if (payThisSale > 0) {
                    await addPayment({
                        saleId: sale.id,
                        customerId: selectedAccount.customerId,
                        amount: payThisSale,
                        paymentMethod,
                        notes: paymentNotes
                    });
                    remainingPayment -= payThisSale;
                }
            }

            alert(`Pago de $${amount.toFixed(2)} registrado exitosamente`);
            setShowPaymentModal(false);
            setSelectedAccount(null);
            setPaymentAmount('');
            setPaymentNotes('');
        } catch (error) {
            console.error('Error registering payment:', error);
            alert('Error al registrar el pago. Por favor intenta de nuevo.');
        }
    };

    // Get days text
    const getDaysText = (dueDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return `Vencida hace ${Math.abs(diffDays)} días`;
        if (diffDays === 0) return 'Vence hoy';
        if (diffDays === 1) return 'Vence mañana';
        return `Vence en ${diffDays} días`;
    };

    const statusColors = {
        'overdue': { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444', icon: AlertTriangle },
        'due-soon': { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b', icon: Clock },
        'on-time': { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981', icon: CheckCircle }
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                    }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Cuentas por Cobrar</h1>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                            Gestiona las deudas pendientes de tus clientes
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div
                    onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')}
                    className="glass-panel"
                    style={{
                        padding: '1rem',
                        cursor: 'pointer',
                        border: filter === 'overdue' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                        transition: 'all 0.2s'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', marginBottom: '0.5rem' }}>
                        <AlertTriangle size={18} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Vencidas</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.overdueCount}</div>
                    <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>${stats.overdueAmount.toFixed(2)}</div>
                </div>

                <div
                    onClick={() => setFilter(filter === 'due-soon' ? 'all' : 'due-soon')}
                    className="glass-panel"
                    style={{
                        padding: '1rem',
                        cursor: 'pointer',
                        border: filter === 'due-soon' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                        transition: 'all 0.2s'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', marginBottom: '0.5rem' }}>
                        <Clock size={18} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Por Vencer (7d)</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.dueSoonCount}</div>
                    <div style={{ fontSize: '0.85rem', color: '#f59e0b' }}>${stats.dueSoonAmount.toFixed(2)}</div>
                </div>

                <div
                    onClick={() => setFilter(filter === 'on-time' ? 'all' : 'on-time')}
                    className="glass-panel"
                    style={{
                        padding: '1rem',
                        cursor: 'pointer',
                        border: filter === 'on-time' ? '2px solid #10b981' : '1px solid var(--border-color)',
                        transition: 'all 0.2s'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', marginBottom: '0.5rem' }}>
                        <CheckCircle size={18} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Al Día</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.onTimeCount}</div>
                    <div style={{ fontSize: '0.85rem', color: '#10b981' }}>${stats.onTimeAmount.toFixed(2)}</div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', marginBottom: '0.5rem' }}>
                        <TrendingUp size={18} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Pendiente</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                        ${stats.totalRemaining.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                <div className="input-group" style={{ maxWidth: '400px' }}>
                    <Search className="input-icon" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por cliente o RIF..."
                        style={{ width: '100%' }}
                    />
                </div>
            </div>

            {/* Accounts List */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                {filteredAccounts.length > 0 ? (
                    filteredAccounts.map(account => {
                        const status = getAccountStatus(account);
                        const statusStyle = statusColors[status];
                        const StatusIcon = statusStyle.icon;

                        return (
                            <div
                                key={account.customerId}
                                style={{
                                    padding: '1.25rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    background: statusStyle.bg
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                                    {/* Customer Info */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                        <div style={{
                                            width: '48px', height: '48px', borderRadius: '50%',
                                            background: statusStyle.bg,
                                            border: `2px solid ${statusStyle.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: statusStyle.text
                                        }}>
                                            <StatusIcon size={24} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{account.customerName}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                {account.customer?.type || 'V'}-{account.customer?.rif || 'S/I'}
                                                {account.customer?.phone && ` • ${account.customer.phone}`}
                                            </div>
                                            {account.earliestDue && (
                                                <div style={{ fontSize: '0.8rem', color: statusStyle.text, marginTop: '0.25rem' }}>
                                                    {getDaysText(account.earliestDue)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Amount Info */}
                                    <div style={{ textAlign: 'right', minWidth: '150px' }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: statusStyle.text }}>
                                            ${account.totalRemaining.toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            de ${account.totalAmount.toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {account.sales.length} {account.sales.length === 1 ? 'documento' : 'documentos'}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => {
                                            setSelectedAccount(account);
                                            setPaymentAmount(account.totalRemaining.toFixed(2));
                                            setShowPaymentModal(true);
                                        }}
                                        className="btn btn-primary"
                                        style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                                    >
                                        <DollarSign size={14} /> Registrar Pago
                                    </button>
                                    {account.customer?.phone && (
                                        <a
                                            href={`https://wa.me/58${account.customer.phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-secondary"
                                            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                                        >
                                            <Phone size={14} /> WhatsApp
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <DollarSign size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p>No hay cuentas por cobrar {filter !== 'all' ? 'con este filtro' : ''}</p>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedAccount && (
                <>
                    <div
                        onClick={() => setShowPaymentModal(false)}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(2px)'
                        }}
                    />
                    <div style={{
                        position: 'fixed',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '2rem',
                        zIndex: 101,
                        width: '90%',
                        maxWidth: '450px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Registrar Pago</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Customer Info */}
                        <div style={{
                            padding: '1rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{ fontWeight: 600 }}>{selectedAccount.customerName}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Pendiente: <strong style={{ color: 'var(--accent-primary)' }}>${selectedAccount.totalRemaining.toFixed(2)}</strong>
                            </div>
                        </div>

                        {/* Payment Amount */}
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label>Monto a Pagar (USD)</label>
                            <input
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min="0.01"
                                max={selectedAccount.totalRemaining}
                                style={{ fontSize: '1.25rem', fontWeight: 'bold' }}
                            />
                        </div>

                        {/* Payment Method */}
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label>Método de Pago</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {[
                                    { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                                    { id: 'transferencia', label: 'Transferencia', icon: CreditCard },
                                    { id: 'punto', label: 'Punto', icon: CreditCard }
                                ].map(method => (
                                    <button
                                        key={method.id}
                                        onClick={() => setPaymentMethod(method.id)}
                                        className={`btn ${paymentMethod === method.id ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ flex: 1, flexDirection: 'column', padding: '0.75rem', gap: '0.25rem' }}
                                    >
                                        <method.icon size={18} />
                                        <span style={{ fontSize: '0.75rem' }}>{method.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label>Nota (opcional)</label>
                            <input
                                type="text"
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                placeholder="Ej: Abono parcial, referencia..."
                            />
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setShowPaymentModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                                Cancelar
                            </button>
                            <button onClick={handleRegisterPayment} className="btn btn-primary" style={{ flex: 1 }}>
                                <CheckCircle size={18} /> Confirmar Pago
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AccountsReceivable;
