import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    auth,
    db
} from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import {
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    orderBy
} from 'firebase/firestore';

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

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                // Fetch user profile from Firestore
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        setUserProfile(userDoc.data());
                    }
                } catch (err) {
                    console.error('Error fetching user profile:', err);
                }
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Register new user
    const register = async (email, password, displayName, role = ROLES.VENDEDOR) => {
        try {
            setError(null);
            const { user } = await createUserWithEmailAndPassword(auth, email, password);

            // Update display name
            await updateProfile(user, { displayName });

            // Create user profile in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email,
                displayName,
                role,
                createdAt: new Date().toISOString(),
                active: true
            });

            return { success: true, user };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    // Login
    const login = async (email, password) => {
        try {
            setError(null);
            const { user } = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user };
        } catch (err) {
            let errorMessage = 'Error al iniciar sesión';
            if (err.code === 'auth/user-not-found') {
                errorMessage = 'Usuario no encontrado';
            } else if (err.code === 'auth/wrong-password') {
                errorMessage = 'Contraseña incorrecta';
            } else if (err.code === 'auth/invalid-email') {
                errorMessage = 'Email inválido';
            } else if (err.code === 'auth/invalid-credential') {
                errorMessage = 'Credenciales inválidas';
            }
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    };

    // Logout
    const logout = async () => {
        try {
            await signOut(auth);
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
            const usersRef = collection(db, 'users');
            const q = query(usersRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersList);
            return usersList;
        } catch (err) {
            console.error('Error fetching users:', err);
            return [];
        }
    };

    // Update user role
    const updateUserRole = async (userId, newRole) => {
        try {
            await updateDoc(doc(db, 'users', userId), { role: newRole });
            await fetchUsers();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    // Deactivate user
    const toggleUserActive = async (userId, active) => {
        try {
            await updateDoc(doc(db, 'users', userId), { active });
            await fetchUsers();
            return { success: true };
        } catch (err) {
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
        hasPermission,
        isAdmin,
        ROLES,
        PERMISSIONS
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
