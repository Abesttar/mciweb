'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { Clock, CheckCircle2, ChevronLeft, ChevronRight, Check, AlertCircle, Lock, Shield, Maximize } from 'lucide-react';
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

// ── Violation Overlay (shown when exam is locked) ───────────────────────────
function ViolationOverlay({ violations, autoFinished }: { violations: number, autoFinished: boolean }) {
    return (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${autoFinished ? 'bg-red-900/50' : 'bg-orange-900/50'}`}>
                <Lock className={`w-10 h-10 ${autoFinished ? 'text-red-400' : 'text-orange-400'}`} />
            </div>

            {autoFinished ? (
                <>
                    <h2 className="text-2xl font-bold text-white mb-2">Ujian Dihentikan</h2>
                    <p className="text-red-400 font-semibold text-lg mb-3">3/3 Pelanggaran Tercatat</p>
                    <p className="text-gray-400 text-sm max-w-xs">
                        Ujian Anda otomatis diselesaikan karena melebihi batas pelanggaran. Nilai berdasarkan jawaban yang sudah diisi.
                    </p>
                    <div className="mt-6 w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                </>
            ) : (
                <>
                    <h2 className="text-2xl font-bold text-white mb-2">Ujian Terkunci</h2>
                    <p className="text-orange-400 font-semibold text-lg mb-3">Pelanggaran {violations}/3</p>
                    <p className="text-gray-400 text-sm max-w-xs mb-6">
                        Anda terdeteksi keluar dari halaman ujian. Hubungi pengawas untuk melanjutkan.
                    </p>
                    <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                        <span className="text-orange-300 text-sm font-medium">Menunggu izin pengawas...</span>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Fullscreen Prompt (shown before exam starts) ────────────────────────────
function FullscreenPrompt({ onEnter }: { onEnter: () => void }) {
    return (
        <div className="fixed inset-0 z-[9998] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center">
            <div className="bg-white/10 border border-white/20 rounded-3xl p-8 max-w-sm w-full">
                <div className="w-16 h-16 rounded-2xl bg-red-600/20 flex items-center justify-center mx-auto mb-5">
                    <Shield className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Mode Ujian Aman</h2>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    Ujian akan dibuka dalam mode <strong className="text-white">layar penuh</strong>. Berpindah tab atau keluar layar akan dicatat sebagai pelanggaran (maks. 3×).
                </p>
                <Button
                    onClick={onEnter}
                    className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold h-12 gap-2"
                >
                    <Maximize className="w-5 h-5" />
                    Mulai Ujian
                </Button>
            </div>
        </div>
    );
}

export default function ExamPlayPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = use(params);
    const router = useRouter();

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Anti-cheat states
    const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
    const [isLocked, setIsLocked] = useState(false);
    const [violations, setViolations] = useState(0);
    const [autoFinished, setAutoFinished] = useState(false);
    const isViolatingRef = useRef(false); // prevent duplicate calls
    const examStartedRef = useRef(false);
    const isEnteringFullscreenRef = useRef(false); // ignore blur during fullscreen transition
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // ── Fetch session ─────────────────────────────────────────────────────────
    const fetchSession = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/exam-sessions/play/${sessionId}`);
            const data = res.data;
            setSession(data);
            setViolations(data.violations ?? 0);
            setIsLocked(data.is_locked ?? false);

            const snapshot = Array.isArray(data.questions_snapshot)
                ? data.questions_snapshot
                : JSON.parse(data.questions_snapshot || '[]');
            setQuestions(snapshot);

            const existing: Record<number, string> = {};
            if (Array.isArray(data.student_answers)) {
                data.student_answers.forEach((a: any) => {
                    if (a.answer !== null && a.answer !== undefined) {
                        existing[a.question_id] = a.answer;
                    }
                });
            }
            setAnswers(existing);

            const startedAt = new Date(data.started_at).getTime();
            const durationMs = data.exam.duration_minutes * 60 * 1000;
            const remaining = Math.max(0, Math.floor((startedAt + durationMs - Date.now()) / 1000));
            setTimeLeft(remaining);

        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal memuat ujian.');
            router.push('/dashboard/exams');
        } finally {
            setLoading(false);
        }
    }, [sessionId, router]);

    useEffect(() => { fetchSession(); }, [fetchSession]);

    // ── Sync is_locked from session ───────────────────────────────────────────
    useEffect(() => {
        if (session) {
            setIsLocked(session.is_locked ?? false);
            setViolations(session.violations ?? 0);
        }
    }, [session]);

    // ── If session already locked on page load, skip fullscreen prompt ────────
    useEffect(() => {
        if (session && session.is_locked && showFullscreenPrompt) {
            setShowFullscreenPrompt(false);
            examStartedRef.current = true; // polling requires this to be true
        }
    }, [session, showFullscreenPrompt]);


    // ── Poll when locked (every 5s, check if unlocked by sensei) ─────────────
    useEffect(() => {
        if (isLocked && !autoFinished) {
            pollIntervalRef.current = setInterval(async () => {
                if (isViolatingRef.current) return; // Wait until violation request completes
                try {
                    const res = await axios.get(`/api/exam-sessions/play/${sessionId}`);
                    const data = res.data;
                    if (!data.is_locked) {
                        setIsLocked(false);
                        setSession(data);
                        // Re-enter fullscreen after unlock
                        try { await document.documentElement.requestFullscreen(); } catch { }
                    }
                } catch { }
            }, 5000);
        } else {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
        return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
    }, [isLocked, autoFinished, sessionId]);

    // ── Countdown timer ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!session || session.status !== 'in_progress' || timeLeft <= 0 || isLocked) return;

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
    }, [session, timeLeft, isLocked]);

    // ── Violation handler ─────────────────────────────────────────────────────
    const handleViolation = useCallback(async () => {
        if (isViolatingRef.current || !examStartedRef.current) return;
        if (!session || session.status !== 'in_progress') return;

        isViolatingRef.current = true;
        setIsLocked(true); // Lock immediately for instant feedback!

        try {
            const res = await axios.post(`/api/exam-sessions/${sessionId}/violation`);
            const data = res.data;
            setViolations(data.violations);

            if (data.auto_finished) {
                setAutoFinished(true);
                // Exit fullscreen before redirecting
                try { await document.exitFullscreen(); } catch { }
                setTimeout(() => router.push('/dashboard/exams'), 4000);
            }
            
            // Release lock on violation state
            setTimeout(() => { isViolatingRef.current = false; }, 3000);

        } catch (error: any) {
            const errorMessage = error.response?.data?.message || '';
            
            // If the server says the exam is already finished, don't show an error loop! Just redirect them out.
            if (errorMessage.toLowerCase().includes('selesai') || error.response?.status === 403 || error.response?.status === 400) {
                setAutoFinished(true);
                examStartedRef.current = false; // Prevent unmount hook from firing
                isViolatingRef.current = false;
                try { await document.exitFullscreen(); } catch { }
                router.push('/dashboard/exams');
                return;
            }

            // Use toast instead of browser alert for better UI
            toast.error(errorMessage || 'Gagal terhubung ke server');

            // API failed: revert local lock so they don't get stuck without teacher seeing it
            setIsLocked(false);
            
            // Silently retry after 5s to sync with server
            setTimeout(() => { 
                isViolatingRef.current = false; 
                if (examStartedRef.current) handleViolation(); // Retry
            }, 5000);
        }
    }, [session, sessionId, router]);


    // ── Anti-cheat listeners ──────────────────────────────────────────────────
    useEffect(() => {
        const handleViolationTrigger = () => {
            if (!examStartedRef.current || isLocked || isEnteringFullscreenRef.current) return;
            handleViolation();
        };

        const handleVisibility = () => {
            if (document.hidden && !isEnteringFullscreenRef.current) handleViolationTrigger();
        };
        const handleFullscreenChange = () => {
            const isFullscreen = document.fullscreenElement || 
                                 (document as any).webkitFullscreenElement || 
                                 (document as any).mozFullScreenElement || 
                                 (document as any).msFullscreenElement;
            if (!isFullscreen) handleViolationTrigger();
        };
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (examStartedRef.current && !isLocked && timeLeft > 0) {
                // Try to send violation synchronously before unload
                navigator.sendBeacon(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/exam-sessions/${sessionId}/violation`);
                handleViolationTrigger();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('blur', handleViolationTrigger);
        window.addEventListener('pagehide', handleViolationTrigger);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            // Only remove listeners — do NOT trigger violation here.
            // Cleanup runs on every re-render when deps change, not just unmount!
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('blur', handleViolationTrigger);
            window.removeEventListener('pagehide', handleViolationTrigger);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [handleViolation, isLocked, autoFinished, timeLeft]);

    // ── On TRUE unmount (Next.js navigation) — trigger violation ───────────────
    const handleViolationRef = useRef(handleViolation);
    useEffect(() => { handleViolationRef.current = handleViolation; }, [handleViolation]);

    useEffect(() => {
        return () => {
            // This cleanup ONLY runs on true component unmount (navigation away)
            if (examStartedRef.current && !isViolatingRef.current) {
                handleViolationRef.current();
            }
        };
    }, []); // empty deps = only on unmount

    // ── Enter fullscreen & start exam ─────────────────────────────────────────
    const handleEnterFullscreen = async () => {
        // Set flag: ignore blur/fullscreenchange events during this transition
        isEnteringFullscreenRef.current = true;
        try {
            const el = document.documentElement as any;
            if (el.requestFullscreen) {
                await el.requestFullscreen();
            } else if (el.webkitRequestFullscreen) {
                await el.webkitRequestFullscreen();
            } else if (el.mozRequestFullScreen) {
                await el.mozRequestFullScreen();
            } else if (el.msRequestFullscreen) {
                await el.msRequestFullscreen();
            }
        } catch {
            // Mobile fallback: fullscreen not supported but continue anyway
        }
        examStartedRef.current = true;
        setShowFullscreenPrompt(false);
        // Give browser 1.5s to settle fullscreen transition before enabling anti-cheat
        setTimeout(() => {
            isEnteringFullscreenRef.current = false;
        }, 1500);
    };

    // ── Save answer ───────────────────────────────────────────────────────────
    const saveAnswer = async (questionId: number, answer: string) => {
        try {
            await axios.post(`/api/exam-sessions/${sessionId}/submit`, { question_id: questionId, answer });
        } catch { }
    };

    const handleAnswerChange = (questionId: number, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
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
            examStartedRef.current = false; // Disable anti-cheat unmount trigger
            await axios.post(`/api/exam-sessions/${sessionId}/finish`);
            try { await document.exitFullscreen(); } catch { }
            router.push('/dashboard/exams');
        } catch { }
    };

    const handleFinish = async () => {
        setSubmitting(true);
        try {
            examStartedRef.current = false; // Disable anti-cheat unmount trigger
            await axios.post(`/api/exam-sessions/${sessionId}/finish`);
            try { await document.exitFullscreen(); } catch { }
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
    const isWarning = timeLeft < 300;

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

    // Adaptive question text size
    const qLen = currentQ.question_text?.length || 0;
    const questionTextClass = qLen <= 3
        ? 'text-5xl sm:text-7xl lg:text-8xl font-bold text-center'
        : qLen <= 10
        ? 'text-4xl sm:text-5xl lg:text-6xl font-bold text-center'
        : qLen <= 30
        ? 'text-2xl sm:text-3xl lg:text-4xl font-semibold text-center'
        : 'text-base sm:text-lg lg:text-xl font-medium text-left';

    return (
        <>
            {/* Global style to hide layout elements during exam */}
            <style dangerouslySetInnerHTML={{ __html: `
                /* Hide sidebar */
                aside { display: none !important; }
                /* Hide hamburger menu */
                header button:has(svg.lucide-menu) { display: none !important; }
                header button.lg\\:hidden { display: none !important; }
                /* Hide notification bell */
                header button:has(svg.lucide-bell) { display: none !important; }
                header button:has(.lucide-bell) { display: none !important; }
                /* Disable profile link */
                header a[href="/dashboard/profile"] { pointer-events: none !important; }
                /* Adjust main padding since sidebar is gone */
                main { padding: 0 !important; }
                .flex-1.flex.overflow-hidden { display: block !important; overflow: auto !important; }
            `}} />

            {/* Fullscreen prompt overlay (before exam starts) */}
            {showFullscreenPrompt && <FullscreenPrompt onEnter={handleEnterFullscreen} />}

            {/* Violation / locked overlay */}
            {isLocked && <ViolationOverlay violations={violations} autoFinished={autoFinished} />}

            <div className="max-w-2xl lg:max-w-5xl mx-auto px-2 sm:px-4 pb-24 pt-2 animate-in fade-in">

                {/* ── Sticky Header ── */}
                <div className="sticky top-0 z-20 pt-2 pb-3 backdrop-blur-md -mx-2 px-2 sm:mx-0 sm:px-0">
                    <div className="bg-white/95 dark:bg-[#151a23]/95 rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <h1 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base line-clamp-1">{session.exam?.title}</h1>
                            <p className="text-xs text-gray-400 mt-0.5">Soal {currentIndex + 1} / {questions.length} · {totalAnswered} terjawab</p>
                        </div>
                        {/* Violation badge */}
                        {violations > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full shrink-0">
                                <AlertCircle className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{violations}/3</span>
                            </div>
                        )}
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

                {/* ── Desktop Two-Column Layout Wrapper ── */}
                <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start">

                    {/* ── Question + Answer (left column) ── */}
                    <div>
                        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white dark:bg-[#151a23] mt-4">
                            <CardContent className="p-5 sm:p-7">
                                {/* Question number & text */}
                                <div className="flex flex-col items-center justify-center gap-4 mb-8">
                                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold text-sm flex items-center justify-center shrink-0">
                                        {currentIndex + 1}
                                    </div>
                                    <p className={`${questionTextClass} text-gray-900 dark:text-gray-100 leading-snug whitespace-pre-wrap w-full`}>
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
                                    <div className="pt-6 pb-2 relative max-w-sm mx-auto">
                                        <input
                                            className="w-full text-lg sm:text-xl font-medium text-center bg-transparent border-0 border-b-2 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:ring-0 focus:border-red-500 transition-colors px-2 py-3 outline-none dark:text-white"
                                            value={answers[currentQ.id] || ''}
                                            placeholder="Ketik jawaban..."
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
                    </div>

                    {/* ── Right Column: Navigation Grid ── */}
                    <div className="mt-4 lg:mt-4">
                        <div className="bg-white dark:bg-[#151a23] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 lg:sticky lg:top-28">
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

                            {/* Desktop: finish button */}
                            <div className="hidden lg:block mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                {currentIndex === questions.length - 1 ? (
                                    <Button
                                        onClick={() => setIsConfirmOpen(true)}
                                        disabled={submitting}
                                        className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                    >
                                        {submitting ? 'Mengumpulkan...' : '✓ Selesai & Kumpul'}
                                    </Button>
                                ) : (
                                    <p className="text-xs text-center text-gray-400">
                                        {questions.length - totalAnswered} soal belum dijawab
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>{/* end desktop two-column */}

                {/* Confirm Dialog */}
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
                                onClick={(e) => { e.preventDefault(); handleFinish(); }}
                                disabled={submitting}
                                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {submitting ? 'Memproses...' : 'Ya, Kumpulkan'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </>
    );
}
