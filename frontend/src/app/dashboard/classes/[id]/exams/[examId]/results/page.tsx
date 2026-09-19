'use client';

import { useState, useEffect, use } from 'react';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function ExamResultsPage({ params }: { params: Promise<{ id: string, examId: string }> }) {
    const { id, examId } = use(params);
    const router = useRouter();

    const [exam, setExam] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchResults();
    }, [examId]);

    const fetchResults = async () => {
        try {
            const res = await axios.get(`/api/exams/${examId}/results`);
            setExam(res.data.exam);
            setSessions(res.data.sessions);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Memuat hasil ujian...</div>;
    if (!exam) return <div className="p-8 text-center text-red-500">Ujian tidak ditemukan.</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/classes/${id}/exams`)}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hasil Ujian</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                        <span className="font-medium text-gray-700 dark:text-gray-200">{exam.title}</span> 
                        {' • '}{exam.study_class?.name}
                    </p>
                </div>
            </div>

            <div className="flex justify-between items-center bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Peserta Ujian</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{sessions.length} Siswa</p>
                </div>
            </div>

            {/* List Peserta */}
            {sessions.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#151a23]/90 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                    <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Belum ada siswa yang mengerjakan</h3>
                    <p className="text-sm text-gray-500 mt-1">Hasil ujian akan muncul di sini.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map(session => (
                        <Card key={session.id} className="bg-white dark:bg-[#151a23]/90 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                        <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{session.student?.name}</h3>
                                        <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" /> 
                                                {new Date(session.started_at).toLocaleString('id-ID')}
                                            </span>
                                            {session.status === 'finished' && (
                                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 border-gray-100 dark:border-gray-800 pt-3 sm:pt-0 mt-2 sm:mt-0">
                                    <div className="text-left sm:text-right">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Total Nilai</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                                            {session.score} <span className="text-sm text-gray-500 font-normal">Poin</span>
                                        </p>
                                    </div>
                                    <Button 
                                        onClick={() => router.push(`/dashboard/classes/${id}/exams/${examId}/results/${session.id}`)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5"
                                    >
                                        Detail Jawaban <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
