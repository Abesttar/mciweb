'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { FileText, ExternalLink, CheckCircle, Clock, AlertCircle, ClipboardList, Star } from 'lucide-react';

interface StudyClass {
    id: number;
    name: string;
    teacher?: { name: string };
    batch?: { name: string };
}

interface Student {
    id: number;
    name?: string;
    user?: { name: string };
}

interface Assignment {
    id: number;
    study_class_id: number;
    student_id: number | null;
    title: string;
    description: string | null;
    due_date: string;
    document_path?: string;
    study_class?: StudyClass;
    student?: Student;
}

interface Submission {
    id: number;
    assignment_id: number;
    student_id: number;
    content: string | null;
    file_path: string | null;
    original_filename: string | null;
    status: 'submitted' | 'graded' | 'late';
    grade: number | null;
    feedback: string | null;
    submitted_at: string | null;
    student?: { user?: { name: string } };
}

export default function AssignmentsPage() {
    const { hasPermission } = useAuth();
    const { t } = useLanguage();
    const canManage = hasPermission('input assignments') || hasPermission('manage classes');

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [studyClasses, setStudyClasses] = useState<StudyClass[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [focusedStudentId, setFocusedStudentId] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [deletingAssignment, setDeletingAssignment] = useState<Assignment | null>(null);
    const [form, setForm] = useState({ study_class_id: '', student_id: 'all', title: '', description: '', due_date: '' });
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    
    // Submissions State
    const [submissionsDialogOpen, setSubmissionsDialogOpen] = useState(false);
    const [activeAssignmentForSubmissions, setActiveAssignmentForSubmissions] = useState<Assignment | null>(null);
    const [submissionsList, setSubmissionsList] = useState<Submission[]>([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);
    const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
    const [gradingForm, setGradingForm] = useState({ grade: '', feedback: '' });
    const [submittingGrade, setSubmittingGrade] = useState(false);

    const fetchAssignments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/assignments', { params: { search: search || undefined, student_id: focusedStudentId || undefined } });
            setAssignments(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [search, focusedStudentId]);

    const fetchDependencies = async () => {
        try {
            const [classRes, studentRes] = await Promise.all([
                axios.get('/api/study-classes?limit=1000'),
                axios.get('/api/students?limit=1000'),
            ]);
            setStudyClasses(classRes.data.data || classRes.data);
            setStudents(studentRes.data.data || studentRes.data);
        } catch (err) {
            console.error("Failed to load study classes", err);
        }
    };

    useEffect(() => { 
        fetchAssignments(); 
        fetchDependencies();
    }, [fetchAssignments]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const studentId = params.get('student_id') || '';
        setFocusedStudentId(studentId);
        if (studentId) {
            setForm(prev => ({ ...prev, student_id: studentId }));
        }
    }, []);

    const openCreate = () => {
        setEditingAssignment(null);
        setForm({ study_class_id: '', student_id: focusedStudentId || 'all', title: '', description: '', due_date: '' });
        setFile(null);
        setError('');
        setDialogOpen(true);
    };

    const openEdit = (assignment: Assignment) => {
        setEditingAssignment(assignment);
        setForm({
            study_class_id: assignment.study_class_id.toString(),
            student_id: assignment.student_id ? assignment.student_id.toString() : 'all',
            title: assignment.title,
            description: assignment.description || '',
            due_date: assignment.due_date,
        });
        setFile(null);
        setError('');
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.study_class_id || !form.title || !form.due_date) {
            setError('Kelas, Judul, dan Tanggal Tenggat harus diisi.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('study_class_id', form.study_class_id);
            if (form.student_id !== 'all') {
                formData.append('student_id', form.student_id);
            }
            formData.append('title', form.title);
            if (form.description) formData.append('description', form.description);
            formData.append('due_date', form.due_date);
            if (file) {
                formData.append('document', file);
            }

            if (editingAssignment) {
                formData.append('_method', 'PUT'); // Required by Laravel for FormData PUT
                await axios.post(`/api/assignments/${editingAssignment.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post('/api/assignments', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            setDialogOpen(false);
            fetchAssignments();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal menyimpan data tugas');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingAssignment) return;
        try {
            await axios.delete(`/api/assignments/${deletingAssignment.id}`);
            setDeleteDialogOpen(false);
            setDeletingAssignment(null);
            fetchAssignments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus data');
        }
    };

    const fetchSubmissions = async (assignment: Assignment) => {
        setActiveAssignmentForSubmissions(assignment);
        setSubmissionsDialogOpen(true);
        setLoadingSubmissions(true);
        try {
            const res = await axios.get('/api/assignment-submissions', { params: { assignment_id: assignment.id } });
            setSubmissionsList(res.data.data || res.data);
        } catch (err: any) {
            toast.error('Gagal memuat daftar pengumpulan');
        } finally {
            setLoadingSubmissions(false);
        }
    };

    const openGrading = (submission: Submission) => {
        setGradingSubmission(submission);
        setGradingForm({
            grade: submission.grade ? submission.grade.toString() : '',
            feedback: submission.feedback || '',
        });
    };

    const submitGrade = async () => {
        if (!gradingSubmission) return;
        setSubmittingGrade(true);
        try {
            const res = await axios.put(`/api/assignment-submissions/${gradingSubmission.id}`, {
                grade: gradingForm.grade ? parseInt(gradingForm.grade) : null,
                feedback: gradingForm.feedback || null,
            });
            toast.success('Nilai berhasil disimpan');
            setGradingSubmission(null);
            // Update local list
            setSubmissionsList(prev => prev.map(s => s.id === gradingSubmission.id ? { ...s, ...res.data } : s));
        } catch (err: any) {
            toast.error('Gagal menyimpan nilai');
        } finally {
            setSubmittingGrade(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{t.assignmentsTitle}</h1>
                {canManage && <Button onClick={openCreate}>+ {t.addAssignment}</Button>}
            </div>

            <div className="mb-4">
                <Input
                    placeholder="Cari berdasarkan judul..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <div className="border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                <Table>
                    <TableHeader>
                        <TableRow>
                    <TableHead>{t.assignmentTitle}</TableHead>
                            <TableHead>{t.classes}</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>{t.deadline}</TableHead>
                            {canManage && <TableHead className="text-right">{t.action}</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={canManage ? 5 : 4} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.loading}</TableCell>
                            </TableRow>
                        ) : assignments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={canManage ? 5 : 4} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noAssignmentFound}</TableCell>
                            </TableRow>
                        ) : (
                            assignments.map((assignment) => (
                                <TableRow key={assignment.id}>
                                    <TableCell className="font-medium">{assignment.title}</TableCell>
                                    <TableCell>{assignment.study_class?.name}</TableCell>
                                    <TableCell>{assignment.student ? assignment.student.user?.name || assignment.student.name : 'Seluruh kelas'}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{assignment.due_date}</span>
                                            {assignment.document_path && (
                                                <a href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/storage/${assignment.document_path}`} target="_blank" rel="noopener noreferrer" className="text-xs text-red-700 dark:text-red-400 hover:underline">Lihat Dokumen</a>
                                            )}
                                        </div>
                                    </TableCell>
                                    {canManage && (
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="secondary" size="sm" onClick={() => fetchSubmissions(assignment)} className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200">
                                                <ClipboardList className="w-4 h-4 mr-1" /> Pengumpulan
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => openEdit(assignment)}>{t.edit}</Button>
                                            <Button variant="destructive" size="sm" onClick={() => { setDeletingAssignment(assignment); setDeleteDialogOpen(true); }}>{t.delete}</Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingAssignment ? t.edit + ' ' + t.assignmentTitle : t.addAssignment}</DialogTitle>
                        <DialogDescription>
                            {editingAssignment ? t.edit : t.addAssignment}
                        </DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="study_class_id">Kelas *</Label>
                            <Select value={form.study_class_id ? String(form.study_class_id) : ''} onValueChange={(v) => setForm({ ...form, study_class_id: v ?? '' })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Kelas">
                                        {form.study_class_id
                                            ? (() => { const c = studyClasses.find(c => String(c.id) === String(form.study_class_id)); return c ? `${c.name} (${c.batch?.name || 'Tanpa batch'})` : `Kelas #${form.study_class_id}`; })()
                                            : 'Pilih Kelas'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {studyClasses.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>
                                            {c.name} ({c.batch?.name || 'Tanpa batch'})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="student_id">Target Siswa</Label>
                            <Select value={form.student_id ? String(form.student_id) : 'all'} onValueChange={(v) => setForm({ ...form, student_id: v ?? 'all' })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih target">
                                        {!form.student_id || form.student_id === 'all'
                                            ? 'Seluruh siswa di kelas'
                                            : (students.find(s => String(s.id) === String(form.student_id))?.user?.name
                                               || students.find(s => String(s.id) === String(form.student_id))?.name
                                               || `Siswa #${form.student_id}`)}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Seluruh siswa di kelas</SelectItem>
                                    {students.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {s.user?.name || s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="title">{t.assignmentTitle} *</Label>
                            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: PR Bab 1" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="due_date">{t.deadline} *</Label>
                            <Input id="due_date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">{t.description}</Label>
                            <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Keterangan tugas..." />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="document">Dokumen Tugas (Maks 20MB)</Label>
                            <Input id="document" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                            {editingAssignment?.document_path && (
                                <p className="text-xs text-red-700 dark:text-red-400 mt-1">Tugas ini sudah memiliki dokumen. Upload baru untuk mengganti.</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.cancel}</Button>
                        <Button onClick={handleSubmit} disabled={saving}>{saving ? t.saving : t.save}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.delete}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t.cannotUndo}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t.delete}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Submissions Dialog */}
            <Dialog open={submissionsDialogOpen} onOpenChange={(open) => !open && setSubmissionsDialogOpen(false)}>
                <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-amber-600" />
                            Daftar Pengumpulan Tugas
                        </DialogTitle>
                        <DialogDescription>
                            {activeAssignmentForSubmissions?.title} ({activeAssignmentForSubmissions?.study_class?.name})
                        </DialogDescription>
                    </DialogHeader>

                    {loadingSubmissions ? (
                        <div className="py-8 text-center text-gray-500">Memuat data...</div>
                    ) : submissionsList.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">Belum ada siswa yang mengumpulkan tugas ini.</div>
                    ) : (
                        <div className="space-y-4 mt-4">
                            {submissionsList.map(sub => (
                                <div key={sub.id} className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">{sub.student?.user?.name || 'Siswa'}</p>
                                            <p className="text-xs text-gray-500">
                                                Waktu kumpul: {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('id-ID') : '-'}
                                                {sub.status === 'late' && <span className="ml-2 text-red-600 font-medium">(Terlambat)</span>}
                                            </p>
                                        </div>
                                        <div>
                                            {sub.status === 'graded' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                    <Star className="w-3 h-3" /> Nilai: {sub.grade}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                                    Belum Dinilai
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {sub.content && (
                                        <div className="mb-3 bg-white dark:bg-gray-900 p-3 rounded-lg border text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                            {sub.content}
                                        </div>
                                    )}

                                    {sub.file_path && (
                                        <div className="mb-3">
                                            <a
                                                href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/storage/${sub.file_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-800/50"
                                            >
                                                <FileText className="w-4 h-4" />
                                                {sub.original_filename || 'Lihat Lampiran'}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    )}

                                    <div className="flex justify-end border-t pt-3 mt-2">
                                        <Button variant="outline" size="sm" onClick={() => openGrading(sub)}>
                                            {sub.status === 'graded' ? 'Ubah Nilai' : 'Beri Nilai'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Grading Dialog */}
            <Dialog open={!!gradingSubmission} onOpenChange={(open) => !open && setGradingSubmission(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Beri Nilai</DialogTitle>
                        <DialogDescription>
                            Siswa: {gradingSubmission?.student?.user?.name || 'Siswa'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="grade">Nilai (0-100)</Label>
                            <Input
                                id="grade"
                                type="number"
                                min="0"
                                max="100"
                                value={gradingForm.grade}
                                onChange={(e) => setGradingForm({ ...gradingForm, grade: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="feedback">Komentar / Feedback</Label>
                            <Textarea
                                id="feedback"
                                value={gradingForm.feedback}
                                onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })}
                                placeholder="Komentar untuk siswa..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGradingSubmission(null)}>Batal</Button>
                        <Button onClick={submitGrade} disabled={submittingGrade} className="bg-amber-600 hover:bg-amber-700">
                            {submittingGrade ? 'Menyimpan...' : 'Simpan Nilai'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
