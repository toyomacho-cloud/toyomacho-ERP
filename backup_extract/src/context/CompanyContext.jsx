import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import {
    collection,
    doc,
    addDoc,
    onSnapshot,
    query,
    where
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

const CompanyContext = createContext();

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (!context) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
};

export const CompanyProvider = ({ children }) => {
    const { currentUser, isAdmin } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [currentCompany, setCurrentCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load companies where user is a member
    useEffect(() => {
        if (!currentUser) {
            setCompanies([]);
            setCurrentCompany(null);
            setLoading(false);
            return;
        }

        const companiesQuery = query(
            collection(db, 'companies'),
            where('members', 'array-contains', currentUser.uid)
        );

        const unsubscribe = onSnapshot(companiesQuery, (snapshot) => {
            const companyList = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
            setCompanies(companyList);

            // Auto-select from localStorage or first company
            const savedId = localStorage.getItem('currentCompanyId');
            if (savedId) {
                const saved = companyList.find(c => c.id === savedId);
                if (saved) {
                    setCurrentCompany(saved);
                } else if (companyList.length > 0) {
                    setCurrentCompany(companyList[0]);
                    localStorage.setItem('currentCompanyId', companyList[0].id);
                }
            } else if (companyList.length === 1) {
                setCurrentCompany(companyList[0]);
                localStorage.setItem('currentCompanyId', companyList[0].id);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const selectCompany = (company) => {
        setCurrentCompany(company);
        localStorage.setItem('currentCompanyId', company.id);
    };

    const createCompany = async (name, rif = '') => {
        if (!currentUser) throw new Error('No hay usuario autenticado');

        const newCompany = {
            name,
            rif,
            createdAt: new Date().toISOString(),
            createdBy: currentUser.uid,
            members: [currentUser.uid]
        };

        const docRef = await addDoc(collection(db, 'companies'), newCompany);

        // Auto-select the new company
        const created = { id: docRef.id, ...newCompany };
        setCurrentCompany(created);
        localStorage.setItem('currentCompanyId', docRef.id);

        return docRef.id;
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
