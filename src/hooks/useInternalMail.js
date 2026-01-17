import { useState, useEffect } from 'react';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';

const COLLECTION_NAME = 'internalMail';

export const useInternalMail = () => {
    const { currentCompany } = useCompany();
    const { userProfile } = useAuth();
    const [inbox, setInbox] = useState([]);
    const [sent, setSent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const companyId = currentCompany?.id;
    const userId = userProfile?.uid;

    // Subscribe to inbox messages
    useEffect(() => {
        if (!companyId || !userId) {
            setLoading(false);
            return;
        }

        const inboxQuery = query(
            collection(db, COLLECTION_NAME),
            where('companyId', '==', companyId),
            where('to.uid', '==', userId),
            orderBy('timestamp', 'desc')
        );

        const unsubscribeInbox = onSnapshot(inboxQuery, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
                .filter(msg => !msg.deletedForReceiver); // Filter out deleted messages

            setInbox(messages);
            setUnreadCount(messages.filter(m => !m.read).length);
            setLoading(false);
        });

        return () => unsubscribeInbox();
    }, [companyId, userId]);

    // Subscribe to sent messages
    useEffect(() => {
        if (!companyId || !userId) return;

        const sentQuery = query(
            collection(db, COLLECTION_NAME),
            where('companyId', '==', companyId),
            where('from.uid', '==', userId),
            orderBy('timestamp', 'desc')
        );

        const unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
                .filter(msg => !msg.deletedForSender); // Filter out deleted messages

            setSent(messages);
        });

        return () => unsubscribeSent();
    }, [companyId, userId]);

    // Send a new message
    const sendMessage = async ({ to, subject, body, attachments = [] }) => {
        if (!companyId || !userId || !userProfile) {
            throw new Error('Usuario no autenticado');
        }

        try {
            // Upload attachments first
            const uploadedAttachments = [];
            for (const file of attachments) {
                const storageRef = ref(storage, `companies/${companyId}/mail-attachments/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                uploadedAttachments.push({
                    name: file.name,
                    url,
                    size: formatFileSize(file.size),
                    type: file.type
                });
            }

            // Create mail document
            const mailData = {
                companyId,
                from: {
                    uid: userId,
                    name: userProfile.displayName || userProfile.email,
                    email: userProfile.email
                },
                to: {
                    uid: to.uid,
                    name: to.displayName || to.email,
                    email: to.email
                },
                subject,
                body,
                attachments: uploadedAttachments,
                timestamp: serverTimestamp(),
                read: false,
                deletedForSender: false,
                deletedForReceiver: false
            };

            await addDoc(collection(db, COLLECTION_NAME), mailData);
            return { success: true };
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    };

    // Mark message as read
    const markAsRead = async (messageId) => {
        try {
            const messageRef = doc(db, COLLECTION_NAME, messageId);
            await updateDoc(messageRef, { read: true });
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    // Delete message (soft delete)
    const deleteMessage = async (messageId, type) => {
        try {
            const messageRef = doc(db, COLLECTION_NAME, messageId);
            const updateData = {};

            if (type === 'sent') {
                updateData.deletedForSender = true;
            } else {
                updateData.deletedForReceiver = true;
            }

            await updateDoc(messageRef, updateData);
        } catch (error) {
            console.error('Error deleting message:', error);
            throw error;
        }
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
