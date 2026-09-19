'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Clock, CheckCircle2, ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
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

export default function ExamPlayPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = use(params);
    const router = useRouter();

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({}); // question_id → answer
    const [timeLeft, setTimeLeft] = useState(0);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // ── Fetch session ─────────────────────────────────────────────────────────
    const fetchSession = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/exam-sessions/play/${sessionId}`);
            const data = res.data;
            setSession(data);

            // questions_snapshot is the ordered list of questions (no correct_answer)
            const snapshot = Array.isArray(data.questions_snapshot) ? data.questions_snapshot : JSON.parse(data.questions_snapshot || '[]');
            setQuestions(snapshot);

            // Pre-fill answers from existing student_answers
            const existing: Record<number, string> = {};
            if (Array.isArray(data.student_answers)) {
                data.student_answers.forEach((a: any) => {
                    if (a.answer !== null && a.answer !== undefined) {
                        existing[a.question_id] = a.answer;
                    }
                });
            }
            setAnswers(existing);

            // Calculate remaining time
            const startedAt = new Date(data.started_at).getTime();
            const durationMs = data.exam.duration_minutes * 60 * 1000;
            const remaining = Math.max(0, Math.floor((startedAt + durationMs - Date.now()) / 1000));
            setTimeLeft(remaining);

        } catch (e: any) {
            alert(e.response?.data?.message || 'Gagal memuat ujian. Kembali ke daftar ujian.');
            router.push('/dashboard/exams');
        } finally {
            setLoading(false);
        }
    }, [sessionId, router]);

    useEffect(() => { fetchSession(); }, [fetchSession]);

    // ── Countdown timer ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!session || session.status !== 'in_progress' || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    handleAutoFinish();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [session, timeLeft]);

    // ── Save answer (debounced for text inputs) ───────────────────────────────
    const saveAnswer = async (questionId: number, answer: string) => {
        try {
            await axios.post(`/api/exam-sessions/${sessionId}/submit`, {
                question_id: questionId,
                answer,
            });
        } catch { }
    };

    const handleAnswerChange = (questionId: number, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
        // Immediate save for multiple choice; debounce for text input
        saveAnswer(questionId, answer);
    };

    const handleTextChange = (questionId: number, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
        setSaving(true);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            await saveAnswer(questionId, answer);
            setSaving(false);
        }, 800);
    };

    // ── Finish ────────────────────────────────────────────────────────────────
    const handleAutoFinish = async () => {
        try {
            await axios.post(`/api/exam-sessions/${sessionId}/finish`);
            router.push('/dashboard/exams');
        } catch { }
    };

    const handleFinish = async () => {
        setSubmitting(true);
        try {
            const res = await axios.post(`/api/exam-sessions/${sessionId}/finish`);
            router.push('/dashboard/exams');
        } catch {
            setSubmitting(false);
            setIsConfirmOpen(false);
        }
    };

    // ── Time display ──────────────────────────────────────────────────────────
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const isWarning = timeLeft < 300; // < 5 mins

    // ── Render states ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500">Memuat ujian...</p>
            </div>
        );
    }

    if (!session || session.status === 'finished') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ujian Selesai</h2>
                <p className="text-gray-500 mt-2">Jawaban Anda telah dikumpulkan.</p>
                <Button className="mt-6 bg-red-600 hover:bg-red-700" onClick={() => router.push('/dashboard/exams')}>
                    Kembali ke Daftar Ujian
                </Button>
            </div>
        );
    }

    const currentQ = questions[currentIndex];
    if (!currentQ) return null;

    const totalAnswered = questions.filter(q => answers[q.id] && answers[q.id].trim() !== '').length;

    return (
        <div className="max-w-2xl mx-auto px-2 sm:px-4 pb-24 pt-2 animate-in fade-in">

            {/* ── Sticky Header ── */}
            <div className="sticky top-0 z-20 bg-gray-50 dark:bg-[#111827] pt-2 pb-3">
                <div className="bg-white dark:bg-[#151a23] rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <h1 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base line-clamp-1">{session.exam?.title}</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Soal {currentIndex + 1} / {questions.length} · {totalAnswered} terjawab</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono font-bold text-sm whitespace-nowrap shrink-0 ${isWarning ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                        <Clock className="w-4 h-4" />
                        {timeStr}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mt-2 overflow-hidden">
                    <div
                        className="h-full bg-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${(totalAnswered / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* ── Question Card ── */}
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white dark:bg-[#151a23] mt-4">
                <CardContent className="p-5 sm:p-7">
                    {/* Question number & text */}
                    <div className="flex items-start gap-3 mb-7">
                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                            {currentIndex + 1}
                        </div>
                        <p className="text-base sm:text-lg text-gray-900 dark:text-gray-100 font-medium leading-relaxed whitespace-pre-wrap">
                            {currentQ.question_text}
                        </p>
                    </div>

                    {/* Answer area */}
                    {currentQ.type === 'multiple_choice' ? (
                        <div className="flex flex-col gap-3">
                            {currentQ.options?.map((opt: string, i: number) => {
                                const isSelected = answers[currentQ.id] === opt;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => handleAnswerChange(currentQ.id, opt)}
                                        className={`flex items-center text-left w-full p-3.5 sm:p-4 rounded-xl border-2 transition-all duration-150 active:scale-[0.99] ${isSelected
                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/15'
                                                : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1e2532] hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mr-3.5 shrink-0 transition-all ${isSelected ? 'border-red-500 bg-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <span className={`text-sm sm:text-base ${isSelected ? 'text-red-700 dark:text-red-300 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                                            <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                                            {opt}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="pt-6 pb-2 relative">
                            <input
                                className="w-full text-2xl sm:text-3xl font-medium text-center bg-transparent border-0 border-b-2 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:ring-0 focus:border-red-500 transition-colors px-2 py-3 outline-none dark:text-white"
                                value={answers[currentQ.id] || ''}
                                placeholder="Ketik di sini..."
                                onChange={e => handleTextChange(currentQ.id, e.target.value)}
                                autoFocus
                            />
                            {saving && <p className="text-xs text-gray-400 absolute right-0 -bottom-4 animate-pulse">Menyimpan...</p>}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Navigation ── */}
            <div className="flex justify-between items-center mt-4 gap-3">
                <Button
                    variant="outline"
                    onClick={() => setCurrentIndex(p => p - 1)}
                    disabled={currentIndex === 0}
                    className="rounded-full px-5 bg-white dark:bg-[#151a23] gap-1"
                >
                    <ChevronLeft className="w-4 h-4" /> Sebelumnya
                </Button>

                {currentIndex === questions.length - 1 ? (
                    <Button
                        onClick={() => setIsConfirmOpen(true)}
                        disabled={submitting}
                        className="rounded-full px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/25"
                    >
                        {submitting ? 'Mengumpulkan...' : '✓ Selesai & Kumpul'}
                    </Button>
                ) : (
                    <Button
                        onClick={() => setCurrentIndex(p => p + 1)}
                        className="rounded-full px-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 gap-1"
                    >
                        Selanjutnya <ChevronRight className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* ── Question Navigator (Number pad) ── */}
            <div className="mt-6 bg-white dark:bg-[#151a23] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Navigasi Soal</h3>
                <div className="flex flex-wrap gap-2">
                    {questions.map((q, i) => {
                        const isAnswered = !!answers[q.id] && answers[q.id].trim() !== '';
                        const isCurrent = i === currentIndex;
                        return (
                            <button
                                key={q.id}
                                onClick={() => setCurrentIndex(i)}
                                className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${isCurrent
                                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 ring-2 ring-gray-900 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-[#151a23]'
                                        : isAnswered
                                            ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
                                            : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 dark:bg-[#1e2532] dark:border-gray-800 dark:text-gray-400'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                    <span className="inline-block w-3 h-3 rounded-sm bg-red-100 border border-red-200 dark:bg-red-900/30 dark:border-red-800 mr-1 align-middle" />Terjawab &nbsp;
                    <span className="inline-block w-3 h-3 rounded-sm bg-gray-50 border border-gray-200 dark:bg-[#1e2532] dark:border-gray-800 mr-1 align-middle" />Belum dijawab
                </p>
            </div>

            {/* Custom Confirm Dialog */}
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            Kumpulkan Ujian?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base">
                            Anda tidak bisa mengubah jawaban lagi setelah ujian dikumpulkan. Pastikan semua soal telah terjawab.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="rounded-full">Periksa Kembali</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleFinish();
                            }}
                            disabled={submitting}
                            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {submitting ? 'Memproses...' : 'Ya, Kumpulkan'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
