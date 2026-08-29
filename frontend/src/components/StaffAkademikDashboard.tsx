'use client';

import Link from 'next/link';
import { Users, BookOpen, GraduationCap, Activity, ArrowRight, BarChart2, CheckSquare, Calendar, Clock, ChevronRight } from 'lucide-react';

interface Props {
    stats: any;
    userName: string;
}

export default function StaffAkademikDashboard({ stats, userName }: Props) {
    const activeStudents = stats?.active_students || 0;
    const inactiveStudents = stats?.inactive_students || 0;
    const totalBatches = stats?.total_batches || 0;
    const activeTeachers = stats?.active_teachers || 0;

    const roadmapProgress = stats?.roadmaps?.length
        ? Math.round((stats.roadmaps.filter((r: any) => r.status === 'completed').length / stats.roadmaps.length) * 100)
        : 0;

    const statCards = [
        { label: 'Siswa Aktif', value: activeStudents, icon: Users, iconBg: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900/50', href: '/dashboard/students' },
        { label: 'Siswa Tidak Aktif', value: inactiveStudents, icon: Users, iconBg: 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/30', border: 'border-slate-200 dark:border-slate-700/50', href: '/dashboard/students' },
        { label: 'Total Angkatan', value: totalBatches, icon: BookOpen, iconBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-900/50', href: '/dashboard/batches' },
        { label: 'Sensei Aktif', value: activeTeachers, icon: GraduationCap, iconBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900/50', href: '/dashboard/teachers' },
        { label: 'Progress Roadmap', value: `${roadmapProgress}%`, icon: Activity, iconBg: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-900/50', href: '/dashboard/roadmap' },
        { label: 'Manajemen Kelas', value: '🏫', icon: CheckSquare, iconBg: 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-900/50', href: '/dashboard/classes' },
    ];

    const quickActions = [
        { label: 'Daftar Siswa', desc: 'Tambah, lihat, dan kelola data siswa', icon: Users, href: '/dashboard/students', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100' },
        { label: 'Kelas & Nilai', desc: 'Rekap nilai dan pantau progress kelas', icon: BarChart2, href: '/dashboard/classes', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100' },
        { label: 'Angkatan', desc: 'Kelola data angkatan/batch siswa', icon: BookOpen, href: '/dashboard/batches', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100' },
        { label: 'Alumni', desc: 'Data alumni dan pencocokan kerja', icon: GraduationCap, href: '/dashboard/alumni', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100' },
        { label: 'Keberangkatan', desc: 'Status keberangkatan siswa ke Jepang', icon: Calendar, href: '/dashboard/departures', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100' },
        { label: 'Dokumen Siswa', desc: 'Pantau kelengkapan dokumen', icon: CheckSquare, href: '/dashboard/documents', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Welcome Banner */}
            <div className="relative bg-gradient-to-br from-indigo-800 via-indigo-700 to-violet-900 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden border border-indigo-600/30">
                <div className="absolute inset-0 bg-pattern-seigaiha opacity-10 pointer-events-none mix-blend-overlay" />
                <div className="absolute -top-16 -right-16 w-56 h-56 bg-violet-400 rounded-full blur-3xl opacity-20 pointer-events-none" />
                <div className="absolute -bottom-16 -left-8 w-48 h-48 bg-indigo-300 rounded-full blur-3xl opacity-10 pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-indigo-300 text-sm font-semibold tracking-widest uppercase mb-1">Staff Akademik</p>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
                            Selamat Datang, <span className="text-indigo-200">{userName}</span>! 👋
                        </h2>
                        <p className="text-indigo-100 text-sm sm:text-base font-medium max-w-lg leading-relaxed">
                            Pantau perkembangan akademik, kelola data siswa, dan awasi kegiatan belajar mengajar dengan mudah.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                        <Link href="/dashboard/students" className="px-5 py-2.5 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors text-sm text-center shadow">
                            + Tambah Siswa
                        </Link>
                        <Link href="/dashboard/classes" className="px-5 py-2.5 bg-indigo-600/60 text-white font-semibold rounded-xl hover:bg-indigo-600/80 transition-colors text-sm text-center border border-indigo-400/30">
                            Lihat Kelas
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
                {statCards.map((card, idx) => (
                    <Link key={idx} href={card.href} className="group block h-full">
                        <div className={`${card.bg} border ${card.border} rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full flex flex-col justify-between relative overflow-hidden`}>
                            <div className="flex items-start justify-between">
                                <p className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 tracking-widest uppercase leading-tight">{card.label}</p>
                                <div className={`p-2.5 rounded-xl ${card.iconBg} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                                    <card.icon className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">{card.value}</p>
                                <div className="mt-3 flex items-center text-xs font-semibold text-gray-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
                                    <span>Lihat Detail</span>
                                    <ArrowRight className="w-3.5 h-3.5 ml-1 translate-x-0 group-hover:translate-x-1 transition-transform duration-200" />
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-indigo-500" />
                    Akses Cepat
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {quickActions.map((action, idx) => (
                        <Link key={idx} href={action.href} className={`flex items-center gap-4 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 ${action.bg} transition-all duration-200 group`}>
                            <div className={`p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm ${action.color} group-hover:scale-110 transition-transform duration-200 shrink-0`}>
                                <action.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white text-sm">{action.label}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{action.desc}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 shrink-0" />
                        </Link>
                    ))}
                </div>
            </div>

            {/* Student Bar Chart */}
            {stats?.chart && (
            <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-1">
                        <BarChart2 className="w-5 h-5 mr-2 text-indigo-500" />
                        Statistik Siswa per Angkatan
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Distribusi jumlah siswa berdasarkan angkatan/batch aktif</p>
                    {(() => {
                        const MAX_BAR_HEIGHT = 128; // px
                        const maxVal = Math.max(...stats.chart.data, 1);
                        return (
                            <div className="relative">
                                {/* horizontal guide lines */}
                                <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
                                    {[100, 75, 50, 25, 0].map(pct => (
                                        <div key={pct} className="flex items-center gap-2">
                                            <span className="text-[9px] text-gray-300 dark:text-gray-600 w-4 text-right shrink-0">{Math.round(maxVal * pct / 100)}</span>
                                            <div className="flex-1 border-t border-dashed border-gray-100 dark:border-gray-700/40" />
                                        </div>
                                    ))}
                                </div>
                                {/* bars */}
                                <div className="flex items-end gap-2 ml-6 overflow-x-auto" style={{ height: `${MAX_BAR_HEIGHT + 32}px` }}>
                                    {stats.chart.labels.map((label: string, i: number) => {
                                        const barHeight = Math.round((stats.chart.data[i] / maxVal) * MAX_BAR_HEIGHT);
                                        return (
                                            <div key={i} className="flex flex-col items-center gap-1 min-w-[48px] flex-1">
                                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{stats.chart.data[i]}</span>
                                                <div
                                                    className="w-full bg-indigo-500 dark:bg-indigo-600 rounded-t-lg hover:bg-indigo-400 transition-all duration-500"
                                                    style={{ height: `${barHeight}px`, minHeight: stats.chart.data[i] > 0 ? '4px' : '0px' }}
                                                />
                                                <span className="text-[9px] text-gray-400 text-center leading-tight truncate w-full">{label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Announcements */}
            {stats?.announcements && stats.announcements.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-amber-500" />
                        Pengumuman Terbaru
                    </h2>
                    <div className="space-y-3">
                        {stats.announcements.slice(0, 3).map((a: any) => (
                            <div key={a.id} className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl p-4 border border-amber-100 dark:border-amber-900/50 rounded-xl shadow-sm relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-xl" />
                                <p className="font-bold text-gray-900 dark:text-white text-sm">{a.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{a.content}</p>
                                <p className="text-[10px] text-amber-500 mt-2 font-medium">{new Date(a.created_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
