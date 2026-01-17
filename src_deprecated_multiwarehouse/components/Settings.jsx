import React, { useState, useEffect } from 'react';
import {
    Settings as SettingsIcon,
    Users,
    UserPlus,
    Shield,
    User,
    Check,
    X,
    LogOut,
    Save,
    Database,
    Upload,
    AlertTriangle
} from 'lucide-react';
import { useAuth, ROLES } from '../context/AuthContext';
import { useInventoryContext } from '../context/InventoryContext';
import MigrationTool from './MigrationTool';
import { db } from '../firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

// LocalStorage keys from old implementation
const STORAGE_KEYS = {
    PRODUCTS: 'nova_inventory_data_v2',
    MOVEMENTS: 'nova_inventory_movements',
    PURCHASES: 'nova_inventory_purchases',
    PROVIDERS: 'nova_inventory_providers',
    BRANDS: 'nova_inventory_brands',
    CATEGORIES: 'nova_inventory_categories',
    SALES: 'nova_inventory_sales'
};

const Settings = () => {
    const {
        currentUser,
        userProfile,
        users,
        fetchUsers,
        register,
        updateUserRole,
        toggleUserActive,
        isAdmin,
        logout
    } = useAuth();

    const { products, categories, brands } = useInventoryContext();

    const [activeTab, setActiveTab] = useState('profile');
    const [showAddUser, setShowAddUser] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        displayName: '',
        email: '',
        password: '',
        role: ROLES.VENDEDOR
    });
    const [loading, setLoading] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [localDataStats, setLocalDataStats] = useState(null);

    useEffect(() => {
        if (isAdmin()) {
            fetchUsers();
            checkLocalData();
        }
    }, []);

    const checkLocalData = () => {
        try {
            const productsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
            const categoriesData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]');
            const brandsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.BRANDS) || '[]');
            const salesData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES) || '[]');
            const purchasesData = JSON.parse(localStorage.getItem(STORAGE_KEYS.PURCHASES) || '[]');
            const movementsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.MOVEMENTS) || '[]');
            const providersData = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROVIDERS) || '[]');

            setLocalDataStats({
                products: Array.isArray(productsData) ? productsData.length : 0,
                categories: Array.isArray(categoriesData) ? categoriesData.length : 0,
                brands: Array.isArray(brandsData) ? brandsData.length : 0,
                sales: Array.isArray(salesData) ? salesData.length : 0,
                purchases: Array.isArray(purchasesData) ? purchasesData.length : 0,
                movements: Array.isArray(movementsData) ? movementsData.length : 0,
                providers: Array.isArray(providersData) ? providersData.length : 0
            });
        } catch (error) {
            console.error('Error checking local data:', error);
            setLocalDataStats(null);
        }
    };

    const handleMigrateData = async () => {
        if (!window.confirm('⚠️ ¿Estás seguro de migrar los datos del navegador a la nube?\n\nEsto agregará los datos locales a Firebase.')) {
            return;
        }

        setMigrating(true);
        setMessage({ type: '', text: '' });

        try {
            let totalMigrated = 0;

            const categoriesData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]');
            if (Array.isArray(categoriesData) && categoriesData.length > 0) {
                const batch = writeBatch(db);
                categoriesData.forEach(cat => {
                    const docRef = doc(collection(db, 'categories'));
                    batch.set(docRef, { ...cat, migratedAt: new Date().toISOString() });
                });
                await batch.commit();
                totalMigrated += categoriesData.length;
            }

            const brandsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.BRANDS) || '[]');
            if (Array.isArray(brandsData) && brandsData.length > 0) {
                const batch = writeBatch(db);
                brandsData.forEach(brand => {
                    const docRef = doc(collection(db, 'brands'));
                    batch.set(docRef, { ...brand, migratedAt: new Date().toISOString() });
                });
                await batch.commit();
                totalMigrated += brandsData.length;
            }

            const productsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
            if (Array.isArray(productsData) && productsData.length > 0) {
                const batchSize = 400;
                for (let i = 0; i < productsData.length; i += batchSize) {
                    const batch = writeBatch(db);
                    const chunk = productsData.slice(i, i + batchSize);
                    chunk.forEach(prod => {
                        const docRef = doc(collection(db, 'products'));
                        batch.set(docRef, { ...prod, migratedAt: new Date().toISOString() });
                    });
                    await batch.commit();
                }
                totalMigrated += productsData.length;
            }

            const providersData = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROVIDERS) || '[]');
            if (Array.isArray(providersData) && providersData.length > 0) {
                const batch = writeBatch(db);
                providersData.forEach(prov => {
                    const docRef = doc(collection(db, 'providers'));
                    batch.set(docRef, { ...prov, migratedAt: new Date().toISOString() });
                });
                await batch.commit();
                totalMigrated += providersData.length;
            }

            const salesData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES) || '[]');
            if (Array.isArray(salesData) && salesData.length > 0) {
                const batchSize = 400;
                for (let i = 0; i < salesData.length; i += batchSize) {
                    const batch = writeBatch(db);
                    const chunk = salesData.slice(i, i + batchSize);
                    chunk.forEach(sale => {
                        const docRef = doc(collection(db, 'sales'));
                        batch.set(docRef, { ...sale, migratedAt: new Date().toISOString() });
                    });
                    await batch.commit();
                }
                totalMigrated += salesData.length;
            }

            const purchasesData = JSON.parse(localStorage.getItem(STORAGE_KEYS.PURCHASES) || '[]');
            if (Array.isArray(purchasesData) && purchasesData.length > 0) {
                const batchSize = 400;
                for (let i = 0; i < purchasesData.length; i += batchSize) {
                    const batch = writeBatch(db);
                    const chunk = purchasesData.slice(i, i + batchSize);
                    chunk.forEach(purchase => {
                        const docRef = doc(collection(db, 'purchases'));
                        batch.set(docRef, { ...purchase, migratedAt: new Date().toISOString() });
                    });
                    await batch.commit();
                }
                totalMigrated += purchasesData.length;
            }

            const movementsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.MOVEMENTS) || '[]');
            if (Array.isArray(movementsData) && movementsData.length > 0) {
                const batchSize = 400;
                for (let i = 0; i < movementsData.length; i += batchSize) {
                    const batch = writeBatch(db);
                    const chunk = movementsData.slice(i, i + batchSize);
                    chunk.forEach(mov => {
                        const docRef = doc(collection(db, 'movements'));
                        batch.set(docRef, { ...mov, migratedAt: new Date().toISOString() });
                    });
                    await batch.commit();
                }
                totalMigrated += movementsData.length;
            }

            setMessage({ type: 'success', text: `✅ Migración completada: ${totalMigrated} registros migrados a la nube.` });

            if (window.confirm('¿Deseas limpiar los datos locales del navegador ahora que están en la nube?')) {
                Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
                checkLocalData();
            }

        } catch (error) {
            console.error('Migration error:', error);
            setMessage({ type: 'error', text: `❌ Error en la migración: ${error.message}` });
        }

        setMigrating(false);
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        const result = await register(
            newUserForm.email,
            newUserForm.password,
            newUserForm.displayName,
            newUserForm.role
        );

        if (result.success) {
            setMessage({ type: 'success', text: 'Usuario creado exitosamente' });
            setNewUserForm({ displayName: '', email: '', password: '', role: ROLES.VENDEDOR });
            setShowAddUser(false);
            fetchUsers();
        } else {
            setMessage({ type: 'error', text: result.error });
        }
        setLoading(false);
    };

    const handleRoleChange = async (userId, newRole) => {
        const result = await updateUserRole(userId, newRole);
        if (result.success) {
            setMessage({ type: 'success', text: 'Rol actualizado' });
        }
    };

    const handleToggleActive = async (userId, currentActive) => {
        const result = await toggleUserActive(userId, !currentActive);
        if (result.success) {
            setMessage({ type: 'success', text: currentActive ? 'Usuario desactivado' : 'Usuario activado' });
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case ROLES.ADMIN: return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' };
            case ROLES.VENDEDOR: return { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' };
            case ROLES.ALMACENISTA: return { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--info)' };
            default: return { bg: 'rgba(156, 163, 175, 0.1)', color: 'var(--text-secondary)' };
        }
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case ROLES.ADMIN: return 'Administrador';
            case ROLES.VENDEDOR: return 'Vendedor';
            case ROLES.ALMACENISTA: return 'Almacenista';
            default: return role;
        }
    };

    const getTotalLocalData = () => {
        if (!localDataStats) return 0;
        return Object.values(localDataStats).reduce((a, b) => a + b, 0);
    };

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <SettingsIcon size={28} />
                    Configuración
                </h2>
            </div>

            {message.text && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    borderRadius: 'var(--radius-md)',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
                    {message.text}
                </div>
            )}

            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.5rem',
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
                >
                    <User size={18} /> Mi Perfil
                </button>
                {isAdmin() && (
                    <>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            <Users size={18} /> Usuarios
                        </button>
                        <button
                            onClick={() => setActiveTab('tools')}
                            className={`btn ${activeTab === 'tools' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            <Database size={18} /> Herramientas
                        </button>
                    </>
                )}
            </div>

            {activeTab === 'profile' && (
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={22} /> Información del Perfil
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Nombre
                            </label>
                            <div style={{
                                padding: '0.75rem 1rem',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '1rem'
                            }}>
                                {userProfile?.displayName || currentUser?.displayName || 'Sin nombre'}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Correo Electrónico
                            </label>
                            <div style={{
                                padding: '0.75rem 1rem',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '1rem'
                            }}>
                                {currentUser?.email}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Rol
                            </label>
                            <div style={{
                                padding: '0.75rem 1rem',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <Shield size={18} style={{ color: getRoleBadgeColor(userProfile?.role).color }} />
                                <span style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '999px',
                                    fontSize: '0.875rem',
                                    ...getRoleBadgeColor(userProfile?.role)
                                }}>
                                    {getRoleLabel(userProfile?.role)}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Miembro desde
                            </label>
                            <div style={{
                                padding: '0.75rem 1rem',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '1rem'
                            }}>
                                {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('es-VE') : 'N/A'}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <button
                            onClick={handleLogout}
                            className="btn btn-danger"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <LogOut size={18} /> Cerrar Sesión
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'tools' && isAdmin() && (
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Database size={22} /> Herramientas de Administrador
                    </h3>

                    <div style={{
                        padding: '1.5rem',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '1.5rem'
                    }}>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--info)' }}>☁️ Datos en la Nube (Firebase)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            <div><strong>{products.length}</strong> Productos</div>
                            <div><strong>{categories.length}</strong> Categorías</div>
                            <div><strong>{brands.length}</strong> Marcas</div>
                        </div>
                    </div>

                    <div style={{
                        padding: '1.5rem',
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
                            <AlertTriangle size={20} /> Migrar Datos del Navegador Local
                        </h4>

                        {localDataStats && getTotalLocalData() > 0 ? (
                            <>
                                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                                    Se encontraron datos guardados localmente en este navegador:
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    {localDataStats.products > 0 && <div>📦 {localDataStats.products} Productos</div>}
                                    {localDataStats.categories > 0 && <div>📁 {localDataStats.categories} Categorías</div>}
                                    {localDataStats.brands > 0 && <div>🏷️ {localDataStats.brands} Marcas</div>}
                                    {localDataStats.providers > 0 && <div>🏪 {localDataStats.providers} Proveedores</div>}
                                    {localDataStats.sales > 0 && <div>💰 {localDataStats.sales} Ventas</div>}
                                    {localDataStats.purchases > 0 && <div>🛒 {localDataStats.purchases} Compras</div>}
                                    {localDataStats.movements > 0 && <div>📊 {localDataStats.movements} Movimientos</div>}
                                </div>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleMigrateData}
                                    disabled={migrating}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <Upload size={18} />
                                    {migrating ? 'Migrando...' : `Migrar ${getTotalLocalData()} registros a la Nube`}
                                </button>
                            </>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)' }}>
                                ✅ No hay datos locales pendientes de migrar en este navegador.
                            </p>
                        )}
                    </div>

                    <MigrationTool />
                </div>
            )}

            {activeTab === 'users' && isAdmin() && (
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            <Users size={22} /> Gestión de Usuarios
                        </h3>
                        <button
                            onClick={() => setShowAddUser(!showAddUser)}
                            className="btn btn-primary"
                        >
                            <UserPlus size={18} /> Nuevo Usuario
                        </button>
                    </div>

                    {showAddUser && (
                        <div style={{
                            padding: '1.5rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1.5rem'
                        }}>
                            <h4 style={{ marginBottom: '1rem' }}>Registrar Nuevo Usuario</h4>
                            <form onSubmit={handleAddUser}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nombre</label>
                                        <input
                                            type="text"
                                            required
                                            value={newUserForm.displayName}
                                            onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                                            placeholder="Nombre completo"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Email</label>
                                        <input
                                            type="email"
                                            required
                                            value={newUserForm.email}
                                            onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                            placeholder="correo@ejemplo.com"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Contraseña</label>
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            value={newUserForm.password}
                                            onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Rol</label>
                                        <select
                                            value={newUserForm.role}
                                            onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                                        >
                                            <option value={ROLES.VENDEDOR}>Vendedor</option>
                                            <option value={ROLES.ALMACENISTA}>Almacenista</option>
                                            <option value={ROLES.ADMIN}>Administrador</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddUser(false)}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Usuario'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Usuario</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Email</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Rol</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Estado</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 600
                                                }}>
                                                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <span>{user.displayName}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                disabled={user.id === currentUser?.uid}
                                                style={{
                                                    padding: '0.5rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-secondary)'
                                                }}
                                            >
                                                <option value={ROLES.VENDEDOR}>Vendedor</option>
                                                <option value={ROLES.ALMACENISTA}>Almacenista</option>
                                                <option value={ROLES.ADMIN}>Administrador</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '999px',
                                                fontSize: '0.75rem',
                                                background: user.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: user.active ? 'var(--success)' : 'var(--danger)'
                                            }}>
                                                {user.active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {user.id !== currentUser?.uid && (
                                                <button
                                                    onClick={() => handleToggleActive(user.id, user.active)}
                                                    className={`btn ${user.active ? 'btn-danger' : 'btn-secondary'}`}
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                                                >
                                                    {user.active ? 'Desactivar' : 'Activar'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {users.length === 0 && (
                        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            No hay usuarios registrados
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Settings;
