'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileSidebar from '@/components/MobileSidebar';
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-700"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-japanese-landscape flex flex-col relative">
            {/* Japanese Landscape Background */}
            <div className="fixed inset-0 bg-japanese-landscape z-0" />
            
            {/* Overlay to ensure text readability */}
            <div className="fixed inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-[2px] z-0" />

            <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '12px', background: '#333', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
            
            <Header onMenuToggle={() => setMobileMenuOpen(prev => !prev)} />
            
            {/* Mobile Sidebar */}
            <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
            
            <div className="flex-1 flex overflow-hidden relative z-10">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
