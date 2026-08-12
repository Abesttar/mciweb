'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ClipboardList, Clock, CheckCircle, AlertCircle, Upload, FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface Assignment {
    id: number;
    title: string;
    description: string | null;
    due_date: string;
    document_path?: string;
    study_class?: { name: string; batch?: { name: string } };
    my_submission?: Submission | null;
}

interface Submission {
    id: number;
    content: string | null;
    file_path: string | null;
    original_filename: string | null;
    status: 'submitted' | 'graded' | 'late';
    grade: number | null;
    feedback: string | null;
    submitted_at: string | null;
}

export default function StudentAssignmentCard() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [submitDialog, setSubmitDialog] = useState<Assignment | null>(null);
    const [content, setContent] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showAll, setShowAll] = useState(false);

    const fetchAssignments = useCallback(async () => {
        setLoading(true);
        try {
            const [assignRes, subRes] = await Promise.all([
                axios.get('/api/assignments', { params: { per_page: 100 } }),
                axios.get('/api/assignment-submissions'),
            ]);
            const submissionsMap: Record<number, Submission> = {};
            (subRes.data || []).forEach((s: Submission & { assignment_id: number }) => {
                submissionsMap[s.assignment_id] = s;
            });
            const list = (assignRes.data.data || assignRes.data).map((a: Assignment) => ({
                ...a,
                my_submission: submissionsMap[a.id] || null,
            }));
            setAssignments(list);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

    const openSubmit = (assignment: Assignment) => {
        setSubmitDialog(assignment);
        setContent(assignment.my_submission?.content || '');
        setFile(null);
    };

    const handleSubmit = async () => {
        if (!submitDialog) return;
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('assignment_id', submitDialog.id.toString());
            if (content) formData.append('content', content);
            if (file) formData.append('file', file);

            await axios.post('/api/assignment-submissions', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success('Tugas berhasil dikumpulkan!');
            setSubmitDialog(null);
            fetchAssignments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal mengumpulkan tugas');
        } finally {
            setSubmitting(false);
        }
    };

    const getDaysLeft = (dueDate: string) => {
        const diff = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const getStatusBadge = (assignment: Assignment) => {
        const sub = assignment.my_submission;
        const daysLeft = getDaysLeft(assignment.due_date);

        if (sub?.status === 'graded') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <CheckCircle className="w-3 h-3" /> Dinilai ({sub.grade}/100)
                </span>
            );
        }
        if (sub?.status === 'submitted' || sub?.status === 'late') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <CheckCircle className="w-3 h-3" /> Sudah Dikumpulkan{sub.status === 'late' ? ' (Terlambat)' : ''}
                </span>
            );
        }
        if (daysLeft < 0) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    <AlertCircle className="w-3 h-3" /> Terlambat
                </span>
            );
        }
        if (daysLeft <= 2) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <Clock className="w-3 h-3" /> {daysLeft === 0 ? 'Hari ini!' : `${daysLeft} hari lagi`}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:text-gray-400 dark:bg-gray-700 dark:text-gray-300">
                <Clock className="w-3 h-3" /> {daysLeft} hari lagi
            </span>
        );
    };

    if (loading) return (
        <div className="bg-white dark:bg-[#151a23]/90 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}</div>
        </div>
    );

    if (assignments.length === 0) return null;

    const displayedAssignments = showAll ? assignments : assignments.slice(0, 3);
    const pendingCount = assignments.filter(a => !a.my_submission).length;

    return (
        <>
            <div className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-700/50 rounded-2xl p-5 sm:p-6 shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                            <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-base">Tugas Saya</h3>
                            {pendingCount > 0 && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">{pendingCount} tugas belum dikumpulkan</p>
                            )}
                        </div>
                    </div>
                    {pendingCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{pendingCount}</span>
                    )}
                </div>

                {/* Assignment List */}
                <div className="space-y-3">
                    {displayedAssignments.map(assignment => {
                        const isExpanded = expanded === assignment.id;
                        const sub = assignment.my_submission;
                        const daysLeft = getDaysLeft(assignment.due_date);
                        const isOverdue = daysLeft < 0 && !sub;

                        return (
                            <div
                                key={assignment.id}
                                className={`border rounded-xl transition-all duration-200 ${
                                    isOverdue
                                        ? 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10'
                                        : sub?.status === 'graded'
                                        ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/10'
                                        : sub
                                        ? 'border-blue-200 dark:border-blue-800/50 bg-blue-50/30 dark:bg-blue-900/10'
                                        : 'border-gray-100 dark:border-gray-700/50 hover:border-amber-300 dark:hover:border-amber-700'
                                }`}
                            >
                                {/* Assignment Header Row */}
                                <div
                                    className="flex items-start justify-between p-4 cursor-pointer"
                                    onClick={() => setExpanded(isExpanded ? null : assignment.id)}
                                >
                                    <div className="flex-1 min-w-0 pr-3">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{assignment.title}</p>
                                            {getStatusBadge(assignment)}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {assignment.study_class?.name} • Tenggat: <span className={isOverdue ? 'text-red-600 font-medium' : ''}>{new Date(assignment.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700/50 pt-3 space-y-3">
                                        {/* Description */}
                                        {assignment.description && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Deskripsi Tugas</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">{assignment.description}</p>
                                            </div>
                                        )}

                                        {/* Document from Sensei */}
                                        {assignment.document_path && (
                                            <a
                                                href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/storage/${assignment.document_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 hover:underline"
                                            >
                                                <FileText className="w-4 h-4" />
                                                Lihat Dokumen dari Sensei
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}

                                        {/* My Submission Result */}
                                        {sub && (
                                            <div className="bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 rounded-lg p-3 space-y-2">
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pengumpulan Saya</p>
                                                {sub.content && <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{sub.content}</p>}
                                                {sub.file_path && (
                                                    <a
                                                        href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/storage/${sub.file_path}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 hover:underline"
                                                    >
                                                        <Upload className="w-4 h-4" />
                                                        {sub.original_filename || 'Lihat File'}
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                                <p className="text-xs text-gray-400">
                                                    Dikumpulkan: {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('id-ID') : '-'}
                                                </p>
                                            </div>
                                        )}

                                        {/* Sensei Feedback */}
                                        {sub?.status === 'graded' && (
                                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-lg p-3">
                                                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">Penilaian Sensei</p>
                                                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{sub.grade ?? '-'}<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/100</span></p>
                                                {sub.feedback && <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">&ldquo;{sub.feedback}&rdquo;</p>}
                                            </div>
                                        )}

                                        {/* Submit Button */}
                                        {sub?.status !== 'graded' && (
                                            <Button
                                                size="sm"
                                                className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2"
                                                onClick={() => openSubmit(assignment)}
                                            >
                                                <Upload className="w-4 h-4" />
                                                {sub ? 'Perbarui Pengumpulan' : 'Kumpulkan Tugas'}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {assignments.length > 3 && (
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="mt-4 w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 text-center py-2 flex items-center justify-center gap-1 transition-colors"
                    >
                        {showAll ? <><ChevronUp className="w-4 h-4" /> Sembunyikan</> : <><ChevronDown className="w-4 h-4" /> Lihat {assignments.length - 3} tugas lainnya</>}
                    </button>
                )}
            </div>

            {/* Submit Dialog */}
            <Dialog open={!!submitDialog} onOpenChange={(open) => !open && setSubmitDialog(null)}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-amber-600" />
                            Kumpulkan Tugas
                        </DialogTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {submitDialog?.title} • Tenggat: {submitDialog && new Date(submitDialog.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="submission-content">Jawaban / Catatan</Label>
                            <Textarea
                                id="submission-content"
                                rows={4}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Tulis jawaban atau catatan pengumpulan tugas Anda di sini..."
                                className="resize-none"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="submission-file">Upload File (PDF, DOC, JPG, ZIP — Maks 20MB)</Label>
                            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-amber-400 transition-colors">
                                <input
                                    id="submission-file"
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                                <label htmlFor="submission-file" className="flex flex-col items-center gap-2 cursor-pointer">
                                    <Upload className="w-8 h-8 text-gray-400" />
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {file ? <span className="text-amber-600 font-medium">{file.name}</span> : 'Klik untuk pilih file'}
                                    </span>
                                    {submitDialog?.my_submission?.original_filename && !file && (
                                        <span className="text-xs text-blue-500">File sebelumnya: {submitDialog.my_submission.original_filename}</span>
                                    )}
                                </label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSubmitDialog(null)}>Batal</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || (!content && !file && !submitDialog?.my_submission)}
                            className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                        >
                            {submitting ? 'Mengumpulkan...' : <><Upload className="w-4 h-4" /> Kumpulkan</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
