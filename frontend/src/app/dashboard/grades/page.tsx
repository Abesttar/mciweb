'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useLanguage } from '@/context/LanguageContext';

interface Enrollment {
    id: number;
    student?: { id: number; name?: string; user?: { name: string } };
    batch?: { id: number; name: string; class_level?: string };
}

interface GradeData {
    id: number;
    enrollment_id: number;
    score: number;
    type: string;
    remarks: string | null;
    enrollment?: Enrollment;
}

const GRADE_TYPES = ['Evaluasi Mingguan', 'Ujian Kenaikan Kelas', 'Ujian Harian', 'Tugas', 'Praktik', 'Lainnya'];
const LEVEL_LABELS: Record<string, string> = {
    shou: 'Shou',
    chuu: 'Chuu',
    kou: 'Kou',
    jft: 'JFT',
    kelas_kaiwa: 'Kaiwa (percakapan)',
};

function getScoreColor(score: number): string {
    if (score >= 85) return 'text-green-700 font-bold';
    if (score >= 70) return 'text-red-800 font-semibold';
    if (score >= 55) return 'text-yellow-700';
    return 'text-red-600 font-semibold';
}

const getLevelLabel = (level?: string | null) => level ? (LEVEL_LABELS[level] || level) : '-';

export default function GradesPage() {
    const { hasRole } = useAuth();
    const { t } = useLanguage();
    const isStudent = hasRole('Siswa');
    const [grades, setGrades] = useState<GradeData[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [focusedStudentId, setFocusedStudentId] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingGrade, setEditingGrade] = useState<GradeData | null>(null);
    const [deletingGrade, setDeletingGrade] = useState<GradeData | null>(null);
    const [form, setForm] = useState({ enrollment_id: '', score: '', type: 'Ujian Harian', remarks: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchGrades = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (search) params.search = search;
            if (focusedStudentId) params.student_id = focusedStudentId;
            const res = await axios.get('/api/grades', { params });
            setGrades(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [search, focusedStudentId]);

    const fetchDependencies = async () => {
        try {
            const enrollRes = await axios.get('/api/enrollments?status=active&limit=1000');
            setEnrollments(enrollRes.data.data || enrollRes.data);
        } catch (err) {
            console.error("Failed to load dependencies", err);
        }
    };

    useEffect(() => {
        fetchGrades();
        fetchDependencies();
    }, [fetchGrades]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setFocusedStudentId(params.get('student_id') || '');
    }, []);

    const openCreate = () => {
        setEditingGrade(null);
        setForm({ enrollment_id: '', score: '', type: 'Ujian Harian', remarks: '' });
        setError('');
        setDialogOpen(true);
    };

    const openEdit = (grade: GradeData) => {
        setEditingGrade(grade);
        setForm({
            enrollment_id: grade.enrollment_id.toString(),
            score: grade.score.toString(),
            type: grade.type,
            remarks: grade.remarks || '',
        });
        setError('');
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.enrollment_id || !form.score || !form.type) {
            setError('Siswa, skor, dan tipe wajib diisi.');
            return;
        }
        const scoreNum = parseFloat(form.score);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
            setError('Skor harus berupa angka antara 0 dan 100.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const payload = {
                enrollment_id: parseInt(form.enrollment_id),
                score: scoreNum,
                type: form.type,
                remarks: form.remarks || null,
            };
            if (editingGrade) {
                await axios.put(`/api/grades/${editingGrade.id}`, payload);
            } else {
                await axios.post('/api/grades', payload);
            }
            setDialogOpen(false);
            fetchGrades();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal menyimpan data nilai');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingGrade) return;
        try {
            await axios.delete(`/api/grades/${deletingGrade.id}`);
            setDeleteDialogOpen(false);
            setDeletingGrade(null);
            fetchGrades();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus data');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{t.gradesTitle}</h1>
                {!isStudent && <Button onClick={openCreate}>{t.addGrade}</Button>}
            </div>

            <div className="grid grid-cols-1 gap-4 mb-4">
                <Input
                    placeholder={t.search}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.studentName}</TableHead>
                            <TableHead>{t.batch}</TableHead>
                            <TableHead>{t.classLevel}</TableHead>
                            <TableHead>{t.gradeType}</TableHead>
                            <TableHead className="text-center">{t.score}</TableHead>
                            <TableHead>{t.notes}</TableHead>
                            {!isStudent && <TableHead className="text-right">{t.action}</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={isStudent ? 6 : 7} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.loading}</TableCell>
                            </TableRow>
                        ) : grades.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isStudent ? 6 : 7} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noGradeData}</TableCell>
                            </TableRow>
                        ) : (
                            grades.map((grade) => (
                                <TableRow key={grade.id}>
                                    <TableCell className="font-medium">{grade.enrollment?.student?.user?.name || grade.enrollment?.student?.name}</TableCell>
                                    <TableCell>{grade.enrollment?.batch?.name}</TableCell>
                                    <TableCell>{getLevelLabel(grade.enrollment?.batch?.class_level)}</TableCell>
                                    <TableCell>{grade.type}</TableCell>
                                    <TableCell className={`text-center ${getScoreColor(grade.score)}`}>{grade.score}</TableCell>
                                    <TableCell className="text-gray-500 dark:text-gray-400 max-w-xs truncate">{grade.remarks || '-'}</TableCell>
                                    {!isStudent && (
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => openEdit(grade)}>{t.edit}</Button>
                                            <Button variant="destructive" size="sm" onClick={() => { setDeletingGrade(grade); setDeleteDialogOpen(true); }}>{t.delete}</Button>
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
                        <DialogTitle>{editingGrade ? t.editGrade : t.addGrade}</DialogTitle>
                        <DialogDescription>
                            {t.gradesDesc}
                        </DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{t.studentName} *</Label>
                            <Select value={form.enrollment_id} onValueChange={(v) => setForm({ ...form, enrollment_id: v ?? '' })}>
                                <SelectTrigger><SelectValue placeholder={t.selectStudent} /></SelectTrigger>
                                <SelectContent>
                                    {enrollments.map(e => (
                                        <SelectItem key={e.id} value={e.id.toString()}>
                                            {e.student?.user?.name || e.student?.name} — {e.batch?.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t.score} (0-100) *</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={form.score}
                                    onChange={(e) => setForm({ ...form, score: e.target.value })}
                                    placeholder="85"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.gradeType} *</Label>
                                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? 'Ujian Akhir' })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {GRADE_TYPES.map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.notes}</Label>
                            <Input
                                value={form.remarks}
                                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                            />
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
                        <AlertDialogTitle>{t.deleteGrade}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t.deleteGradeDesc}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t.delete}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
