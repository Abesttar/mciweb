'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Bell, CheckCircle, Info, AlertTriangle, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read_at: string | null;
    created_at: string;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/notifications');
            setNotifications(res.data.notifications || []);
        } catch (err) {
            console.error('Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAsRead = async (notifId: string) => {
        try {
            await axios.put(`/api/notifications/${notifId}/read`);
            setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read_at: new Date().toISOString() } : n));
        } catch (error) {
            console.error('Error marking as read', error);
        }
    };

    const handleNotifClick = (notif: Notification) => {
        setSelectedNotif(notif);
        setIsDialogOpen(true);
        if (!notif.read_at) {
            markAsRead(notif.id);
        }
    };

    const getIcon = (title: string) => {
        const t = (title || '').toLowerCase();
        if (t.includes('berhasil') || t.includes('sukses')) return <CheckCircle className="w-6 h-6 text-green-500" />;
        if (t.includes('gagal') || t.includes('alpa') || t.includes('peringatan')) return <AlertTriangle className="w-6 h-6 text-red-500" />;
        if (t.includes('pesan')) return <MessageSquare className="w-6 h-6 text-blue-500" />;
        return <Bell className="w-6 h-6 text-blue-500" />;
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Memuat notifikasi...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Semua Notifikasi</h1>
            
            <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Belum ada notifikasi.</div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {notifications.map(notif => (
                            <div 
                                key={notif.id}
                                onClick={() => handleNotifClick(notif)}
                                className={`flex gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!notif.read_at ? 'bg-red-50/20 dark:bg-red-900/10' : ''}`}
                            >
                                <div className="mt-1 flex-shrink-0">
                                    {getIcon(notif.title)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <h3 className={`text-base font-medium truncate ${!notif.read_at ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {notif.title || 'Pemberitahuan'}
                                        </h3>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">
                                            {format(new Date(notif.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                        {notif.message}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg bg-white dark:bg-[#1e2532] border-gray-100 dark:border-gray-700">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedNotif && getIcon(selectedNotif.title)}
                            {selectedNotif?.title || 'Pemberitahuan'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {selectedNotif?.message}
                        </p>
                        <div className="mt-6 text-xs text-gray-400">
                            Diterima pada {selectedNotif && format(new Date(selectedNotif.created_at), 'dd MMMM yyyy, HH:mm', { locale: id })}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
