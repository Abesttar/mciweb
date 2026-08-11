'use client';

import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import JapaneseOrnament from '@/components/JapaneseOrnament';
import Link from 'next/link';
import { Users, BookOpen, GraduationCap, ArrowRight, Activity, Calendar, Clock, Megaphone, CheckSquare, Wallet, CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AkademikSlider from '@/components/AkademikSlider';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function DashboardPage() {
    const { user, hasRole } = useAuth();
    const { t, language } = useLanguage();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get('/api/dashboard/stats');
                setStats(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-10 bg-gray-200 rounded-md w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>)}
                </div>
                <div className="h-80 bg-gray-200 rounded-xl w-full"></div>
            </div>
        );
    }

    const isAdmin = hasRole('Admin') || hasRole('Sachou') || hasRole('Staff Dokumen') || hasRole('Super Admin');

    const statCards = [
        { 
            title: t.activeStudents || 'Siswa Aktif', 
            value: stats?.total_students || 0, 
            icon: Users, 
            color: 'bg-red-50 text-red-700',
            href: '/dashboard/students'
        },
        { 
            title: t.totalBatches || 'Total Angkatan', 
            value: stats?.active_batches || 0, 
            icon: BookOpen, 
            color: 'bg-blue-50 text-blue-600',
            href: '/dashboard/batches'
        },
        { 
            title: t.activeTeachers || 'Guru Aktif', 
            value: stats?.active_teachers || 0,
            icon: GraduationCap, 
            color: 'bg-amber-50 text-amber-600',
            href: '/dashboard/teachers'
        },
        { 
            title: 'Progress Roadmap',
            value: stats?.roadmaps?.length ? `${Math.round((stats.roadmaps.filter((r: any) => r.status === 'completed').length / stats.roadmaps.length) * 100)}%` : '0%',
            icon: Activity,
            color: 'bg-purple-50 text-purple-600',
            href: '/dashboard/students'
        },
        {
            title: 'Pembayaran',
            value: stats?.payment_summary?.total_paid ? `Rp ${(stats.payment_summary.total_paid / 1000000).toFixed(1)}Jt` : 'Rp 0',
            icon: Wallet,
            color: 'bg-emerald-50 text-emerald-600',
            href: '/dashboard/students'
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t.dashboard}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t.welcome}, {user?.name}</p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl px-4 py-2 rounded-full border shadow-sm">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date().toLocaleDateString(language === 'id' ? 'id-ID' : 'ja-JP', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>
            
            {isAdmin && (
                <>
                    {(hasRole('Sachou') || hasRole('Staff Dokumen')) && (
                        <div className="bg-gradient-to-br from-indigo-800 via-indigo-700 to-indigo-900 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden border border-indigo-600/30 mb-8">
                            <div className="absolute inset-0 bg-pattern-seigaiha opacity-20 pointer-events-none mix-blend-overlay"></div>
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-400 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                            
                            <div className="relative z-10">
                                <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-2 sm:mb-3 tracking-tight">{t.welcome}, <span className="text-indigo-300">{user?.name} {hasRole('Sachou') ? t.sachouRole : t.staffDokumenRole}</span>!</h2>
                                <p className="text-indigo-100 max-w-2xl text-base sm:text-lg font-medium leading-relaxed">
                                    {hasRole('Sachou') ? t.sachouWelcome : t.staffDokumenWelcome}
                                </p>
                            </div>
                        </div>
                    )}
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-6">
                        {statCards.map((card, idx) => (
                            <Link key={idx} href={card.href} className="group block h-full">
                                <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4 sm:p-6 transition-all duration-500 hover:border-red-400 hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden h-full">
                                    {/* Japanese Ornament Corner */}
                                    <div className="absolute -top-4 -right-4 text-red-100 opacity-50 group-hover:text-red-200 group-hover:opacity-100 transition-all duration-700 group-hover:rotate-45 group-hover:scale-125">
                                        <JapaneseOrnament type={idx % 2 === 0 ? 'sakura' : 'asanoha'} className="w-32 h-32" />
                                    </div>

                                    <div className="flex items-start justify-between relative z-10">
                                        <div>
                                            <p className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 tracking-widest uppercase">{card.title}</p>
                                            <p className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white group-hover:text-red-700 dark:text-red-400 transition-colors duration-300">{card.value}</p>
                                        </div>
                                        <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${card.color} shadow-inner bg-gradient-to-br from-white/50 to-transparent group-hover:scale-110 transition-transform duration-500`}>
                                            <card.icon className="w-6 h-6 sm:w-8 sm:h-8" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center text-sm font-medium text-red-700 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-200">
                                        <span>{t.viewDetails || 'Lihat Detail'}</span>
                                        <ArrowRight className="w-4 h-4 ml-1" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Chart Section */}
                    {stats?.chart && (
                        <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6 mt-8 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                        <Activity className="w-5 h-5 mr-2 text-red-700 dark:text-red-400" />
                                        {t.studentStats}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.studentStatsDesc}</p>
                                </div>
                            </div>
                            <div className="h-[350px] w-full">
                                <Bar 
                                    data={{
                                        labels: stats.chart.labels,
                                        datasets: [{
                                            label: 'Jumlah Siswa',
                                            data: stats.chart.data,
                                            backgroundColor: 'rgba(185, 28, 28, 0.8)', // red-700
                                            hoverBackgroundColor: 'rgba(153, 27, 27, 1)', // red-800
                                            borderRadius: 6, // rounded corners on bars
                                            barPercentage: 0.6,
                                        }]
                                    }} 
                                    options={{ 
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { display: false },
                                            tooltip: {
                                                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                                                padding: 12,
                                                titleFont: { size: 14, family: 'Inter' },
                                                bodyFont: { size: 14, family: 'Inter' },
                                                cornerRadius: 8,
                                                displayColors: false,
                                            }
                                        },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                grid: { color: '#f3f4f6' }, // Tailwind gray-100
                                                border: { display: false },
                                                ticks: { stepSize: 1, font: { family: 'Inter' } }
                                            },
                                            x: {
                                                grid: { display: false },
                                                border: { display: false },
                                                ticks: { font: { family: 'Inter' } }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </>
            )}

            {!isAdmin && hasRole('Sensei') && (
                <div className="space-y-6 sm:space-y-8 relative z-10">
                    <div className="bg-gradient-to-br from-red-800 via-red-700 to-red-900 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden border border-red-600/30">
                        <div className="absolute inset-0 bg-pattern-seigaiha opacity-20 pointer-events-none mix-blend-overlay"></div>
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-400 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                        
                        <div className="relative z-10">
                            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-2 sm:mb-3 tracking-tight">{t.welcome}, <span className="text-yellow-300">{user?.name} 先生</span>!</h2>
                            <p className="text-red-100 max-w-2xl text-base sm:text-lg font-medium leading-relaxed">{t.senseiWelcome}</p>
                        </div>
                    </div>

                    {stats?.assigned_batches && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                                <Users className="w-6 h-6 mr-2 text-red-700 dark:text-red-400" />
                                {t.assignedBatches}
                            </h2>
                            <div className="space-y-6">
                                {stats.assigned_batches.map((batch: any) => (
                                    <div key={batch.id} className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden hover-lift">
                                        <div className="bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl px-6 py-4 border-b border-gray-200 dark:border-gray-600/50 flex justify-between items-center">
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{batch.name}</h3>
                                            <span className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 text-xs font-bold px-3 py-1 rounded-full">
                                                {batch.students?.length || 0} Siswa
                                            </span>
                                        </div>
                                        <div className="p-6">
                                            {batch.students?.length === 0 ? (
                                                <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t.noStudents}</p>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                    {batch.students?.map((student: any) => (
                                                        <div key={student.id} className="border border-gray-100 dark:border-gray-700/50 rounded-lg p-4 hover:border-red-300 hover:shadow-sm transition-all">
                                                            <div className="mb-4">
                                                                <p className="font-semibold text-gray-900 dark:text-white">{student.user?.name || student.nis}</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">{student.gender || '-'} • {student.nis || 'NIS belum diisi'}</p>
                                                            </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                                                    <Link href={`/dashboard/students/${student.id}?tab=raport`} className="p-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded hover:bg-red-100 dark:bg-red-900/40 text-center flex justify-center items-center font-medium text-xs gap-1" title="Nilai">
                                                                        <BookOpen className="w-4 h-4" /> Raport
                                                                    </Link>
                                                                    <Link href={`/dashboard/assignments?student_id=${student.id}`} className="p-2 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 text-center flex justify-center items-center font-medium text-xs gap-1" title="Tugas">
                                                                        <Calendar className="w-4 h-4" /> Tugas
                                                                    </Link>
                                                                </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!isAdmin && hasRole('Siswa') && (
                <div className="space-y-6">
                    <div className="bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 rounded-2xl p-5 sm:p-8">
                        <h2 className="text-xl sm:text-2xl font-bold text-red-900 dark:text-red-100 mb-2">{t.welcome}, {user?.name}!</h2>
                        <p className="text-sm sm:text-base text-red-800 dark:text-red-200 max-w-lg mb-4 sm:mb-6">{t.studentWelcome}</p>
                        
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <Link href="/dashboard/students/profile" className="px-4 py-2 sm:px-5 sm:py-2.5 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800 shadow-sm transition-colors text-center text-sm sm:text-base">
                                {t.editProfile}
                            </Link>
                            <Link href="/dashboard/messages" className="px-4 py-2 sm:px-5 sm:py-2.5 bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800/50 rounded-lg font-medium hover:bg-red-50 dark:bg-red-950/40 shadow-sm transition-colors text-center text-sm sm:text-base">
                                {t.contactSensei}
                            </Link>
                        </div>
                    </div>

                    {/* Akademik Slider */}
                    <AkademikSlider stats={stats} studentName={user?.name || 'Siswa'} studentId={stats?.student?.id || 0} />

                    {/* Student Learning Roadmap */}
                    {stats?.student?.roadmaps && stats.student.roadmaps.length > 0 && (
                        <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm mt-8">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                                <Activity className="w-5 h-5 mr-2 text-indigo-600" />
                                Progress Pembelajaran Roadmap
                            </h3>
                            <div className="flex overflow-x-auto custom-scrollbar gap-4 pb-4">
                                {stats.student.roadmaps.map((r: any) => (
                                    <div key={r.id} className={`border rounded-xl p-4 min-w-[280px] flex-shrink-0 ${r.status === 'completed' ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50' : r.status === 'in_progress' ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900/50' : 'border-gray-100 dark:border-gray-700/50'}`}>
                                        <h4 className="font-bold text-gray-900 dark:text-white mb-2 truncate" title={r.roadmap_stage?.name}>{r.roadmap_stage?.name}</h4>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">{t.status || 'Status'}</span>
                                            {r.status === 'completed' ? (
                                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium text-xs">Selesai</span>
                                            ) : r.status === 'in_progress' ? (
                                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium text-xs">Sedang Berjalan</span>
                                            ) : (
                                                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium text-xs">Belum Dimulai</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Payment Progress - Siswa */}
                    {stats?.payment_progress && (
                        <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm mt-8">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                                <CreditCard className="w-5 h-5 mr-2 text-emerald-600" />
                                Progress Pembayaran Saya
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[1, 2, 3].map((stage) => {
                                    const data = stats.payment_progress[stage];
                                    if (!data) return null;
                                    return (
                                        <div key={stage} className={`border rounded-xl p-5 ${data.is_complete ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-900/10' : 'border-gray-100 dark:border-gray-700/50'}`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-bold text-gray-900 dark:text-white">Tahap {stage}</h4>
                                                {data.is_complete ? (
                                                    <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-semibold">Lunas</span>
                                                ) : (
                                                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-semibold">Belum Lunas</span>
                                                )}
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Dibayar:</span>
                                                    <span className="font-medium text-gray-900 dark:text-white">Rp {data.paid.toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Kekurangan:</span>
                                                    <span className={`font-medium ${data.remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>Rp {data.remaining.toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                                                    <div className={`h-2.5 rounded-full transition-all duration-1000 ${data.is_complete ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${data.percentage}%` }}></div>
                                                </div>
                                                <p className="text-xs text-right text-gray-500">{data.percentage}%</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Announcements Section */}
            {stats?.announcements && stats.announcements.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Megaphone className="w-5 h-5 mr-2 text-amber-500" />
                        {t.announcements}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stats.announcements.map((a: any) => (
                            <div 
                                key={a.id} 
                                className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl p-5 border border-amber-100 rounded-xl shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-md transition-all hover:border-amber-300"
                                onClick={() => setSelectedAnnouncement(a)}
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 group-hover:bg-amber-500 transition-colors"></div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-amber-600 transition-colors">{a.title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap line-clamp-3">{a.content}</p>
                                <div className="mt-4 text-xs font-medium text-amber-600 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {new Date(a.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>

                    <Dialog open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    <Megaphone className="w-5 h-5 text-amber-500" />
                                    {selectedAnnouncement?.title}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="mt-4 space-y-4">
                                <div className="text-sm font-medium text-amber-600 flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {selectedAnnouncement && new Date(selectedAnnouncement.created_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-100 dark:border-amber-900/50">
                                    {selectedAnnouncement?.content}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            )}
        </div>
    );
}
