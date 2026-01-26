import { useState, useEffect } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';

// NOTE: NovaMail functionality is temporarily disabled during Supabase migration
// This stub provides empty data to prevent app crashes

const COLLECTION_NAME = 'internal_mail';

export const useInternalMail = () => {
    const { currentCompany } = useCompany();
    const { userProfile } = useAuth();
    const [inbox, setInbox] = useState([]);
    const [sent, setSent] = useState([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const companyId = currentCompany?.id;
    const userId = userProfile?.id;

    // Temporarily disabled - returns empty data
    useEffect(() => {
        setLoading(false);
    }, [companyId, userId]);

    // Send a new message - temporarily disabled
    const sendMessage = async ({ to, subject, body, attachments = [] }) => {
        console.warn('NovaMail: sendMessage is temporarily disabled during Supabase migration');
        throw new Error('El correo interno está temporalmente deshabilitado durante la migración a Supabase.');
    };

    // Mark message as read - temporarily disabled
    const markAsRead = async (messageId) => {
        console.warn('NovaMail: markAsRead is temporarily disabled');
    };

    // Delete message - temporarily disabled
    const deleteMessage = async (messageId, type) => {
        console.warn('NovaMail: deleteMessage is temporarily disabled');
    };

    return {
        inbox,
        sent,
        loading,
        unreadCount,
        sendMessage,
        markAsRead,
        deleteMessage
    };
};

// Helper function to format file size
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default useInternalMail;
