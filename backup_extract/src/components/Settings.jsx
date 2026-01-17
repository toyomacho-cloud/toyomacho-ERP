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
    AlertTriangle,
    Building2,
    Plus,
    Trash2,
    Edit2,
    UserCheck
} from 'lucide-react';
import { useAuth, ROLES } from '../context/AuthContext';
import { useInventoryContext } from '../context/InventoryContext';
import { useCompany } from '../context/CompanyContext';
import { db } from '../firebase';
import { collection, writeBatch, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

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
    const { companies, createCompany, currentCompany } = useCompany();

    const [activeTab, setActiveTab] = useState('profile');
    const [showAddUser, setShowAddUser] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
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
    const [showAddCompany, setShowAddCompany] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [companyForm, setCompanyForm] = useState({ name: '', rif: '' });
    const [managingMembers, setManagingMembers] = useState(null);

    // Custom Roles State
    const [customRoles, setCustomRoles] = useState([]);
    const [showAddRole, setShowAddRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [rolePermissions, setRolePermissions] = useState({
        canViewInventory: true,
        canEditInventory: false,
        canViewSales: true,
        canCreateSales: false,
        canViewReports: false,
        canManageUsers: false,
        canManageCaja: false
    });
    const [confirmDelete, setConfirmDelete] = useState(null);

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

    // Edit user
    const handleEditUser = (user) => {
        setEditingUser(user);
        setNewUserForm({
            displayName: user.displayName || '',
            email: user.email || '',
            password: '',
            role: user.role || ROLES.VENDEDOR
        });
    };

    // Update user info
    const handleUpdateUser = async () => {
        if (!editingUser) return;
        setLoading(true);

        try {
            const userRef = doc(db, 'users', editingUser.id);
            await updateDoc(userRef, {
                displayName: newUserForm.displayName,
                role: newUserForm.role
            });

            setMessage({ type: 'success', text: 'Usuario actualizado correctamente' });
            setEditingUser(null);
            setNewUserForm({ displayName: '', email: '', password: '', role: ROLES.VENDEDOR });
            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            setMessage({ type: 'error', text: 'Error al actualizar usuario: ' + error.message });
        }
        setLoading(false);
    };

    // Delete user (only deactivates, doesn't remove from Firebase Auth)
    const handleDeleteUser = async (userId) => {
        // First click - set confirmation
        if (confirmDelete !== userId) {
            setConfirmDelete(userId);
            // Auto-reset after 5 seconds
            setTimeout(() => {
                setConfirmDelete(prev => prev === userId ? null : prev);
            }, 5000);
            return;
        }

        // Second click - execute delete
        setLoading(true);
        try {
            // We don't actually delete from Firebase Auth, just mark as deleted in Firestore
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                active: false,
                deleted: true,
                deletedAt: new Date().toISOString()
            });

            setMessage({ type: 'success', text: 'Usuario eliminado correctamente' });
            setConfirmDelete(null);
            await fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            setMessage({ type: 'error', text: 'Error al eliminar usuario: ' + error.message });
            setConfirmDelete(null);
        }
        setLoading(false);
    };

    // Create custom role
    const handleCreateRole = async () => {
        if (!newRoleName.trim()) return;

        const roleId = newRoleName.toLowerCase().replace(/\s+/g, '_');
        const newRole = {
            id: roleId,
            name: newRoleName,
            permissions: rolePermissions,
            createdAt: new Date().toISOString(),
            isCustom: true
        };

        setCustomRoles([...customRoles, newRole]);
        setNewRoleName('');
        setShowAddRole(false);
        setRolePermissions({
            canViewInventory: true,
            canEditInventory: false,
            canViewSales: true,
            canCreateSales: false,
            canViewReports: false,
            canManageUsers: false,
            canManageCaja: false
        });
        setMessage({ type: 'success', text: 'Rol creado correctamente' });
    };

    // Delete custom role
    const handleDeleteRole = (roleId) => {
        setCustomRoles(customRoles.filter(r => r.id !== roleId));
        setMessage({ type: 'success', text: 'Rol eliminado' });
    };

    // Get all available roles (system + custom)
    const getAllRoles = () => {
        const systemRoles = [
            { id: ROLES.ADMIN, name: 'Administrador', isSystem: true },
            { id: ROLES.VENDEDOR, name: 'Vendedor', isSystem: true },
            { id: ROLES.ALMACENISTA, name: 'Almacenista', isSystem: true }
        ];
        return [...systemRoles, ...customRoles];
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
            default:
                const customRole = customRoles.find(r => r.id === role);
                return customRole ? customRole.name : role;
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
                            onClick={() => setActiveTab('roles')}
                            className={`btn ${activeTab === 'roles' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            <Shield size={18} /> Roles
                        </button>
                        <button
                            onClick={() => setActiveTab('tools')}
                            className={`btn ${activeTab === 'tools' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            <Database size={18} /> Herramientas
                        </button>
                        <button
                            onClick={() => setActiveTab('companies')}
                            className={`btn ${activeTab === 'companies' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            <Building2 size={18} /> Empresas
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
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {user.id !== currentUser?.uid && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditUser(user)}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                                                            title="Editar usuario"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleActive(user.id, user.active)}
                                                            className={`btn ${user.active ? 'btn-secondary' : 'btn-primary'}`}
                                                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                                                        >
                                                            {user.active ? 'Desactivar' : 'Activar'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className={`btn ${confirmDelete === user.id ? 'btn-danger' : 'btn-secondary'}`}
                                                            style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                                                            title={confirmDelete === user.id ? 'Confirmar eliminación' : 'Eliminar usuario'}
                                                        >
                                                            <Trash2 size={14} />
                                                            {confirmDelete === user.id && ' Confirmar'}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
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

                    {/* Edit User Modal */}
                    {editingUser && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}>
                            <div className="glass-panel" style={{
                                width: '90%',
                                maxWidth: '500px',
                                padding: '1.5rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Edit2 size={20} /> Editar Usuario
                                    </h3>
                                    <button
                                        onClick={() => { setEditingUser(null); setNewUserForm({ displayName: '', email: '', password: '', role: ROLES.VENDEDOR }); }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Nombre</label>
                                    <input
                                        type="text"
                                        value={newUserForm.displayName}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email (no modificable)</label>
                                    <input
                                        type="email"
                                        value={newUserForm.email}
                                        disabled
                                        className="form-input"
                                        style={{ width: '100%', opacity: 0.6 }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Rol</label>
                                    <select
                                        value={newUserForm.role}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    >
                                        {getAllRoles().map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => { setEditingUser(null); setNewUserForm({ displayName: '', email: '', password: '', role: ROLES.VENDEDOR }); }}
                                        style={{ flex: 1 }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleUpdateUser}
                                        disabled={loading}
                                        style={{ flex: 1 }}
                                    >
                                        <Save size={16} /> {loading ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ROLES TAB */}
            {activeTab === 'roles' && isAdmin() && (
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            <Shield size={22} /> Gestión de Roles
                        </h3>
                        <button
                            onClick={() => setShowAddRole(!showAddRole)}
                            className="btn btn-primary"
                        >
                            <Plus size={18} /> Nuevo Rol
                        </button>
                    </div>

                    {/* Add Role Form */}
                    {showAddRole && (
                        <div style={{
                            padding: '1.5rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1.5rem'
                        }}>
                            <h4 style={{ marginBottom: '1rem' }}>Crear Nuevo Rol</h4>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Nombre del Rol</label>
                                <input
                                    type="text"
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                    placeholder="Ej: Cajero, Supervisor..."
                                    className="form-input"
                                    style={{ width: '100%', maxWidth: '300px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Permisos</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                                    {Object.entries({
                                        canViewInventory: 'Ver Inventario',
                                        canEditInventory: 'Editar Inventario',
                                        canViewSales: 'Ver Ventas',
                                        canCreateSales: 'Crear Ventas',
                                        canViewReports: 'Ver Reportes',
                                        canManageUsers: 'Gestionar Usuarios',
                                        canManageCaja: 'Gestionar Caja'
                                    }).map(([key, label]) => (
                                        <label key={key} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.5rem',
                                            background: 'var(--bg-secondary)',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={rolePermissions[key]}
                                                onChange={(e) => setRolePermissions({ ...rolePermissions, [key]: e.target.checked })}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary" onClick={() => setShowAddRole(false)}>
                                    Cancelar
                                </button>
                                <button className="btn btn-primary" onClick={handleCreateRole} disabled={!newRoleName.trim()}>
                                    <Save size={16} /> Crear Rol
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Roles List */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Roles del Sistema</h4>
                        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            {[
                                { id: ROLES.ADMIN, name: 'Administrador', desc: 'Acceso total al sistema', color: 'var(--danger)' },
                                { id: ROLES.VENDEDOR, name: 'Vendedor', desc: 'Ventas y clientes', color: 'var(--success)' },
                                { id: ROLES.ALMACENISTA, name: 'Almacenista', desc: 'Inventario y movimientos', color: 'var(--info)' }
                            ].map(role => (
                                <div key={role.id} style={{
                                    padding: '1rem',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-sm)',
                                    borderLeft: `4px solid ${role.color}`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Shield size={16} style={{ color: role.color }} />
                                            {role.name}
                                        </strong>
                                        <small style={{ color: 'var(--text-secondary)' }}>{role.desc}</small>
                                    </div>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        background: 'rgba(156, 163, 175, 0.2)',
                                        borderRadius: '999px',
                                        fontSize: '0.75rem'
                                    }}>
                                        Sistema
                                    </span>
                                </div>
                            ))}
                        </div>

                        {customRoles.length > 0 && (
                            <>
                                <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Roles Personalizados</h4>
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    {customRoles.map(role => (
                                        <div key={role.id} style={{
                                            padding: '1rem',
                                            background: 'var(--bg-secondary)',
                                            borderRadius: 'var(--radius-sm)',
                                            borderLeft: '4px solid var(--primary)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <UserCheck size={16} style={{ color: 'var(--primary)' }} />
                                                    {role.name}
                                                </strong>
                                                <small style={{ color: 'var(--text-secondary)' }}>
                                                    {Object.entries(role.permissions)
                                                        .filter(([_, v]) => v)
                                                        .map(([k]) => k.replace('can', '').replace(/([A-Z])/g, ' $1').trim())
                                                        .join(', ')
                                                    }
                                                </small>
                                            </div>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handleDeleteRole(role.id)}
                                                style={{ padding: '0.5rem' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'companies' && isAdmin() && (
                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            <Building2 size={22} /> Gestión de Empresas
                        </h3>
                        <button
                            onClick={() => {
                                setShowAddCompany(!showAddCompany);
                                setEditingCompany(null);
                                setCompanyForm({ name: '', rif: '' });
                            }}
                            className="btn btn-primary"
                        >
                            <Plus size={18} /> Nueva Empresa
                        </button>
                    </div>

                    {/* Create/Edit Form */}
                    {(showAddCompany || editingCompany) && (
                        <div style={{
                            padding: '1.5rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1.5rem'
                        }}>
                            <h4 style={{ marginBottom: '1rem' }}>
                                {editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}
                            </h4>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                setLoading(true);
                                try {
                                    if (editingCompany) {
                                        await updateDoc(doc(db, 'companies', editingCompany.id), {
                                            name: companyForm.name,
                                            rif: companyForm.rif
                                        });
                                        setMessage({ type: 'success', text: 'Empresa actualizada exitosamente' });
                                    } else {
                                        await createCompany(companyForm.name, companyForm.rif);
                                        setMessage({ type: 'success', text: 'Empresa creada exitosamente' });
                                    }
                                    setShowAddCompany(false);
                                    setEditingCompany(null);
                                    setCompanyForm({ name: '', rif: '' });
                                } catch (error) {
                                    setMessage({ type: 'error', text: error.message });
                                }
                                setLoading(false);
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                            Nombre de la Empresa *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={companyForm.name}
                                            onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                                            placeholder="Ej: Mi Empresa C.A."
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                            RIF (opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={companyForm.rif}
                                            onChange={(e) => setCompanyForm({ ...companyForm, rif: e.target.value })}
                                            placeholder="J-12345678-9"
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setShowAddCompany(false);
                                            setEditingCompany(null);
                                            setCompanyForm({ name: '', rif: '' });
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        <Save size={18} /> {loading ? 'Guardando...' : (editingCompany ? 'Actualizar' : 'Crear Empresa')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Companies List */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Empresa</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>RIF</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Creada</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Estado</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {companies.map(company => (
                                    <tr key={company.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: 'var(--radius-md)',
                                                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Building2 size={18} color="white" />
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{company.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                            {company.rif || '-'}
                                        </td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                            {company.createdAt ? new Date(company.createdAt).toLocaleDateString('es-VE') : '-'}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {currentCompany?.id === company.id ? (
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '999px',
                                                    fontSize: '0.75rem',
                                                    background: 'rgba(16, 185, 129, 0.1)',
                                                    color: 'var(--success)'
                                                }}>
                                                    Activa
                                                </span>
                                            ) : (
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '999px',
                                                    fontSize: '0.75rem',
                                                    background: 'rgba(156, 163, 175, 0.1)',
                                                    color: 'var(--text-secondary)'
                                                }}>
                                                    -
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => {
                                                        setEditingCompany(company);
                                                        setCompanyForm({ name: company.name, rif: company.rif || '' });
                                                        setShowAddCompany(false);
                                                    }}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                                                    title="Editar"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setManagingMembers(company)}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                                                    title="Miembros"
                                                >
                                                    <Users size={14} />
                                                </button>
                                                {currentCompany?.id !== company.id && (
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm(`¿Eliminar la empresa "${company.name}"?\n\n⚠️ ADVERTENCIA: Esto NO eliminará los datos asociados (productos, ventas, etc).`)) {
                                                                try {
                                                                    await deleteDoc(doc(db, 'companies', company.id));
                                                                    setMessage({ type: 'success', text: 'Empresa eliminada' });
                                                                } catch (error) {
                                                                    setMessage({ type: 'error', text: error.message });
                                                                }
                                                            }
                                                        }}
                                                        className="btn btn-danger"
                                                        style={{ padding: '0.5rem', fontSize: '0.75rem' }}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {companies.length === 0 && (
                        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            No hay empresas registradas
                        </p>
                    )}

                    {/* Members Management Modal */}
                    {managingMembers && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '1rem'
                        }}>
                            <div className="glass-panel" style={{
                                width: '100%',
                                maxWidth: '500px',
                                maxHeight: '80vh',
                                overflow: 'auto',
                                padding: '2rem',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ margin: 0 }}>
                                        <Users size={20} style={{ marginRight: '0.5rem' }} />
                                        Miembros: {managingMembers.name}
                                    </h3>
                                    <button
                                        onClick={() => setManagingMembers(null)}
                                        className="btn btn-ghost"
                                        style={{ padding: '0.5rem' }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                    Selecciona los usuarios que tendrán acceso a esta empresa:
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {users.map(user => {
                                        const isMember = managingMembers.members?.includes(user.id);
                                        return (
                                            <div
                                                key={user.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '0.75rem 1rem',
                                                    background: isMember ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: isMember ? '1px solid var(--success)' : '1px solid var(--border-color)'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{user.displayName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        {user.email} • {user.role}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const companyRef = doc(db, 'companies', managingMembers.id);
                                                            if (isMember) {
                                                                await updateDoc(companyRef, {
                                                                    members: arrayRemove(user.id)
                                                                });
                                                            } else {
                                                                await updateDoc(companyRef, {
                                                                    members: arrayUnion(user.id)
                                                                });
                                                            }
                                                            // Update local state
                                                            setManagingMembers(prev => ({
                                                                ...prev,
                                                                members: isMember
                                                                    ? prev.members.filter(m => m !== user.id)
                                                                    : [...(prev.members || []), user.id]
                                                            }));
                                                            setMessage({
                                                                type: 'success',
                                                                text: isMember ? 'Usuario removido' : 'Usuario agregado'
                                                            });
                                                        } catch (error) {
                                                            setMessage({ type: 'error', text: error.message });
                                                        }
                                                    }}
                                                    className={`btn ${isMember ? 'btn-danger' : 'btn-primary'}`}
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                                                >
                                                    {isMember ? (
                                                        <><X size={14} /> Quitar</>
                                                    ) : (
                                                        <><UserCheck size={14} /> Agregar</>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {users.length === 0 && (
                                    <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                                        No hay usuarios registrados
                                    </p>
                                )}

                                <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                                    <button
                                        onClick={() => setManagingMembers(null)}
                                        className="btn btn-secondary"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Settings;

