'use client';

import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import JapaneseOrnament from '@/components/JapaneseOrnament';
import { useState } from 'react';
import {
    LayoutDashboard, Database, GraduationCap,
    Settings, ChevronDown, ChevronRight,
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

export default function Sidebar() {
    const { hasPermission, hasRole } = useAuth();
    const { t } = useLanguage();
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<string[]>(['dashboard']); // Keep some open by default

    const toggleGroup = (nameKey: string) => {
        setOpenGroups(prev => 
            prev.includes(nameKey) 
                ? prev.filter(g => g !== nameKey)
                : [...prev, nameKey]
        );
    };

    const isAdmin = hasRole('Admin') || hasRole('Sachou') || hasRole('Staff Akademik') || hasRole('Super Admin');

    // Consolidated Navigation Structure
    const navigationGroups: NavGroup[] = [
        {
            nameKey: 'masterData',
            icon: Database,
            show: hasPermission('manage batches') || hasPermission('manage students') || hasPermission('manage classes') || hasPermission('manage roadmaps'),
            items: [
                { nameKey: 'batches', href: '/dashboard/batches', show: hasPermission('manage batches') },
                { nameKey: 'programs', href: '/dashboard/programs', show: hasPermission('manage batches') },
                { nameKey: 'students', href: '/dashboard/students', show: hasPermission('manage students') },
                { nameKey: 'roadmapProgress', href: '/dashboard/roadmap', show: hasPermission('manage roadmaps') },
                { nameKey: 'teachers', href: '/dashboard/teachers', show: hasPermission('manage students') },
            ]
        },
        {
            nameKey: 'academic',
            icon: GraduationCap,
            show: hasPermission('manage classes') || hasPermission('input attendance') || hasRole('Sensei'),
            items: [
                { nameKey: 'classes', href: '/dashboard/classes', show: hasPermission('manage classes') || hasRole('Sensei') },

                { nameKey: 'assignments', href: '/dashboard/assignments', show: hasPermission('input assignments') || hasPermission('manage classes') },
                // Admin doesn't need to see global grades/attendance in sidebar, they go through Student Detail.
                // Siswa sees it on their dashboard and profile. Sensei needs it.
                { nameKey: 'riwayatMengajar', href: '/dashboard/history', show: hasRole('Sensei') },
            ]
        },
        {
            nameKey: 'system',
            icon: Settings,
            show: true,
            items: [
                { nameKey: 'announcements', href: '/dashboard/announcements', show: true },
                { nameKey: 'messages', href: '/dashboard/messages', show: true }, // Chat feature
                { nameKey: 'users', href: '/dashboard/users', show: hasRole('Super Admin') },
                { nameKey: 'activityLogs', href: '/dashboard/activity-logs', show: hasPermission('manage users') },
                { nameKey: 'settings', href: '/dashboard/settings', show: hasPermission('manage users') || hasRole('Super Admin') },
                { nameKey: 'documents', href: '/dashboard/students/profile', show: hasRole('Siswa') },
            ]
        }
    ];

    const isDashboardActive = pathname === '/dashboard';

    return (
        <aside className="w-64 flex-shrink-0 bg-gradient-to-b from-red-900 to-red-800 dark:from-[#0d1117] dark:to-[#161b22] border-r border-red-950 dark:border-gray-800 hidden md:flex md:flex-col shadow-xl relative overflow-hidden">
            {/* Subtle background pattern - more visible on dark red */}
            <div className="absolute inset-0 bg-pattern-seigaiha opacity-[0.07] mix-blend-overlay pointer-events-none"></div>
            
            {/* Logo Section */}
            <div className="px-4 py-6 border-b border-red-800/50 dark:border-gray-800/50 flex flex-col items-center justify-center relative z-10 bg-red-900/50 dark:bg-black/20 backdrop-blur-sm">
                <div className="w-full flex justify-center hover:scale-105 transition-transform duration-300">
                    <div className="w-full flex justify-center items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src="/logo.png" 
                            alt="LPK Mirai Crown Indonesia" 
                            className="w-[90%] h-auto object-contain max-h-24 drop-shadow-sm filter"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60"><text x="10" y="40" fill="%23ffffff" font-size="18" font-weight="bold">LPK MIRAI CROWN</text></svg>';
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4 relative z-10 custom-scrollbar">
                <nav className="mt-2 flex-1 px-3 space-y-2">
                    
                    {/* Dashboard Standalone Link */}
                    <Link
                        href="/dashboard"
                        className={`${
                            isDashboardActive
                                ? 'bg-white/10 dark:bg-white/10 text-white border-l-4 border-yellow-400 font-bold shadow-md'
                                : 'text-red-100 hover:bg-white/5 dark:hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                        } group flex items-center px-4 py-3 text-sm rounded-r-xl transition-all duration-300 mb-6`}
                    >
                        <LayoutDashboard className={`mr-3 h-5 w-5 flex-shrink-0 transition-transform duration-300 ${isDashboardActive ? 'text-yellow-400 scale-110' : 'text-red-300 group-hover:text-yellow-300 group-hover:scale-110'}`} />
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
                                        isAnyChildActive && !isOpen ? 'text-white bg-white/10 dark:bg-white/10 shadow-sm' : 'text-red-100 hover:bg-white/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <div className="flex items-center">
                                        <group.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${isAnyChildActive ? 'text-yellow-400' : 'text-red-300 group-hover:text-yellow-300'}`} />
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
                                                            ? 'text-yellow-400 font-bold bg-white/5 dark:bg-white/10 shadow-sm'
                                                            : 'text-red-200 hover:text-white hover:bg-white/5 dark:hover:bg-white/5'
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
                    
                    {/* Decorative Bottom Ornament */}
                    <div className="mt-8 mb-6 flex justify-center text-red-500/30 hover:text-red-400/50 transition-colors duration-500">
                        <JapaneseOrnament type="sakura" className="w-20 h-20" />
                    </div>
                </nav>
            </div>
        </aside>
    );
}
