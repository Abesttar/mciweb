'use client';

import { useState, useEffect, use } from 'react';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ExamSessionDetailsPage({ params }: { params: Promise<{ id: string, examId: string, sessionId: string }> }) {
    const { id, examId, sessionId } = use(params);
    const router = useRouter();

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDetails();
    }, [sessionId]);

    const fetchDetails = async () => {
        try {
            const res = await axios.get(`/api/exam-sessions/${sessionId}/details`);
            setSession(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Memuat detail ujian...</div>;
    if (!session) return <div className="p-8 text-center text-red-500">Sesi ujian tidak ditemukan.</div>;

    const snapshot = session.questions_snapshot || [];
    const answers = session.student_answers || [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/classes/${id}/exams/${examId}/results`)}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Detail Jawaban Siswa</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                        <span className="font-medium text-gray-700 dark:text-gray-200">{session.exam?.title}</span>
                    </p>
                </div>
            </div>

            {/* Profil Peserta & Nilai */}
            <Card className="bg-white dark:bg-[#151a23]/90 border border-gray-100 dark:border-gray-800 shadow-sm">
                <CardContent className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <User className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{session.student?.name}</h2>
                            <div className="flex gap-4 text-sm text-gray-500 mt-1">
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" /> 
                                    Mulai: {new Date(session.started_at).toLocaleString('id-ID')}
                                </span>
                                {session.status === 'finished' && (
                                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
                                        <CheckCircle2 className="w-4 h-4" /> Selesai
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="text-center sm:text-right bg-gray-50 dark:bg-[#1e2532] px-6 py-3 rounded-xl border border-gray-100 dark:border-gray-800 w-full sm:w-auto">
                        <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Total Nilai</p>
                        <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                            {session.score}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* List Jawaban */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Rincian Soal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {snapshot.map((q: any, index: number) => {
                    const ansRecord = answers.find((a: any) => a.question_id === q.id);
                    const studentAns = ansRecord?.answer || '-';
                    const isCorrect = ansRecord?.is_correct;
                    const originalQ = session.exam?.question_bank?.questions?.find((oq: any) => oq.id === q.id);
                    const correctAns = originalQ?.correct_answer || '?';

                    return (
                        <Card key={q.id} className={`overflow-hidden border-2 transition-all hover:shadow-md ${isCorrect ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-red-200 dark:border-red-900/50'} bg-white dark:bg-[#151a23]/90 backdrop-blur-xl`}>
                            {/* Header / Question Area */}
                            <div className={`p-5 sm:p-6 text-center ${isCorrect ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'bg-red-50/50 dark:bg-red-900/10'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${isCorrect ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                                        Soal #{index + 1}
                                    </span>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full bg-white/80 dark:bg-[#1e2532] border ${isCorrect ? 'text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800/50' : 'text-red-600 border-red-200 dark:text-red-400 dark:border-red-800/50'}`}>
                                        {isCorrect ? `+${q.points || 1} Poin` : '0 Poin'}
                                    </span>
                                </div>
                                <div className="min-h-[80px] flex items-center justify-center mt-4 mb-2">
                                    <p className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight whitespace-pre-wrap">
                                        {q.question_text}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Answers Comparison */}
                            <div className="p-4 border-t border-gray-100 dark:border-white/5">
                                {isCorrect ? (
                                    <div className="flex items-center justify-center p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2 shrink-0" />
                                        <span className="text-sm font-medium text-emerald-600/80 dark:text-emerald-500/80 mr-2">Jawaban Benar:</span>
                                        <span className="font-bold text-xl text-emerald-700 dark:text-emerald-400">{studentAns}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-stretch justify-between gap-3">
                                        <div className="flex-1 text-center p-3 rounded-xl bg-red-50/80 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 flex flex-col justify-center">
                                            <p className="text-[10px] sm:text-xs font-semibold text-red-400/80 uppercase tracking-wider mb-1 flex justify-center items-center gap-1">
                                                <XCircle className="w-3.5 h-3.5" /> Jawaban Siswa
                                            </p>
                                            <p className="font-bold text-xl text-red-600 dark:text-red-400 line-clamp-2">
                                                {studentAns}
                                            </p>
                                        </div>
                                        
                                        <div className="flex-1 text-center p-3 rounded-xl bg-blue-50/80 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 flex flex-col justify-center">
                                            <p className="text-[10px] sm:text-xs font-semibold text-blue-400/80 uppercase tracking-wider mb-1">
                                                Kunci Jawaban
                                            </p>
                                            <p className="font-bold text-xl text-blue-600 dark:text-blue-400 line-clamp-2">
                                                {correctAns}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    );
                })}
                </div>
            </div>
        </div>
    );
}
