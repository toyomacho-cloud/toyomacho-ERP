/**
 * Modulo de Traslado Salida de Mercancia
 * Diseño: Nova Pro Theme (Soft Grey & Muted Blue)
 * 
 * Almacenamiento: Supabase tabla stock_transfers
 * Stock: Supabase tabla products via useInventory hook
 * Kardex: Supabase tabla movements con tipo TRASLADO_SALIDA
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Truck, Plus, Search, ArrowRight, FileText, Download,
    CheckCircle, XCircle, Clock, Eye, X, AlertTriangle, Minus,
    Package, MapPin, User, Calendar, Hash, ChevronRight, RefreshCw
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../hooks/useInventorySupabase';
import { supabase } from '../supabase';
import { generarOrdenDespacho } from '../utils/transferPdfGenerator';

// ========== CONSTANTES ==========
const TABLE_NAME = 'stock_transfers';

const SUCURSALES = [
    'Tienda San Felix (Principal)',
    'Toyomacho Unare',
    'Toyomacho El Tigre',
    'Toyomacho Pto. Ordaz',
    'Toyomacho Lecherias'
];

const ESTADOS = {
    EN_TRANSITO: 'en_transito',
    COMPLETADO: 'completado',
    CANCELADO: 'cancelado'
};

const ESTADO_CONFIG = {
    en_transito: { label: 'En Transito', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', icon: Clock },
    completado: { label: 'Completado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', icon: CheckCircle },
    cancelado: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', icon: XCircle }
};

const generateTransferNumber = () => {
    const date = new Date();
    const seq = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `TRS-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${seq}`;
};

// ========== STAT CARD ==========
const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{
            background: `rgba(${color}, 0.1)`,
            padding: '0.6rem',
            borderRadius: 'var(--radius-md)',
            color: `rgb(${color})`,
            width: 'fit-content'
        }}>
            <Icon size={20} />
        </div>
        <div>
            <h3 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>{title}</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{value}</p>
        </div>
    </div>
);

// ========== COMPONENTE PRINCIPAL ==========
const Transfers = () => {
    const { currentCompany } = useCompany();
    const { currentUser } = useAuth();
    const companyId = currentCompany?.id;
    const { products, addMovement } = useInventory(companyId);

    // Estado
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showDetail, setShowDetail] = useState(null);
    const [filterStatus, setFilterStatus] = useState('todos');
    const [searchTerm, setSearchTerm] = useState('');

    // Formulario
    const [formData, setFormData] = useState({
        almacen_origen: SUCURSALES[0],
        almacen_destino: '',
        responsable: '',
        observaciones: '',
        fecha: new Date().toISOString().split('T')[0]
    });
    const [cart, setCart] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    // ========== SUPABASE: CARGAR TRASLADOS ==========
    const fetchTransfers = useCallback(async () => {
        if (!companyId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setTransfers(data || []);
        } catch (error) {
            console.error('Error cargando traslados:', error);
            setTransfers([]);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

    useEffect(() => {
        if (!companyId) return;
        const channel = supabase
            .channel('stock_transfers_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME, filter: `company_id=eq.${companyId}` }, () => fetchTransfers())
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [companyId, fetchTransfers]);

    // Productos filtrados para busqueda
    const filteredProducts = useMemo(() => {
        if (!productSearch || productSearch.length < 2) return [];
        const term = productSearch.toLowerCase();
        return products
            .filter(p => {
                const match = (p.description || '').toLowerCase().includes(term) ||
                    (p.sku || '').toLowerCase().includes(term) ||
                    (p.reference || '').toLowerCase().includes(term);
                return match && (p.quantity || 0) > 0;
            })
            .slice(0, 8);
    }, [products, productSearch]);

    // Traslados filtrados
    const filteredTransfers = useMemo(() => {
        let list = transfers;
        if (filterStatus !== 'todos') list = list.filter(t => t.status === filterStatus);
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            list = list.filter(t =>
                (t.transfer_number || '').toLowerCase().includes(term) ||
                (t.origen_id || '').toLowerCase().includes(term) ||
                (t.destino_texto || '').toLowerCase().includes(term) ||
                (t.responsable || '').toLowerCase().includes(term)
            );
        }
        return list;
    }, [transfers, filterStatus, searchTerm]);

    // Conteos
    const counts = useMemo(() => ({
        total: transfers.length,
        en_transito: transfers.filter(t => t.status === ESTADOS.EN_TRANSITO).length,
        completado: transfers.filter(t => t.status === ESTADOS.COMPLETADO).length,
        cancelado: transfers.filter(t => t.status === ESTADOS.CANCELADO).length
    }), [transfers]);

    // ========== ACCIONES CART ==========
    const addToCart = useCallback((product) => {
        const existing = cart.find(c => c.product_id === product.id);
        if (existing) {
            if (existing.cantidad < (product.quantity || 0)) {
                setCart(prev => prev.map(c =>
                    c.product_id === product.id ? { ...c, cantidad: c.cantidad + 1 } : c
                ));
            }
        } else {
            setCart(prev => [...prev, {
                product_id: product.id,
                sku: product.sku || product.reference || '',
                descripcion: product.description || '',
                cantidad: 1,
                stock_disponible: product.quantity || 0,
                unit: product.unit || 'unidad',
                location: product.location || ''
            }]);
        }
        setProductSearch('');
    }, [cart]);

    const updateCartQty = useCallback((productId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.product_id !== productId) return item;
            const newQty = item.cantidad + delta;
            if (newQty < 1 || newQty > item.stock_disponible) return item;
            return { ...item, cantidad: newQty };
        }));
    }, []);

    const removeFromCart = useCallback((productId) => {
        setCart(prev => prev.filter(c => c.product_id !== productId));
    }, []);

    // ========== SUPABASE: GUARDAR TRASLADO ==========
    const handleSave = async () => {
        setFormError('');
        if (!formData.almacen_origen) return setFormError('Seleccione almacen de origen');
        if (!formData.almacen_destino.trim()) return setFormError('Ingrese el almacen/sucursal de destino');
        if (formData.almacen_origen === formData.almacen_destino) return setFormError('Origen y destino no pueden ser iguales');
        if (!formData.responsable.trim()) return setFormError('Ingrese el responsable del despacho');
        if (cart.length === 0) return setFormError('Agregue al menos un producto');

        setSaving(true);
        try {
            const transferNumber = generateTransferNumber();
            const userName = currentUser?.display_name || currentUser?.email || 'Usuario';

            for (const item of cart) {
                await addMovement({
                    productId: item.product_id,
                    sku: item.sku,
                    productName: item.descripcion,
                    type: 'Salida',
                    quantity: item.cantidad,
                    reason: `TRASLADO_SALIDA - ${transferNumber} → ${formData.almacen_destino}`,
                    location: item.location,
                    status: 'approved',
                    createdBy: userName
                });
            }

            const itemsJson = cart.map(c => ({
                product_id: c.product_id, sku: c.sku, descripcion: c.descripcion,
                cantidad: c.cantidad, unit: c.unit
            }));

            const { error } = await supabase
                .from(TABLE_NAME)
                .insert({
                    company_id: companyId,
                    transfer_number: transferNumber,
                    origen_id: formData.almacen_origen,
                    destino_texto: formData.almacen_destino,
                    fecha: formData.fecha,
                    responsable: formData.responsable,
                    observaciones: formData.observaciones || null,
                    items: itemsJson,
                    status: ESTADOS.EN_TRANSITO,
                    created_by: userName,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            setShowForm(false);
            setCart([]);
            setFormData({ almacen_origen: SUCURSALES[0], almacen_destino: '', responsable: '', observaciones: '', fecha: new Date().toISOString().split('T')[0] });
            await fetchTransfers();
            alert(`Traslado ${transferNumber} creado exitosamente. Stock descontado.`);
        } catch (error) {
            console.error('Error creando traslado:', error);
            setFormError(`Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    // ========== SUPABASE: COMPLETAR TRASLADO ==========
    const handleComplete = useCallback(async (transferId) => {
        try {
            const { error } = await supabase
                .from(TABLE_NAME)
                .update({ status: ESTADOS.COMPLETADO, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', transferId).eq('company_id', companyId);
            if (error) throw error;
            setShowDetail(null);
            await fetchTransfers();
        } catch (error) {
            console.error('Error completando traslado:', error);
            alert(`Error: ${error.message}`);
        }
    }, [companyId, fetchTransfers]);

    // ========== DESCARGAR PDF ==========
    const handleDownloadPDF = useCallback((transfer) => {
        const pdfData = { ...transfer, almacen_origen: transfer.origen_id, almacen_destino: transfer.destino_texto };
        generarOrdenDespacho(pdfData, {
            nombre: currentCompany?.name || 'TOYOMACHO',
            rif: currentCompany?.rif || '',
            logo_url: currentCompany?.logo_url || null
        });
    }, [currentCompany]);

    // ========== RENDER ==========
    return (
        <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
            {/* Header */}
            <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Truck size={28} style={{ color: 'var(--accent-primary)' }} />
                        Traslados de Mercancia
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Registro de salida de stock entre sucursales y almacenes
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={fetchTransfers} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                        <RefreshCw size={18} />
                    </button>
                    <button onClick={() => setShowForm(true)} className="btn btn-primary">
                        <Plus size={18} />
                        Nuevo Traslado
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <StatCard title="Total Traslados" value={counts.total} icon={Package} color="59, 130, 246" />
                <StatCard title="En Transito" value={counts.en_transito} icon={Truck} color="245, 158, 11" />
                <StatCard title="Completados" value={counts.completado} icon={CheckCircle} color="16, 185, 129" />
                <StatCard title="Cancelados" value={counts.cancelado} icon={XCircle} color="239, 68, 68" />
            </div>

            {/* Filtros */}
            <div className="glass-panel" style={{
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por numero, origen, destino, responsable..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '2.5rem', fontSize: '0.875rem' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {[
                        { key: 'todos', label: 'Todos' },
                        { key: 'en_transito', label: 'En Transito', color: '#f59e0b' },
                        { key: 'completado', label: 'Completados', color: '#10b981' },
                        { key: 'cancelado', label: 'Cancelados', color: '#ef4444' }
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilterStatus(f.key)}
                            style={{
                                padding: '0.4rem 0.8rem',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                border: filterStatus === f.key ? `2px solid ${f.color || 'var(--accent-primary)'}` : '1px solid var(--border-color)',
                                background: filterStatus === f.key ? `${f.color || 'var(--accent-primary)'}15` : 'rgba(255,255,255,0.5)',
                                color: filterStatus === f.key ? (f.color || 'var(--accent-primary)') : 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lista de Traslados */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {loading ? (
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
                        <div className="spinning" style={{ width: '2rem', height: '2rem', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', margin: '0 auto 0.75rem' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>Cargando traslados...</p>
                    </div>
                ) : filteredTransfers.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
                        <Truck size={48} style={{ color: 'var(--border-color)', margin: '0 auto 1rem', display: 'block' }} />
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No hay traslados registrados</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Crea un nuevo traslado para comenzar a registrar salidas</p>
                    </div>
                ) : (
                    filteredTransfers.map(transfer => {
                        const estado = ESTADO_CONFIG[transfer.status] || ESTADO_CONFIG.en_transito;
                        const StatusIcon = estado.icon;
                        const items = transfer.items || [];
                        const totalUnidades = items.reduce((s, i) => s + (i.cantidad || 0), 0);

                        return (
                            <div key={transfer.id} className="glass-card" style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => setShowDetail(transfer)}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                    {/* Left - Icon + Info */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                        <div style={{
                                            width: '44px', height: '44px',
                                            background: estado.bg,
                                            border: `1px solid ${estado.border}`,
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <StatusIcon size={22} style={{ color: estado.color }} />
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                                    {transfer.transfer_number}
                                                </span>
                                                <span className="badge" style={{
                                                    background: estado.bg,
                                                    color: estado.color,
                                                    border: `1px solid ${estado.border}`,
                                                    fontSize: '0.7rem'
                                                }}>
                                                    {estado.label}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                <MapPin size={13} />
                                                <span>{transfer.origen_id}</span>
                                                <ArrowRight size={13} style={{ color: 'var(--accent-primary)' }} />
                                                <span style={{ fontWeight: 500 }}>{transfer.destino_texto}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right - Meta + Actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                                                <Package size={13} />
                                                {items.length} producto(s)
                                                <span style={{ margin: '0 0.15rem' }}>·</span>
                                                {totalUnidades} unds
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                                                <Calendar size={12} />
                                                {new Date(transfer.created_at).toLocaleDateString('es-VE')}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => setShowDetail(transfer)}
                                                className="btn btn-secondary btn-sm"
                                                title="Ver detalle"
                                                style={{ padding: '0.4rem' }}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDownloadPDF(transfer)}
                                                className="btn btn-primary btn-sm"
                                                title="Descargar Orden de Despacho"
                                                style={{ padding: '0.4rem' }}
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>

                                        <ChevronRight size={18} style={{ color: 'var(--border-color)' }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ========== MODAL FORMULARIO ========== */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '720px', width: '95%', padding: '0' }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '1.5rem 2rem',
                            borderBottom: '1px solid var(--border-color)',
                            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, transparent 100%)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '36px', height: '36px',
                                    background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <FileText size={18} style={{ color: 'white' }} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Nuevo Traslado de Mercancia</h2>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Complete los datos del despacho</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowForm(false); setCart([]); setFormError(''); }}
                                style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.4rem', cursor: 'pointer' }}>
                                <X size={18} style={{ color: 'var(--text-secondary)' }} />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem 2rem', maxHeight: '65vh', overflowY: 'auto' }}>
                            {formError && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.75rem 1rem', marginBottom: '1rem',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: '#b91c1c', fontSize: '0.85rem'
                                }}>
                                    <AlertTriangle size={16} />
                                    {formError}
                                </div>
                            )}

                            {/* Cabecera */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                                        <MapPin size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                                        Almacen Origen *
                                    </label>
                                    <select
                                        value={formData.almacen_origen}
                                        onChange={e => setFormData(p => ({ ...p, almacen_origen: e.target.value }))}
                                    >
                                        {SUCURSALES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                                        <ArrowRight size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                                        Almacen Destino *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.almacen_destino}
                                        onChange={e => setFormData(p => ({ ...p, almacen_destino: e.target.value }))}
                                        placeholder="Ej: Toyomacho El Tigre"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                                        <User size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                                        Responsable Despacho *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.responsable}
                                        onChange={e => setFormData(p => ({ ...p, responsable: e.target.value }))}
                                        placeholder="Nombre del despachador"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                                        <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                                        Fecha
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.fecha}
                                        onChange={e => setFormData(p => ({ ...p, fecha: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>Observaciones</label>
                                <textarea
                                    value={formData.observaciones}
                                    onChange={e => setFormData(p => ({ ...p, observaciones: e.target.value }))}
                                    placeholder="Notas adicionales..."
                                    rows={2}
                                    style={{ resize: 'none' }}
                                />
                            </div>

                            {/* Buscar productos */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                                    <Search size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                                    Agregar Productos
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                        placeholder="Buscar por SKU, referencia o descripcion..."
                                        style={{ paddingLeft: '2.5rem' }}
                                    />
                                    {filteredProducts.length > 0 && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                                            background: '#f8fafc', border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-sm)', zIndex: 10,
                                            maxHeight: '200px', overflowY: 'auto',
                                            boxShadow: 'var(--shadow-lg)'
                                        }}>
                                            {filteredProducts.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => addToCart(p)}
                                                    style={{
                                                        width: '100%', padding: '0.7rem 1rem', textAlign: 'left',
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        borderBottom: '1px solid var(--border-color)',
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        transition: 'background 0.15s ease'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(14, 165, 233, 0.05)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{p.description}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.sku || p.reference || 'Sin codigo'}</div>
                                                    </div>
                                                    <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                                                        Stock: {p.quantity || 0}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Carrito de productos */}
                            {cart.length > 0 && (
                                <div style={{
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    marginBottom: '1rem'
                                }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                                                <th style={{ textAlign: 'left', padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Codigo</th>
                                                <th style={{ textAlign: 'left', padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descripcion</th>
                                                <th style={{ textAlign: 'center', padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock</th>
                                                <th style={{ textAlign: 'center', padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cantidad</th>
                                                <th style={{ textAlign: 'center', padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cart.map(item => (
                                                <tr key={item.product_id} style={{ borderTop: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.sku}</td>
                                                    <td style={{ padding: '0.6rem 1rem', fontWeight: 500 }}>{item.descripcion}</td>
                                                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{item.stock_disponible}</td>
                                                    <td style={{ padding: '0.6rem 1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                                            <button onClick={() => updateCartQty(item.product_id, -1)}
                                                                className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.4rem', minWidth: '28px' }}>
                                                                <Minus size={14} />
                                                            </button>
                                                            <span style={{ fontWeight: 700, minWidth: '24px', textAlign: 'center', fontSize: '0.95rem' }}>{item.cantidad}</span>
                                                            <button onClick={() => updateCartQty(item.product_id, 1)}
                                                                className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.4rem', minWidth: '28px' }}>
                                                                <Plus size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                                                        <button onClick={() => removeFromCart(item.product_id)}
                                                            className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.4rem' }}>
                                                            <XCircle size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div style={{
                                        padding: '0.6rem 1rem', textAlign: 'right',
                                        background: 'rgba(0,0,0,0.02)', fontSize: '0.8rem',
                                        color: 'var(--text-secondary)', fontWeight: 500,
                                        borderTop: '1px solid var(--border-color)'
                                    }}>
                                        <Package size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                                        {cart.length} producto(s) — {cart.reduce((s, c) => s + c.cantidad, 0)} unidades total
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Botones */}
                        <div style={{
                            display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
                            padding: '1.25rem 2rem',
                            borderTop: '1px solid var(--border-color)',
                            background: 'rgba(0,0,0,0.015)'
                        }}>
                            <button onClick={() => { setShowForm(false); setCart([]); setFormError(''); }} className="btn btn-secondary">
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || cart.length === 0}
                                className="btn btn-success"
                                style={{ opacity: saving || cart.length === 0 ? 0.5 : 1, cursor: saving || cart.length === 0 ? 'not-allowed' : 'pointer' }}
                            >
                                {saving ? (
                                    <>
                                        <RefreshCw size={16} className="spinning" /> Procesando...
                                    </>
                                ) : (
                                    <>
                                        <Truck size={16} /> Confirmar y Descontar Stock
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== MODAL DETALLE ========== */}
            {showDetail && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '660px', width: '95%', padding: '0' }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '1.5rem 2rem',
                            borderBottom: '1px solid var(--border-color)',
                            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, transparent 100%)'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Hash size={18} style={{ color: 'var(--accent-primary)' }} />
                                    {showDetail.transfer_number}
                                </h2>
                            </div>
                            <button onClick={() => setShowDetail(null)}
                                style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.4rem', cursor: 'pointer' }}>
                                <X size={18} style={{ color: 'var(--text-secondary)' }} />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem 2rem' }}>
                            {/* Estado Badge */}
                            {(() => {
                                const estado = ESTADO_CONFIG[showDetail.status] || ESTADO_CONFIG.en_transito;
                                return (
                                    <span className="badge" style={{
                                        background: estado.bg, color: estado.color,
                                        border: `1px solid ${estado.border}`,
                                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                        marginBottom: '1.25rem', fontSize: '0.8rem', padding: '0.35rem 0.75rem'
                                    }}>
                                        <estado.icon size={14} />
                                        {estado.label}
                                    </span>
                                );
                            })()}

                            {/* Info Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                {[
                                    { label: 'Almacen Origen', value: showDetail.origen_id, icon: MapPin },
                                    { label: 'Almacen Destino', value: showDetail.destino_texto, icon: ArrowRight },
                                    { label: 'Responsable', value: showDetail.responsable, icon: User },
                                    { label: 'Fecha', value: new Date(showDetail.fecha || showDetail.created_at).toLocaleDateString('es-VE'), icon: Calendar }
                                ].map((field, i) => (
                                    <div key={i} style={{
                                        padding: '0.75rem',
                                        background: 'rgba(0,0,0,0.02)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <field.icon size={12} />
                                            {field.label}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>{field.value}</div>
                                    </div>
                                ))}
                            </div>

                            {showDetail.observaciones && (
                                <div style={{
                                    padding: '0.75rem',
                                    background: 'rgba(245, 158, 11, 0.05)',
                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: '1.25rem',
                                    fontSize: '0.85rem'
                                }}>
                                    <strong style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Observaciones:</strong>
                                    <p style={{ margin: '0.25rem 0 0' }}>{showDetail.observaciones}</p>
                                </div>
                            )}

                            {/* Items Table */}
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                                            <th style={{ textAlign: 'left', padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Codigo</th>
                                            <th style={{ textAlign: 'left', padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descripcion</th>
                                            <th style={{ textAlign: 'center', padding: '0.6rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cantidad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(showDetail.items || []).map((item, i) => (
                                            <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.sku}</td>
                                                <td style={{ padding: '0.6rem 1rem', fontWeight: 500 }}>{item.descripcion}</td>
                                                <td style={{ padding: '0.6rem 1rem', textAlign: 'center', fontWeight: 700, color: 'var(--accent-primary)' }}>{item.cantidad}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div style={{
                            display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
                            padding: '1.25rem 2rem',
                            borderTop: '1px solid var(--border-color)',
                            background: 'rgba(0,0,0,0.015)'
                        }}>
                            <button onClick={() => handleDownloadPDF(showDetail)} className="btn btn-primary">
                                <Download size={16} />
                                Orden de Despacho PDF
                            </button>
                            {showDetail.status === ESTADOS.EN_TRANSITO && (
                                <button onClick={() => handleComplete(showDetail.id)} className="btn btn-success">
                                    <CheckCircle size={16} />
                                    Marcar Completado
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Transfers;
