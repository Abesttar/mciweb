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

interface Batch {
    id: number;
    name: string;
    class_level: string;
    teacher?: { user?: { name: string } };
}

interface Schedule {
    id: number;
    batch_id?: number | null;
    class_level?: string | null;
    schedule_month?: string | null;
    day_of_week: string;
    start_time: string;
    end_time: string;
    room: string | null;
    batch?: Batch;
    study_class?: {
        name: string;
        batch?: Batch;
        teacher?: { user?: { name: string }; name?: string };
    };
}

const LEVEL_LABELS: Record<string, string> = {
    shou: 'Shou',
    chuu: 'Chuu',
    kou: 'Kou',
    jft: 'JFT',
    kelas_kaiwa: 'Kaiwa (percakapan)',
};

const currentMonth = () => new Date().toISOString().slice(0, 7);
const toMonthInput = (value?: string | null) => value ? value.slice(0, 7) : currentMonth();
const formatMonth = (value?: string | null) => value ? new Date(value).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '-';
const getScheduleBatch = (schedule: Schedule) => schedule.batch || schedule.study_class?.batch;
const getLevelLabel = (level?: string | null) => level ? (LEVEL_LABELS[level] || level) : '-';

export default function SchedulesPage() {
    const { hasRole } = useAuth();
    const { t } = useLanguage();
    const isStudent = hasRole('Siswa');
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterBatch, setFilterBatch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);
    const [form, setForm] = useState({ batch_id: '', schedule_month: currentMonth(), start_time: '08:00', end_time: '15:30', room: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchSchedules = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterBatch && filterBatch !== 'all') params.batch_id = filterBatch;
            const res = await axios.get('/api/schedules', { params });
            setSchedules(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filterBatch]);

    const fetchBatches = async () => {
        try {
            const res = await axios.get('/api/batches', { params: { per_page: 1000 } });
            setBatches(res.data.data || res.data);
        } catch (err) {
            console.error('Failed to load batches', err);
        }
    };

    useEffect(() => {
        fetchSchedules();
        fetchBatches();
    }, [fetchSchedules]);

    const openCreate = () => {
        setEditingSchedule(null);
        setForm({ batch_id: '', schedule_month: currentMonth(), start_time: '08:00', end_time: '15:30', room: '' });
        setError('');
        setDialogOpen(true);
    };

    const openEdit = (schedule: Schedule) => {
        const batch = getScheduleBatch(schedule);
        setEditingSchedule(schedule);
        setForm({
            batch_id: batch?.id ? String(batch.id) : '',
            schedule_month: toMonthInput(schedule.schedule_month),
            start_time: schedule.start_time?.substring(0, 5) || '08:00',
            end_time: schedule.end_time?.substring(0, 5) || '15:30',
            room: schedule.room || '',
        });
        setError('');
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.batch_id || !form.schedule_month) {
            setError('Batch dan bulan jadwal wajib diisi.');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const payload = {
                batch_id: parseInt(form.batch_id),
                schedule_month: form.schedule_month,
                day_of_week: 'Bulanan',
                start_time: form.start_time || '08:00',
                end_time: form.end_time || '15:30',
                room: form.room || null,
            };
            if (editingSchedule) {
                await axios.put(`/api/schedules/${editingSchedule.id}`, payload);
            } else {
                await axios.post('/api/schedules', payload);
            }
            setDialogOpen(false);
            fetchSchedules();
        } catch (err: any) {
            const errors = err.response?.data?.errors;
            const firstError = errors ? Object.values(errors).flat()[0] : null;
            setError(String(firstError || err.response?.data?.message || 'Gagal menyimpan data jadwal'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingSchedule) return;
        try {
            await axios.delete(`/api/schedules/${deletingSchedule.id}`);
            setDeleteDialogOpen(false);
            setDeletingSchedule(null);
            fetchSchedules();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus data');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{t.schedulesTitle}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.schedulesDesc}</p>
                </div>
                {!isStudent && <Button onClick={openCreate}>{t.addSchedule}</Button>}
            </div>

            <div className="mb-4 max-w-sm">
                <Select value={filterBatch} onValueChange={(value) => setFilterBatch(value ?? '')}>
                    <SelectTrigger><SelectValue placeholder={t.allSchedules} /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t.allSchedules}</SelectItem>
                        {batches.map((batch) => (
                            <SelectItem key={batch.id} value={String(batch.id)}>{batch.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="border rounded-lg bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Bulan</TableHead>
                            <TableHead>{t.batch}</TableHead>
                            <TableHead>{t.classLevel}</TableHead>
                            <TableHead>{t.startTime} - {t.endTime}</TableHead>
                            <TableHead>{t.teachers}</TableHead>
                            <TableHead>{t.room}</TableHead>
                            {!isStudent && <TableHead className="text-right">{t.action}</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={isStudent ? 6 : 7} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.loading}</TableCell></TableRow>
                        ) : schedules.length === 0 ? (
                            <TableRow><TableCell colSpan={isStudent ? 6 : 7} className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noScheduleData}</TableCell></TableRow>
                        ) : (
                            schedules.map((schedule) => {
                                const batch = getScheduleBatch(schedule);
                                return (
                                    <TableRow key={schedule.id}>
                                        <TableCell className="font-medium">{formatMonth(schedule.schedule_month)}</TableCell>
                                        <TableCell>{batch?.name || '-'}</TableCell>
                                        <TableCell>{getLevelLabel(schedule.class_level || batch?.class_level)}</TableCell>
                                        <TableCell>{schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}</TableCell>
                                        <TableCell>{batch?.teacher?.user?.name || schedule.study_class?.teacher?.user?.name || schedule.study_class?.teacher?.name || '-'}</TableCell>
                                        <TableCell>{schedule.room || '-'}</TableCell>
                                        {!isStudent && (
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => openEdit(schedule)}>{t.edit}</Button>
                                                <Button variant="destructive" size="sm" onClick={() => { setDeletingSchedule(schedule); setDeleteDialogOpen(true); }}>{t.delete}</Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingSchedule ? t.editSchedule : t.addNewSchedule}</DialogTitle>
                        <DialogDescription>{t.schedulesDesc}</DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{t.batch} *</Label>
                            <Select value={form.batch_id ? String(form.batch_id) : ''} onValueChange={(value) => setForm({ ...form, batch_id: value ?? '' })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t.selectBatch}>
                                        {form.batch_id
                                            ? (() => { const b = batches.find(b => String(b.id) === String(form.batch_id)); return b ? `${b.name} - ${getLevelLabel(b.class_level)}` : `#${form.batch_id}`; })()
                                            : t.selectBatch}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {batches.map((batch) => (
                                        <SelectItem key={batch.id} value={String(batch.id)}>
                                            {batch.name} - {getLevelLabel(batch.class_level)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Bulan *</Label>
                                <Input type="month" value={form.schedule_month} onChange={(e) => setForm({ ...form, schedule_month: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.room}</Label>
                                <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t.startTime}</Label>
                                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.endTime}</Label>
                                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.cancel}</Button>
                        <Button onClick={handleSubmit} disabled={saving}>{saving ? t.saving : t.save}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.deleteSchedule}</AlertDialogTitle>
                        <AlertDialogDescription>{t.deleteScheduleDesc}</AlertDialogDescription>
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
