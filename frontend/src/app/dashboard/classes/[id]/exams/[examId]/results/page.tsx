'use client';

import { useState, useEffect, use } from 'react';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Clock, CheckCircle2, ChevronRight, AlertTriangle, Lock, LockOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function SessionTimer({ startedAt, durationMinutes }: { startedAt: string, durationMinutes: number }) {
    const [timeLeft, setTimeLeft] = useState<number>(0);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const start = new Date(startedAt).getTime();
            const durationMs = durationMinutes * 60 * 1000;
            const remaining = Math.max(0, Math.floor((start + durationMs - Date.now()) / 1000));
            setTimeLeft(remaining);
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(interval);
    }, [startedAt, durationMinutes]);

    if (timeLeft <= 0) return <span className="text-red-500 font-medium">Waktu Habis</span>;

    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    
    return <span className="text-orange-600 dark:text-orange-400 font-semibold animate-pulse">{timeStr} tersisa</span>;
}

export default function ExamResultsPage({ params }: { params: Promise<{ id: string, examId: string }> }) {
    const { id, examId } = use(params);
    const router = useRouter();

    const [exam, setExam] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [unlockingId, setUnlockingId] = useState<number | null>(null);

    // Fetch initial data
    useEffect(() => {
        fetchResults();
    }, [examId]);

    // Polling every 10 seconds for real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            fetchResults(false);
        }, 10000);
        return () => clearInterval(interval);
    }, [examId]);

    const fetchResults = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const res = await axios.get(`/api/exams/${examId}/results`);
            setExam(res.data.exam);
            setSessions(res.data.sessions);
        } catch (e) {
            console.error(e);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const [unlockTarget, setUnlockTarget] = useState<number | null>(null);

    const handleUnlockConfirm = async () => {
        if (!unlockTarget) return;
        setUnlockingId(unlockTarget);
        try {
            await axios.post(`/api/exam-sessions/${unlockTarget}/unlock`);
            toast.success('Kunci ujian berhasil dibuka!');
            await fetchResults(false);
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal membuka kunci ujian.');
        } finally {
            setUnlockingId(null);
            setUnlockTarget(null);
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hasil & Pengawasan Ujian</h1>
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
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    Live Update (10s)
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
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900 dark:text-white">{session.student?.name}</h3>
                                            
                                            {/* Anti-cheat Badges */}
                                            {session.violations >= 3 ? (
                                                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                                                    <Lock className="w-3 h-3" /> Dikunci Permanen
                                                </span>
                                            ) : session.is_locked ? (
                                                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                                                    <Lock className="w-3 h-3" /> Terkunci
                                                </span>
                                            ) : session.violations > 0 ? (
                                                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                                                    <AlertTriangle className="w-3 h-3" /> {session.violations} Pelanggaran
                                                </span>
                                            ) : null}
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" /> 
                                                Mulai: {new Date(session.started_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                            {session.status === 'finished' ? (
                                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5 text-orange-500" /> 
                                                    <SessionTimer startedAt={session.started_at} durationMinutes={exam.duration_minutes} />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 border-gray-100 dark:border-gray-800 pt-3 sm:pt-0 mt-2 sm:mt-0">
                                    
                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        {session.is_locked && Number(session.violations) < 3 && (
                                            <Button 
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setUnlockTarget(session.id)}
                                                disabled={unlockingId === session.id}
                                                className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                            >
                                                {unlockingId === session.id ? 'Membuka...' : (
                                                    <><LockOpen className="w-4 h-4 mr-1" /> Buka Kunci</>
                                                )}
                                            </Button>
                                        )}

                                        
                                        <Button 
                                            size="sm"
                                            onClick={() => router.push(`/dashboard/classes/${id}/exams/${examId}/results/${session.id}`)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4"
                                        >
                                            Detail <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                    
                                    {/* Score */}
                                    <div className="text-right ml-2 border-l border-gray-100 dark:border-gray-800 pl-4">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Nilai</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {session.score}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
            
            <AlertDialog open={unlockTarget !== null} onOpenChange={(open) => !open && setUnlockTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Buka Kunci</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin membuka kunci ujian untuk siswa ini? Siswa akan dapat melanjutkan ujiannya dari bagian terakhir yang ditinggalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={unlockingId !== null}>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUnlockConfirm} disabled={unlockingId !== null}>
                            {unlockingId !== null ? 'Membuka...' : 'Buka Kunci'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
