'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function MyExamsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);

    const fetchExams = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/exam-sessions/my-exams');
            setExams(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchExams(); }, [fetchExams]);

    const handleStart = async (examId: number) => {
        setStarting(true);
        try {
            const res = await axios.post(`/api/exam-sessions/start/${examId}`);
            const sessionId = res.data.id;
            router.push(`/dashboard/exams/${sessionId}/play`);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Gagal memulai ujian');
        } finally {
            setStarting(false);
        }
    };

    const handleContinue = (sessionId: number) => {
        router.push(`/dashboard/exams/${sessionId}/play`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ujian Saya</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Daftar ujian yang tersedia untuk Anda.</p>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Memuat...</div>
            ) : exams.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                    <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Belum ada ujian</h3>
                    <p className="text-sm text-gray-500 mt-1">Belum ada ujian yang dijadwalkan untuk kelas Anda.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map((ex) => {
                        const session = ex.exam_sessions?.[0];
                        const isFinished = session?.status === 'finished';
                        const inProgress = session?.status === 'in_progress';

                        return (
                            <Card key={ex.id} className="relative overflow-hidden group bg-white/60 dark:bg-[#111620]/60 backdrop-blur-2xl border border-gray-200/50 dark:border-white/[0.08] shadow-sm hover:shadow-xl hover:shadow-red-500/5 dark:hover:border-white/[0.15] transition-all duration-300 hover:-translate-y-1 flex flex-col rounded-2xl">
                                {/* Subtle decorative glow */}
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-red-500/10 dark:bg-red-500/20 blur-2xl group-hover:bg-red-500/30 transition-all duration-500"></div>
                                
                                <CardContent className="p-5 relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-center mb-3">
                                        <Badge variant={isFinished ? 'secondary' : inProgress ? 'default' : 'outline'} className={`px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md shadow-none ${inProgress ? 'bg-amber-500 hover:bg-amber-600 border-transparent text-white' : isFinished ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'border-gray-200 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-black/20'}`}>
                                            {isFinished ? 'Selesai' : inProgress ? 'Berjalan' : 'Tersedia'}
                                        </Badge>
                                        <div className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-black/20 px-2 py-1 rounded-md">
                                            <Clock className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                            {ex.duration_minutes} Menit
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white/90 mb-1.5 leading-tight tracking-tight group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2">{ex.title}</h3>
                                    
                                    {ex.description ? (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 line-clamp-2 leading-relaxed">{ex.description}</p>
                                    ) : (
                                        <div className="mb-4"></div>
                                    )}
                                    
                                    <div className="mt-auto space-y-4">
                                        <div className="flex items-center text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/[0.03] px-3 py-2.5 rounded-xl border border-gray-100 dark:border-white/[0.05]">
                                            <BookOpen className="w-4 h-4 mr-2.5 text-red-500 opacity-90" /> 
                                            <span>Kelas <span className="font-semibold text-gray-900 dark:text-white/90">{ex.study_class?.name}</span></span>
                                        </div>

                                        {isFinished ? (
                                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                                                <div className="flex items-center text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    {ex.show_results ? 'Nilai Akhir' : 'Tuntas'}
                                                </div>
                                                {ex.show_results && (
                                                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                                                        {session?.score || '0.00'}
                                                    </span>
                                                )}
                                            </div>
                                        ) : inProgress ? (
                                            <Button onClick={() => handleContinue(session.id)} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-amber-500/25 border-0 rounded-xl h-11 transition-all hover:scale-[1.02]">
                                                Lanjutkan Ujian
                                            </Button>
                                        ) : (
                                            <Button onClick={() => handleStart(ex.id)} disabled={starting} className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold shadow-lg shadow-red-500/25 border-0 rounded-xl h-11 transition-all hover:scale-[1.02]">
                                                {starting ? 'Menyiapkan...' : 'Mulai Ujian'}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
