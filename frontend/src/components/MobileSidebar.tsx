'use client';

import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import JapaneseOrnament from '@/components/JapaneseOrnament';
import { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard, Database, GraduationCap,
    Settings, ChevronDown, ChevronRight, X, LogOut
} from 'lucide-react';

interface NavItem {
    nameKey: string;
    href: string;
    show: boolean;
    icon?: any;
}

interface NavGroup {
    nameKey: string;
    icon: any;
    items: NavItem[];
    show: boolean;
}

interface MobileSidebarProps {
    open: boolean;
    onClose: () => void;
}

export default function MobileSidebar({ open, onClose }: MobileSidebarProps) {
    const { hasPermission, hasRole } = useAuth();
    const { t } = useLanguage();
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<string[]>(['dashboard']);
    const prevPathname = useRef(pathname);

    // Close sidebar when route changes, but not on initial mount
    useEffect(() => {
        if (prevPathname.current !== pathname) {
            onClose();
            prevPathname.current = pathname;
        }
    }, [pathname, onClose]);

    const toggleGroup = (nameKey: string) => {
        setOpenGroups(prev => 
            prev.includes(nameKey) 
                ? prev.filter(g => g !== nameKey)
                : [...prev, nameKey]
        );
    };

    const isAdmin = hasRole('Admin') || hasRole('Sachou') || hasRole('Staff Dokumen') || hasRole('Super Admin');

    const navigationGroups: NavGroup[] = [
        {
            nameKey: 'masterData',
            icon: Database,
            show: hasPermission('manage batches') || hasPermission('manage students') || hasPermission('manage classes') || hasPermission('manage roadmaps'),
            items: [
                { nameKey: 'batches', href: '/dashboard/batches', show: hasPermission('manage batches') },
                { nameKey: 'students', href: '/dashboard/students', show: hasPermission('manage students') },
                { nameKey: 'roadmapProgress', href: '/dashboard/roadmap', show: hasPermission('manage roadmaps') },
                { nameKey: 'teachers', href: '/dashboard/teachers', show: hasPermission('manage students') },
            ]
        },
        {
            nameKey: 'academic',
            icon: GraduationCap,
            show: hasPermission('manage classes') || hasPermission('view own schedules') || hasPermission('input attendance') || hasRole('Sensei'),
            items: [
                { nameKey: 'classes', href: '/dashboard/classes', show: hasPermission('manage classes') || hasRole('Sensei') },
                { nameKey: 'schedules', href: '/dashboard/schedules', show: hasPermission('manage schedules') || hasPermission('view own schedules') },
                { nameKey: 'assignments', href: '/dashboard/assignments', show: hasPermission('input assignments') || hasPermission('manage classes') },
            ]
        },
        {
            nameKey: 'system',
            icon: Settings,
            show: true,
            items: [
                { nameKey: 'announcements', href: '/dashboard/announcements', show: true },
                { nameKey: 'messages', href: '/dashboard/messages', show: true },
                { nameKey: 'users', href: '/dashboard/users', show: hasRole('Super Admin') },
                { nameKey: 'activityLogs', href: '/dashboard/activity-logs', show: hasPermission('manage users') },
                { nameKey: 'settings', href: '/dashboard/settings', show: hasPermission('manage users') || hasRole('Super Admin') },
                { nameKey: 'documents', href: '/dashboard/students/profile', show: hasRole('Siswa') },
            ]
        }
    ];

    const isDashboardActive = pathname === '/dashboard';

    if (!open) return null;

    return (
        <>
            {/* Backdrop overlay */}
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
                onClick={onClose}
            />
            
            {/* Sidebar panel */}
            <aside className={`fixed inset-y-0 left-0 w-64 sm:w-72 bg-gradient-to-b from-red-900 to-red-800 dark:from-[#0d1117] dark:to-[#161b22] z-50 md:hidden flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Background pattern */}
                <div className="absolute inset-0 bg-pattern-seigaiha opacity-[0.07] mix-blend-overlay pointer-events-none"></div>
                
                {/* Close button + Logo */}
                <div className="px-4 py-4 border-b border-red-800/50 dark:border-gray-800/50 flex items-center justify-between relative z-10 bg-red-900/50 dark:bg-black/20 backdrop-blur-sm">
                    <div className="flex-1 flex justify-center">
                        <img 
                            src="/logo.png" 
                            alt="LPK Mirai Crown Indonesia" 
                            className="w-[70%] h-auto object-contain max-h-20 drop-shadow-xl"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60"><text x="10" y="40" fill="%23ffffff" font-size="18" font-weight="bold">LPK MIRAI CROWN</text></svg>';
                            }}
                        />
                    </div>
                    <button 
                        onClick={onClose}
                        className="absolute top-3 right-3 p-2 text-red-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col overflow-y-auto pt-4 pb-4 relative z-10 custom-scrollbar">
                    <nav className="flex-1 px-3 space-y-2">
                        {/* Dashboard Standalone Link */}
                        <Link
                            href="/dashboard"
                            className={`${
                                isDashboardActive
                                    ? 'bg-white/10 text-white border-l-4 border-yellow-400 font-bold shadow-md'
                                    : 'text-red-100 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                            } group flex items-center px-4 py-3 text-sm rounded-r-xl transition-all duration-300 mb-4`}
                        >
                            <LayoutDashboard className={`mr-3 h-5 w-5 flex-shrink-0 ${isDashboardActive ? 'text-yellow-400' : 'text-red-300'}`} />
                            <span className="tracking-wide">{t['dashboard']}</span>
                        </Link>

                        {/* Grouped Links */}
                        {navigationGroups.filter(g => g.show).map((group) => {
                            const visibleItems = group.items.filter(item => item.show);
                            if (visibleItems.length === 0) return null;

                            const isOpen = openGroups.includes(group.nameKey);
                            const isAnyChildActive = visibleItems.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));

                            return (
                                <div key={group.nameKey} className="space-y-1 mb-2">
                                    <button
                                        onClick={() => toggleGroup(group.nameKey)}
                                        className={`w-full group flex items-center justify-between px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                                            isAnyChildActive && !isOpen ? 'text-white bg-white/10 shadow-sm' : 'text-red-100 hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center">
                                            <group.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isAnyChildActive ? 'text-yellow-400' : 'text-red-300'}`} />
                                            <span className="tracking-wide uppercase text-xs opacity-90">{(t as any)[group.nameKey] || group.nameKey}</span>
                                        </div>
                                        {isOpen ? (
                                            <ChevronDown className="h-4 w-4 text-red-300" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-red-300" />
                                        )}
                                    </button>
                                    
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                        <div className="space-y-1 pl-11 pr-2 pb-2">
                                            {visibleItems.map((item) => {
                                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                                return (
                                                    <Link
                                                        key={item.nameKey}
                                                        href={item.href}
                                                        className={`${
                                                            isActive
                                                                ? 'text-yellow-400 font-bold bg-white/5 shadow-sm'
                                                                : 'text-red-200 hover:text-white hover:bg-white/5'
                                                        } group flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200`}
                                                    >
                                                        <span className="relative">
                                                            {(t as any)[item.nameKey] || item.nameKey}
                                                            {isActive && (
                                                                <span className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]"></span>
                                                            )}
                                                        </span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* Logout button for mobile */}
                        <div className="mt-8 px-4">
                            <button 
                                onClick={logout}
                                className="w-full flex items-center justify-center px-4 py-3 bg-red-950/50 hover:bg-red-950 text-red-100 hover:text-white rounded-xl border border-red-800/50 transition-colors shadow-sm"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                <span className="font-semibold">{t.logout || 'Sign out'}</span>
                            </button>
                        </div>

                        {/* Decorative Bottom Ornament */}
                        <div className="mt-6 mb-4 flex justify-center text-red-500/30">
                            <JapaneseOrnament type="sakura" className="w-16 h-16" />
                        </div>
                    </nav>
                </div>
            </aside>
        </>
    );
}
