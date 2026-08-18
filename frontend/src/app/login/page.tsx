'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import axios from '@/lib/axios';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await axios.post('/api/login', {
                email,
                password,
            });
            login(res.data.access_token, res.data.user);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login gagal. Periksa kembali email dan password Anda.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex w-full relative overflow-hidden bg-[#0d1117]">
            {/* Full Screen Background */}
            <div
                className="absolute inset-0 bg-cover bg-center scale-[1.05] md:scale-[1.10] transition-transform duration-[20s] ease-linear hover:scale-[1.15] opacity-70"
                style={{ backgroundImage: 'url("/login-bg.png")' }}
            />
            {/* Overall Dark Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30 dark:from-[#0d1117]/90 dark:via-[#0d1117]/70 dark:to-[#0d1117]/40" />

            {/* Left Side - Image/Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between z-10">
                <div className="relative z-10 p-12 lg:pr-16 flex flex-col h-full justify-center gap-16 max-w-xl ml-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-block">
                            <Image
                                src="/logo-login.png"
                                alt="LPK Mirai Crown Indonesia"
                                width={320}
                                height={120}
                                className="w-64 md:w-80 h-auto object-contain"
                            />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="max-w-lg space-y-4 -translate-y-8 lg:-translate-y-12"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                            Buka Jalan Menuju <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-yellow-400">Masa Depan Anda</span>
                        </h1>
                        <p className="text-gray-300 text-lg leading-relaxed">
                            Sistem Informasi Manajemen Terpadu LPK Mirai Crown Indonesia. Kelola data siswa, jadwal kelas, dan operasional dengan efisien.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-start p-8 sm:p-12 lg:pl-16 relative z-10">

                {/* Decorative Blobs */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-red-400/10 dark:bg-red-900/20 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-yellow-400/10 dark:bg-yellow-900/10 rounded-full blur-[100px] pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md relative z-10"
                >
                    <div className="bg-white/70 dark:bg-[#151a23]/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 dark:border-gray-800/50 p-8 sm:p-10">
                        {/* Mobile Logo */}
                        <div className="lg:hidden flex flex-col items-center justify-center mb-8">
                            <Image
                                src="/logo-login.png"
                                alt="LPK Mirai Crown Indonesia"
                                width={192}
                                height={80}
                                className="w-48 h-auto object-contain"
                            />
                            <h2 className="mt-4 text-center font-bold text-gray-900 dark:text-white tracking-widest text-sm uppercase">
                                LPK Mirai Crown Indonesia
                            </h2>
                        </div>

                        <div className="text-center space-y-2 mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Selamat Datang</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Silakan masuk ke akun Anda untuk melanjutkan</p>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 bg-red-50/80 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm border border-red-200/50 dark:border-red-800/50 flex items-center"
                            >
                                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 font-medium">Email</Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@mci.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="pl-10 h-12 bg-gray-50/50 dark:bg-[#1a202c]/50 border-gray-200 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 rounded-xl transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-gray-700 dark:text-gray-300 font-medium">Password</Label>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="pl-10 h-12 bg-gray-50/50 dark:bg-[#1a202c]/50 border-gray-200 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 rounded-xl transition-all"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 mt-4 bg-gradient-to-r from-red-700 to-red-500 hover:from-red-800 hover:to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                        Memproses...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        Masuk
                                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </span>
                                )}
                            </Button>
                        </form>
                    </div>

                    <p className="text-center text-xs text-gray-500 dark:text-gray-500 dark:text-gray-400 mt-8">
                        &copy; {new Date().getFullYear()} LPK Mirai Crown Indonesia. All rights reserved.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
