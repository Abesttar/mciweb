'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useState, useEffect, useCallback, useRef } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useLanguage } from '@/context/LanguageContext';
import { Camera, Globe, Menu } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read_at: string | null;
    created_at: string;
}

interface HeaderProps {
    onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
    const router = useRouter();
    const { user, logout, updateUser } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const res = await axios.get('/api/notifications');
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unread_count || 0);
        } catch (err) {
            console.error('Failed to fetch notifications');
        }
    }, [user]);

    // Poll every 30 seconds
    useEffect(() => {
        let mounted = true;
        if (mounted) {
            fetchNotifications();
        }
        const interval = setInterval(() => {
            if (mounted) fetchNotifications();
        }, 30000);
        return () => { mounted = false; clearInterval(interval); };
    }, [fetchNotifications]);

    const markAsRead = async (notifId: string) => {
        try {
            await axios.put(`/api/notifications/${notifId}/read`);
            fetchNotifications();
        } catch (err) {
            console.error(err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.put(`/api/notifications/all/read`);
            fetchNotifications();
        } catch (err) {
            console.error(err);
        }
    };

    const toggleLanguage = () => {
        setLanguage(language === 'id' ? 'jp' : 'id');
    };

    const uploadProfilePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) {
            toast.error('Ukuran foto profil maksimal 20 MB.');
            event.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('profile_photo', file);

        setUploadingPhoto(true);
        try {
            const res = await axios.post('/api/me/profile-photo', formData);
            updateUser(res.data.user);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal mengunggah foto profil.');
        } finally {
            setUploadingPhoto(false);
            event.target.value = '';
        }
    };

    const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

    return (
        <header className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl/95 backdrop-blur-xl shadow-sm border-b border-gray-200 dark:border-gray-800 z-20 relative transition-all sticky top-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 sm:h-16 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                    {/* Hamburger menu for mobile */}
                    <button 
                        onClick={onMenuToggle}
                        className="md:hidden p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors flex-shrink-0"
                        aria-label="Menu"
                    >
                        <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    <span className="text-sm sm:text-xl font-bold bg-gradient-to-r from-red-800 to-red-600 dark:from-red-500 dark:to-red-400 bg-clip-text text-transparent tracking-tight truncate">
                        <span className="hidden sm:inline">LPK MIRAI CROWN INDONESIA</span>
                        <span className="sm:hidden">LPK MCI</span>
                    </span>
                </div>
                
                <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6 flex-shrink-0">
                    {/* Dark Mode Toggle */}
                    <ThemeToggle />

                    {/* Language Toggle */}
                    <button 
                        onClick={toggleLanguage}
                        className="flex items-center space-x-1 px-1.5 sm:px-3 py-1 sm:py-1.5 text-gray-600 dark:text-gray-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full border border-gray-200/50 dark:border-gray-700/50 hover:border-red-200 transition-all duration-300 focus:outline-none shadow-sm"
                        title={language === 'id' ? 'Switch to Japanese' : 'Ganti ke Bahasa Indonesia'}
                    >
                        <Globe className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">{language}</span>
                    </button>

                    {/* Notification Bell */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="relative p-1 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-red-700 transition-transform hover:scale-110 focus:outline-none"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform -translate-y-1 bg-red-600 rounded-full border-2 border-white dark:border-[#151a23]">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-md shadow-lg border border-gray-100 dark:border-gray-700/50 py-1 z-50">
                                <div className="px-4 py-2 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#1e2532]/90">
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">Notifikasi</span>
                                    {unreadCount > 0 && (
                                        <button onClick={markAllAsRead} className="text-xs text-red-700 dark:text-red-400 hover:underline">
                                            Tandai semua dibaca
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">Tidak ada notifikasi</div>
                                    ) : (
                                        notifications.map(notif => (
                                            <div 
                                                key={notif.id} 
                                                className={`px-4 py-3 border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${notif.read_at ? 'opacity-60' : 'bg-red-50/30 dark:bg-red-900/10'}`}
                                                onClick={() => {
                                                    if (!notif.read_at) {
                                                        markAsRead(notif.id);
                                                    }
                                                    setShowDropdown(false);
                                                    router.push('/dashboard/notifications');
                                                }}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                                                        {notif.title || 'Pemberitahuan'}
                                                    </div>
                                                    {!notif.read_at && <span className="w-2 h-2 bg-red-700 dark:bg-red-400 rounded-full mt-1.5 flex-shrink-0"></span>}
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                                    {notif.message || ''}
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-2">
                                                    {format(new Date(notif.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="px-4 py-2 text-center border-t dark:border-gray-800">
                                    <button 
                                        onClick={() => {
                                            setShowDropdown(false);
                                            router.push('/dashboard/notifications');
                                        }}
                                        className="text-xs font-semibold text-red-700 dark:text-red-400 hover:underline"
                                    >
                                        Lihat Semua Notifikasi
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="relative">
                            <a
                                href="/dashboard/profile"
                                className="block h-7 w-7 sm:h-10 sm:w-10 rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 overflow-hidden border border-red-100 dark:border-red-900/50 hover:ring-2 hover:ring-red-200 transition"
                                title="Lihat profil"
                            >
                                {user?.profile_photo_url ? (
                                    <span
                                        aria-label={user.name}
                                        className="block h-full w-full bg-cover bg-center"
                                        style={{ backgroundImage: `url(${user.profile_photo_url})` }}
                                    />
                                ) : (
                                    <span className="flex items-center justify-center h-full w-full font-bold text-sm sm:text-base">{userInitial}</span>
                                )}
                            </a>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-0.5 -right-0.5 h-4 w-4 sm:h-5 sm:w-5 bg-red-700 hover:bg-red-800 text-white rounded-full flex items-center justify-center border-2 border-white transition"
                                title="Ganti foto profil"
                                disabled={uploadingPhoto}
                            >
                                <Camera className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </button>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadProfilePhoto} />
                    </div>

                    {/* User info - hidden on small mobile */}
                    <a href="/dashboard/profile" className="hidden sm:flex flex-col items-end hover:opacity-80 transition-opacity" title="Pengaturan Profil">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{user?.roles.join(', ')}</span>
                    </a>

                    <button 
                        onClick={logout}
                        className="hidden sm:block text-sm bg-gray-50 dark:bg-[#1e2532]/90 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:text-white dark:hover:text-white transition-colors"
                    >
                        {t.logout || 'Sign out'}
                    </button>
                </div>
            </div>
            {/* Overlay to close dropdown when clicking outside */}
            {showDropdown && (
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
            )}
        </header>
    );
}
