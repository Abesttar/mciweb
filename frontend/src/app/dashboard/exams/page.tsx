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
                            <Card key={ex.id} className="relative overflow-hidden group bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
                                <CardContent className="p-6 relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <Badge variant={isFinished ? 'secondary' : inProgress ? 'default' : 'outline'} className={`rounded-full ${inProgress ? 'bg-amber-500' : ''}`}>
                                            {isFinished ? 'Selesai' : inProgress ? 'Sedang Berjalan' : 'Tersedia'}
                                        </Badge>
                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                            <Clock className="w-3 h-3 inline mr-1" />{ex.duration_minutes} Menit
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{ex.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-2 min-h-[40px]">{ex.description}</p>
                                    
                                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-4 bg-gray-50 dark:bg-gray-800/50 p-2 rounded flex items-center">
                                        <BookOpen className="w-4 h-4 mr-2 text-indigo-500" /> Kelas: {ex.study_class?.name}
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                        {isFinished ? (
                                            <>
                                                <div className="flex items-center text-emerald-600 font-bold">
                                                    <CheckCircle2 className="w-5 h-5 mr-1" />
                                                    {ex.show_results ? `Nilai: ${session?.score || 0}` : 'Sudah Dikerjakan'}
                                                </div>
                                            </>
                                        ) : inProgress ? (
                                            <Button onClick={() => handleContinue(session.id)} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                                                Lanjutkan Ujian
                                            </Button>
                                        ) : (
                                            <Button onClick={() => handleStart(ex.id)} disabled={starting} className="w-full bg-red-600 hover:bg-red-700 font-semibold shadow-md shadow-red-500/20">
                                                {starting ? 'Memulai...' : 'Mulai Ujian'}
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
