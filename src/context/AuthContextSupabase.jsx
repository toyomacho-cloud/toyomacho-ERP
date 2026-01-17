import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Roles disponibles
export const ROLES = {
    ADMIN: 'admin',
    VENDEDOR: 'vendedor',
    ALMACENISTA: 'almacenista'
};

// Módulos disponibles en el sistema
export const AVAILABLE_MODULES = {
    dashboard: { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    inventory: { id: 'inventory', label: 'Productos', icon: 'Package' },
    control: { id: 'control', label: 'Control de Inventario', icon: 'ClipboardList' },
    purchases: { id: 'purchases', label: 'Compras', icon: 'ShoppingCart' },
    pos: { id: 'pos', label: 'POS', icon: 'ArrowRightLeft' },
    cashregister: { id: 'cashregister', label: 'Caja', icon: 'Wallet' },
    receivables: { id: 'receivables', label: 'Cuentas x Cobrar', icon: 'DollarSign' },
    clients: { id: 'clients', label: 'Contactos', icon: 'Users' },
    mail: { id: 'mail', label: 'NovaMail', icon: 'Mail' },
    reports: { id: 'reports', label: 'Reportes', icon: 'FileSpreadsheet' },
    article177: { id: 'article177', label: 'Art. 177 ISLR', icon: 'Scale' },
    settings: { id: 'settings', label: 'Configuración', icon: 'Settings' }
};

// Módulos por defecto (ninguno habilitado)
export const DEFAULT_MODULES = {
    dashboard: false,
    inventory: false,
    control: false,
    purchases: false,
    pos: false,
    cashregister: false,
    receivables: false,
    clients: false,
    mail: false,
    reports: false,
    article177: false,
    settings: false
};

// Permisos por rol
export const PERMISSIONS = {
    [ROLES.ADMIN]: {
        canCreateUsers: true,
        canDeleteUsers: true,
        canEditProducts: true,
        canDeleteProducts: true,
        canViewSales: true,
        canCreateSales: true,
        canViewPurchases: true,
        canCreatePurchases: true,
        canViewInventory: true,
        canEditInventory: true,
        canViewSettings: true,
        canImportExcel: true,
        canExportData: true
    },
    [ROLES.VENDEDOR]: {
        canCreateUsers: false,
        canDeleteUsers: false,
        canEditProducts: false,
        canDeleteProducts: false,
        canViewSales: true,
        canCreateSales: true,
        canViewPurchases: false,
        canCreatePurchases: false,
        canViewInventory: true,
        canEditInventory: false,
        canViewSettings: false,
        canImportExcel: false,
        canExportData: false
    },
    [ROLES.ALMACENISTA]: {
        canCreateUsers: false,
        canDeleteUsers: false,
        canEditProducts: true,
        canDeleteProducts: false,
        canViewSales: false,
        canCreateSales: false,
        canViewPurchases: true,
        canCreatePurchases: true,
        canViewInventory: true,
        canEditInventory: true,
        canViewSettings: false,
        canImportExcel: true,
        canExportData: false
    }
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch user profile from users table
    const fetchUserProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('uid', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching user profile:', error);
                return null;
            }
            return data;
        } catch (err) {
            console.error('Error fetching user profile:', err);
            return null;
        }
    };

    // Listen for auth state changes
    useEffect(() => {
        // Get initial session
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUser(session.user);
                const profile = await fetchUserProfile(session.user.id);
                setUserProfile(profile);
            }
            setLoading(false);
        };

        getSession();

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setCurrentUser(session.user);
                const profile = await fetchUserProfile(session.user.id);
                setUserProfile(profile);
            } else {
                setCurrentUser(null);
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Register new user
    const register = async (email, password, displayName, role = ROLES.VENDEDOR) => {
        try {
            setError(null);

            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { display_name: displayName }
                }
            });

            if (authError) throw authError;

            // Create user profile in users table
            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    uid: authData.user.id,
                    email,
                    display_name: displayName,
                    role,
                    modules: { ...DEFAULT_MODULES },
                    active: true,
                    created_at: new Date().toISOString()
                });

            if (profileError) {
                console.error('Error creating user profile:', profileError);
            }

            return { success: true, user: authData.user };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    // Login
    const login = async (email, password) => {
        try {
            setError(null);
            const { data, error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (loginError) {
                let errorMessage = 'Error al iniciar sesión';
                if (loginError.message.includes('Invalid login')) {
                    errorMessage = 'Credenciales inválidas';
                } else if (loginError.message.includes('Email not confirmed')) {
                    errorMessage = 'Email no confirmado';
                }
                setError(errorMessage);
                return { success: false, error: errorMessage };
            }

            return { success: true, user: data.user };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    // Logout
    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setCurrentUser(null);
            setUserProfile(null);
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    // Get all users (admin only)
    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
            return data || [];
        } catch (err) {
            console.error('Error fetching users:', err);
            return [];
        }
    };

    // Update user role
    const updateUserRole = async (userId, newRole) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            await fetchUsers();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    // Toggle user active status
    const toggleUserActive = async (userId, active) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ active })
                .eq('id', userId);

            if (error) throw error;
            await fetchUsers();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    // Update user modules (admin only)
    const updateUserModules = async (userId, modules) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ modules })
                .eq('id', userId);

            if (error) throw error;
            await fetchUsers();
            return { success: true };
        } catch (err) {
            console.error('Error updating user modules:', err);
            return { success: false, error: err.message };
        }
    };

    // Check permission
    const hasPermission = (permission) => {
        if (!userProfile) return false;
        const rolePermissions = PERMISSIONS[userProfile.role];
        return rolePermissions ? rolePermissions[permission] : false;
    };

    // Check if user is admin
    const isAdmin = () => {
        return userProfile?.role === ROLES.ADMIN;
    };

    // Check if current user can access a module
    const canAccessModule = (moduleId) => {
        if (!userProfile) return false;
        // Admin siempre tiene acceso a todo
        if (userProfile.role === ROLES.ADMIN) return true;
        // Si el usuario no tiene módulos configurados, dar acceso a todo (excepto settings)
        if (!userProfile.modules) {
            return moduleId !== 'settings';
        }
        // Si tiene módulos configurados, verificar permiso específico
        return userProfile.modules[moduleId] === true;
    };

    const value = {
        currentUser,
        userProfile,
        users,
        loading,
        error,
        register,
        login,
        logout,
        fetchUsers,
        updateUserRole,
        toggleUserActive,
        updateUserModules,
        canAccessModule,
        hasPermission,
        isAdmin,
        ROLES,
        PERMISSIONS,
        AVAILABLE_MODULES,
        DEFAULT_MODULES
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
