import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContextSupabase';

const CompanyContext = createContext();

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (!context) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
};

export const CompanyProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [currentCompany, setCurrentCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch companies where user is a member
    const fetchCompanies = useCallback(async () => {
        if (!currentUser) {
            setCompanies([]);
            setCurrentCompany(null);
            setLoading(false);
            return;
        }

        try {
            // For now, fetch all companies (we'll filter by membership later)
            // In PostgreSQL, we need to use @> operator for array contains
            const { data, error } = await supabase
                .from('companies')
                .select('*');

            if (error) throw error;

            // Filter companies where user is a member
            // Check multiple possible ID fields for flexibility
            let userCompanies = data?.filter(c => {
                const userIds = [
                    currentUser.id,
                    currentUser.uid,
                    currentUser.firebase_id,
                    currentUser.user?.id
                ].filter(Boolean);

                return c.members?.some(memberId => userIds.includes(memberId)) ||
                    userIds.includes(c.owner_id);
            }) || [];

            // FALLBACK: If user is admin or no membership found, show ALL companies
            if (userCompanies.length === 0 && data?.length > 0) {
                console.log('ℹ️ No explicit membership, showing all available companies');
                userCompanies = data; // Show all companies for selection
            }

            setCompanies(userCompanies);

            // Auto-select from localStorage or first company
            const savedId = localStorage.getItem('currentCompanyId');
            if (savedId) {
                const saved = userCompanies.find(c => c.id === savedId);
                if (saved) {
                    setCurrentCompany(saved);
                } else if (userCompanies.length > 0) {
                    setCurrentCompany(userCompanies[0]);
                    localStorage.setItem('currentCompanyId', userCompanies[0].id);
                }
            } else if (userCompanies.length > 0) {
                setCurrentCompany(userCompanies[0]);
                localStorage.setItem('currentCompanyId', userCompanies[0].id);
            }
        } catch (err) {
            console.error('Error fetching companies:', err);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    // Load companies on user change
    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    // Set up real-time subscription
    useEffect(() => {
        if (!currentUser) return;

        const channel = supabase
            .channel('companies_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, fetchCompanies)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, fetchCompanies]);

    const selectCompany = (company) => {
        setCurrentCompany(company);
        localStorage.setItem('currentCompanyId', company.id);
    };

    const createCompany = async (name, rif = '') => {
        if (!currentUser) throw new Error('No hay usuario autenticado');

        const newCompany = {
            name,
            rif,
            created_at: new Date().toISOString(),
            owner_id: currentUser.id,
            members: [currentUser.id]
        };

        const { data, error } = await supabase
            .from('companies')
            .insert(newCompany)
            .select()
            .single();

        if (error) throw error;

        // Auto-select the new company
        setCurrentCompany(data);
        localStorage.setItem('currentCompanyId', data.id);

        return data.id;
    };

    const clearSelection = () => {
        setCurrentCompany(null);
        localStorage.removeItem('currentCompanyId');
    };

    return (
        <CompanyContext.Provider value={{
            companies,
            currentCompany,
            currentCompanyId: currentCompany?.id || null,
            loading,
            selectCompany,
            createCompany,
            clearSelection,
            hasCompany: !!currentCompany
        }}>
            {children}
        </CompanyContext.Provider>
    );
};

export default CompanyContext;
