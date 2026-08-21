'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

interface Student {
    id: number;
    name?: string;
    nis?: string;
    user?: { name: string };
}

interface Batch {
    id: number;
    name: string;
    status: string;
}

interface Enrollment {
    id: number;
    student_id: number;
    batch_id: number;
    status: string;
    student?: Student;
    batch?: Batch;
    created_at: string;
}

export default function EnrollmentsPage() {
    const { t } = useLanguage();
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);
    const [deletingEnrollment, setDeletingEnrollment] = useState<Enrollment | null>(null);
    const [form, setForm] = useState({ student_id: '', batch_id: '', status: 'active' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchEnrollments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/enrollments', { params: { search: search || undefined, include_inactive: 1 } });
            setEnrollments(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [search]);

    const fetchDependencies = async () => {
        try {
            const [studentsRes, batchesRes] = await Promise.all([
                axios.get('/api/students?limit=1000'), // Or implement autocomplete for large sets
                axios.get('/api/batches?limit=1000')
            ]);
            // Depending on how pagination is setup on the backend, data.data or just data
            setStudents(studentsRes.data.data || studentsRes.data);
            setBatches(batchesRes.data.data || batchesRes.data);
        } catch (err) {
            console.error("Failed to load dependencies", err);
        }
    };

    useEffect(() => { 
        fetchEnrollments(); 
        fetchDependencies();
    }, [fetchEnrollments]);

    const openCreate = () => {
        setEditingEnrollment(null);
        setForm({ student_id: '', batch_id: '', status: 'active' });
        setError('');
        setDialogOpen(true);
    };

    const openEdit = (enrollment: Enrollment) => {
        setEditingEnrollment(enrollment);
        setForm({
            student_id: enrollment.student_id.toString(),
            batch_id: enrollment.batch_id.toString(),
            status: enrollment.status,
        });
        setError('');
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.student_id || !form.batch_id) {
            setError('Siswa dan Batch harus dipilih.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const payload = {
                student_id: parseInt(form.student_id),
                batch_id: parseInt(form.batch_id),
                status: form.status,
            };
            if (editingEnrollment) {
                await axios.put(`/api/enrollments/${editingEnrollment.id}`, payload);
            } else {
                await axios.post('/api/enrollments', payload);
            }
            setDialogOpen(false);
            fetchEnrollments();
        } catch (err: any) {
            const errData = err.response?.data;
            if (errData?.errors?.student_id) {
                setError(errData.errors.student_id[0]);
            } else {
                setError(errData?.message || 'Gagal menyimpan data');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingEnrollment) return;
        try {
            await axios.delete(`/api/enrollments/${deletingEnrollment.id}`);
            setDeleteDialogOpen(false);
            setDeletingEnrollment(null);
            fetchEnrollments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus data');
        }
    };

    const statusColor = (s: string) => {
        switch (s) {
            case 'active': return 'default';
            case 'completed': return 'secondary';
            case 'dropped': return 'destructive';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{t.enrollmentsTitle}</h1>
                <Button onClick={openCreate}>{t.addEnrollment}</Button>
            </div>

            <div className="mb-4">
                <Input
                    placeholder={t.search}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <div className="border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.studentName}</TableHead>
                            <TableHead>{t.batch}</TableHead>
                            <TableHead>{t.status}</TableHead>
                            <TableHead>{t.enrolledAt}</TableHead>
                            <TableHead className="text-right">{t.action}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.loading}</TableCell>
                            </TableRow>
                        ) : enrollments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noEnrollmentData}</TableCell>
                            </TableRow>
                        ) : (
                            enrollments.map((enrollment) => (
                                <TableRow key={enrollment.id}>
                                    <TableCell className="font-medium">
                                        {enrollment.student?.user?.name || enrollment.student?.name || `ID: ${enrollment.student_id}`}
                                    </TableCell>
                                    <TableCell>
                                        {enrollment.batch?.name || `ID: ${enrollment.batch_id}`}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={statusColor(enrollment.status) as any}>{enrollment.status}</Badge>
                                    </TableCell>
                                    <TableCell>{new Date(enrollment.created_at).toLocaleDateString('id-ID')}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => openEdit(enrollment)}>{t.edit}</Button>
                                        <Button variant="destructive" size="sm" onClick={() => { setDeletingEnrollment(enrollment); setDeleteDialogOpen(true); }}>{t.delete}</Button>
                                    </TableCell>
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
                        <DialogTitle>{editingEnrollment ? t.editEnrollment : t.addNewEnrollment}</DialogTitle>
                        <DialogDescription>
                            {editingEnrollment ? t.editEnrollment : t.addNewEnrollment}
                        </DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="student_id">{t.studentName} *</Label>
                            <Select value={form.student_id ? String(form.student_id) : ''} onValueChange={(v) => setForm({ ...form, student_id: v ?? '' })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t.allStudents}>
                                        {form.student_id
                                            ? (() => { const s = students.find(s => String(s.id) === String(form.student_id)); return s ? `${s.user?.name || s.name} (${s.nis || '-'})` : `#${form.student_id}`; })()
                                            : t.allStudents}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.user?.name || s.name} ({s.nis || '-'})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="batch_id">{t.batch} *</Label>
                            <Select value={form.batch_id ? String(form.batch_id) : ''} onValueChange={(v) => setForm({ ...form, batch_id: v ?? '' })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t.selectBatch}>
                                        {form.batch_id
                                            ? (() => { const b = batches.find(b => String(b.id) === String(form.batch_id)); return b ? `${b.name} (${b.status})` : `#${form.batch_id}`; })()
                                            : t.selectBatch}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {batches.map(b => (
                                        <SelectItem key={b.id} value={b.id.toString()}>{b.name} ({b.status})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="status">{t.status} *</Label>
                            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? 'active' })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="dropped">Dropped</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
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
                        <AlertDialogTitle>{t.deleteEnrollment}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t.deleteEnrollmentDesc}
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
