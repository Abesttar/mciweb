'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from '@/lib/axios';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await axios.post('/api/login', { email, password });
            login(res.data.access_token, res.data.user);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login gagal. Periksa kembali email dan password Anda.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-gray-50 dark:bg-[#0d1117]">
            {/* Left Side - Branding (desktop only) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-700 via-red-800 to-red-900 relative overflow-hidden flex-col items-center justify-center p-12">
                {/* Decorative circles */}
                <div className="absolute top-0 left-0 w-80 h-80 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-black/10 rounded-full translate-x-1/3 translate-y-1/3" />
                <div className="absolute top-1/2 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-1/3 -translate-y-1/2" />

                <div className="relative z-10 flex flex-col items-center text-center gap-10 max-w-md">
                    {/* Logo */}
                    <div className="bg-white rounded-3xl p-6 shadow-2xl">
                        <img
                            src="/logo.png"
                            alt="LPK Mirai Crown Indonesia"
                            className="w-40 h-auto object-contain"
                            onError={(e: any) => { e.target.style.display = 'none'; }}
                        />
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-bold text-white leading-tight">
                            Buka Jalan Menuju<br />
                            <span className="text-yellow-300">Masa Depan Anda</span>
                        </h1>
                        <p className="text-red-100 text-base leading-relaxed">
                            Sistem Informasi Manajemen Terpadu LPK Mirai Crown Indonesia.
                            Kelola data siswa, jadwal kelas, dan operasional dengan efisien.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-8 mt-4">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-white">100+</p>
                            <p className="text-red-200 text-sm">Siswa Aktif</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div className="text-center">
                            <p className="text-3xl font-bold text-white">10+</p>
                            <p className="text-red-200 text-sm">Tenaga Pengajar</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div className="text-center">
                            <p className="text-3xl font-bold text-white">5+</p>
                            <p className="text-red-200 text-sm">Program Kelas</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex justify-center mb-8">
                        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 inline-block">
                            <img
                                src="/logo.png"
                                alt="LPK Mirai Crown Indonesia"
                                className="h-14 w-auto object-contain"
                                onError={(e: any) => { e.target.style.display = 'none'; }}
                            />
                        </div>
                    </div>

                    {/* Card */}
                    <div className="bg-white dark:bg-[#151a23] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 sm:p-10">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Selamat Datang</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                Silakan masuk ke akun Anda untuk melanjutkan
                            </p>
                        </div>

                        {error && (
                            <div className="mb-5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm border border-red-100 dark:border-red-800/50 flex items-start gap-2">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                                    Alamat Email
                                </Label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </span>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@mci.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="pl-10 h-11 bg-gray-50 dark:bg-[#1a202c] border-gray-200 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 rounded-xl transition-all text-sm"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                                    Password
                                </Label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </span>
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="pl-10 pr-10 h-11 bg-gray-50 dark:bg-[#1a202c] border-gray-200 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 rounded-xl transition-all text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        {showPassword ? (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-11 mt-2 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-xl shadow-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                        Memproses...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        Masuk ke Sistem
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </span>
                                )}
                            </Button>
                        </form>
                    </div>

                    <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
                        &copy; {new Date().getFullYear()} LPK Mirai Crown Indonesia. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
