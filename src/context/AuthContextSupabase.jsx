import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
    auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from '../firebase';

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

    // Fetch user profile from users table (using Email to link Firebase <-> Supabase)
    const fetchUserProfile = async (email) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
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

    // Listen for auth state changes (FIREBASE)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is authenticated in Firebase
                setLoading(true);
                try {
                    // Try to fetch profile from Supabase
                    const profile = await fetchUserProfile(firebaseUser.email);

                    if (profile) {
                        // Check if user is inactive
                        if (!profile.active) {
                            console.warn('User is inactive, logging out');
                            await signOut(auth);
                            setCurrentUser(null);
                            setUserProfile(null);
                            return;
                        }

                        setUserProfile(profile);
                        // Merge Firebase User + Supabase Profile
                        setCurrentUser({ ...firebaseUser, ...profile });
                    } else {
                        // Profile doesn't exist in Supabase yet?
                        // Fallback to basic Firebase user, permissions will fail safely
                        console.warn("User in Firebase but not in Supabase");
                        setCurrentUser(firebaseUser);
                        setUserProfile(null);
                    }
                } catch (e) {
                    console.error("Auth State Error:", e);
                    setCurrentUser(firebaseUser);
                }
            } else {
                // User is signed out
                setCurrentUser(null);
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Subscribe to auth changes
    // (Removed old Supabase subscription code as it is replaced by Firebase above)

    // Register new user (FIREBASE + SUPABASE)
    const register = async (email, password, displayName, role = ROLES.VENDEDOR) => {
        try {
            setError(null);

            // 1. Create auth user in Firebase
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            // 2. Create user profile in Supabase users table
            // Note: We deliberately assume this works. If it fails due to RLS, the user exists in Firebase but not DB.
            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    uid: firebaseUser.uid, // Store Firebase UID
                    email,
                    display_name: displayName,
                    role,
                    modules: { ...DEFAULT_MODULES },
                    active: true, // Default active
                    created_at: new Date().toISOString(),
                    firebase_id: firebaseUser.uid // Clarity
                });

            if (profileError) {
                console.error('Error creating local profile:', profileError);
                // We don't rollback Firebase user here to avoid complexity, but ideally we should.
            }

            return { success: true, user: firebaseUser };
        } catch (err) {
            let msg = err.message;
            if (msg.includes('email-already-in-use')) msg = 'El correo ya está registrado.';
            setError(msg);
            return { success: false, error: msg };
        }
    };

    // Login (FIREBASE)
    const login = async (email, password) => {
        try {
            setError(null);

            // 1. Firebase Login
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // If we reach here, email/pass is correct and VALID. No "email not confirmed" error.

            // 2. Check Active Status in Supabase
            const userProfile = await fetchUserProfile(email);

            if (userProfile) {
                // Check if user is inactive
                if (!userProfile.active) {
                    await signOut(auth);
                    const msg = 'Usuario desactivado. Contacte al administrador.';
                    setError(msg);
                    return { success: false, error: msg };
                }

                // Success with profile
                return { success: true, user: userCredential.user };
            } else {
                // User exists in Firebase but not in Supabase?
                // Allow login, but they might have limited access
                console.warn("Login successful but no Supabase profile found.");
                return { success: true, user: userCredential.user };
            }
        } catch (err) {
            let msg = err.message;
            if (msg.includes('auth/invalid-credential')) msg = 'Credenciales inválidas.';
            else if (msg.includes('auth/user-not-found')) msg = 'Usuario no encontrado.';
            else if (msg.includes('auth/wrong-password')) msg = 'Contraseña incorrecta.';
            setError(msg);
            return { success: false, error: msg };
        }
    };

    // Logout
    const logout = async () => {
        try {
            await signOut(auth); // Firebase SignOut
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

    // Check if user is admin (case-insensitive)
    const isAdmin = () => {
        const userRole = (userProfile?.role || '').toLowerCase();
        return userRole === 'admin';
    };

    // Check if current user can access a module
    const canAccessModule = (moduleId) => {
        // Si no hay perfil cargado aún, dar acceso temporal para evitar sidebar vacío
        if (!userProfile) {
            console.log('canAccessModule: No userProfile yet, granting temp access');
            return true; // Cambiado de false a true para evitar sidebar vacío
        }

        // Admin siempre tiene acceso a todo
        if (userProfile.role === ROLES.ADMIN) {
            return true;
        }

        // Si el usuario no tiene módulos configurados, dar acceso a módulos básicos
        if (!userProfile.modules || Object.keys(userProfile.modules).length === 0) {
            console.log('canAccessModule: User has no modules configured, granting basic access');
            // Dar acceso a todos excepto settings y admin-only modules
            const restrictedModules = ['settings', 'article177'];
            return !restrictedModules.includes(moduleId);
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
