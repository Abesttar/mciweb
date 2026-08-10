'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BookOpen, Clock, Edit, UsersRound } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface Batch {
    id: number;
    name: string;
    start_date: string | null;
    end_date: string | null;
    status: string;
    quota: number | null;
    class_level: string;
    teacher_id?: number | null;
    teacher?: { user?: { name: string } };
    enrollments_count?: number;
}

export default function BatchesPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
    const [form, setForm] = useState<Partial<Batch>>({
        name: '', start_date: '', end_date: '', status: 'active', quota: 20, class_level: '', teacher_id: null
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const openCreate = () => {
        setEditingBatch(null);
        setForm({ name: '', start_date: '', end_date: '', status: 'active', quota: 20, class_level: '', teacher_id: null });
        setError('');
        setDialogOpen(true);
    };

    const openEdit = (batch: Batch, event: React.MouseEvent) => {
        event.stopPropagation();
        setEditingBatch(batch);
        setForm({
            name: batch.name,
            start_date: batch.start_date || '',
            end_date: batch.end_date || '',
            status: batch.status || 'active',
            quota: batch.quota || 20,
            class_level: batch.class_level || 'shou',
            teacher_id: batch.teacher_id || null,
        });
        setError('');
        setDialogOpen(true);
    };

    const submitForm = async () => {
        setSaving(true);
        setError('');
        try {
            if (editingBatch) {
                await axios.put(`/api/batches/${editingBatch.id}`, form);
            } else {
                await axios.post('/api/batches', form);
            }
            setDialogOpen(false);
            fetchBatches();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Terjadi kesalahan');
        } finally {
            setSaving(false);
        }
    };

    const fetchBatches = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/batches', { params: { search: search || undefined } });
            setBatches(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetchBatches(); }, [fetchBatches]);

    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const res = await axios.get('/api/teachers', { params: { per_page: 1000 } });
                setTeachers(res.data.data || res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchTeachers();
    }, []);

    const formatLevel = (level: string) => {
        if (!level) return 'Belum Diatur';
        return level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const levelColor = (level: string) => {
        switch (level) {
            case 'shou': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
            case 'chuu': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
            case 'kou': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300';
            case 'kelas_kaiwa': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{(t as any)['batches'] || 'Angkatan'}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Pilih angkatan untuk melihat daftar siswa dan kelasnya.</p>
                </div>
            </div>

            <div className="flex justify-between items-center bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl p-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700/50">
                <Input
                    placeholder="Cari angkatan..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm border-0 focus-visible:ring-0 bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl dark:text-white"
                />
                <Button onClick={openCreate}>+ Tambah Angkatan</Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
            ) : batches.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                    <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 dark:text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Belum ada angkatan</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {batches.map((batch) => (
                        <Card 
                            key={batch.id} 
                            className="relative overflow-hidden group cursor-pointer bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-red-400/50 dark:hover:border-red-800/50 transition-all duration-300 flex flex-col"
                            onClick={() => router.push(`/dashboard/batches/${batch.id}`)}
                        >
                            {/* Decorative background gradient */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 dark:bg-red-500/10 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110"></div>
                            
                            <CardContent className="p-6 relative z-10 flex flex-col h-full flex-grow">
                                {/* Header: Badge & Status */}
                                <div className="flex justify-between items-start mb-4">
                                    <Badge className={`${levelColor(batch.class_level)} hover:${levelColor(batch.class_level)} border-none shadow-sm px-3 py-1 font-medium rounded-full`}>
                                        {formatLevel(batch.class_level)}
                                    </Badge>
                                    <Badge variant={batch.status === 'active' ? 'default' : 'secondary'} className="rounded-full px-3 py-1 shadow-sm font-semibold tracking-wide text-[10px]">
                                        {batch.status.toUpperCase()}
                                    </Badge>
                                </div>

                                {/* Title */}
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors mb-6">
                                    {batch.name}
                                </h3>

                                {/* Info Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 flex-grow">
                                    <div className="bg-gray-50/50 dark:bg-[#1a202c]/50 rounded-xl p-3 flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800 transition-colors group-hover:border-gray-200 dark:group-hover:border-gray-700">
                                        <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1">
                                            <UsersRound className="w-4 h-4 mr-1.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Siswa</span>
                                        </div>
                                        <div className="flex items-baseline">
                                            <span className="text-lg font-bold text-gray-900 dark:text-white">{batch.enrollments_count || 0}</span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">/ {batch.quota || 20}</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50/50 dark:bg-[#1a202c]/50 rounded-xl p-3 flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800 transition-colors group-hover:border-gray-200 dark:group-hover:border-gray-700">
                                        <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1">
                                            <Clock className="w-4 h-4 mr-1.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Mulai</span>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {batch.start_date ? new Date(batch.start_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '-'}
                                        </span>
                                    </div>
                                </div>

                                {/* Footer: Sensei & Actions */}
                                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">Sensei Pengajar</span>
                                        <span className="font-medium text-gray-900 dark:text-white text-sm">{batch.teacher?.user?.name || 'Belum diatur'}</span>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={(event) => openEdit(batch, event)}
                                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full h-9 w-9 transition-colors shrink-0"
                                        title="Edit Batch"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingBatch ? 'Edit Angkatan' : 'Tambah Angkatan Baru'}</DialogTitle>
                        <DialogDescription>{editingBatch ? 'Ubah data angkatan yang sudah dibuat.' : 'Isi data angkatan baru di bawah ini.'}</DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Nama Angkatan *</Label>
                            <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Angkatan 15" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Tanggal Mulai</Label>
                                <Input type="date" value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Tanggal Selesai</Label>
                                <Input type="date" value={form.end_date || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Kuota</Label>
                                <Input type="number" min={1} max={20} value={form.quota || ''} onChange={(e) => setForm({ ...form, quota: Math.min(parseInt(e.target.value) || 20, 20) })} placeholder="Maksimal 20 siswa" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Tingkat Kelas</Label>
                                <Select value={form.class_level || ''} onValueChange={(v) => setForm({ ...form, class_level: v ?? '' })}>
                                    <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="shou">Shou (Dasar)</SelectItem>
                                        <SelectItem value="chuu">Chuu (Tengah)</SelectItem>
                                        <SelectItem value="kou">Kou (Atas)</SelectItem>
                                        <SelectItem value="jft">JFT</SelectItem>
                                        <SelectItem value="kelas_kaiwa">Kaiwa (percakapan)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Sensei Pengajar</Label>
                            <Select value={form.teacher_id ? String(form.teacher_id) : ''} onValueChange={(v) => setForm({ ...form, teacher_id: v ? parseInt(v) : null })}>
                                <SelectTrigger className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                                    <SelectValue placeholder="Pilih sensei...">
                                        {form.teacher_id
                                            ? (teachers.find(t => t.id === form.teacher_id || t.id === Number(form.teacher_id))?.user?.name
                                               || teachers.find(t => t.id === form.teacher_id || t.id === Number(form.teacher_id))?.name
                                               || `Sensei #${form.teacher_id}`)
                                            : 'Pilih sensei...'}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.map((teacher) => (
                                        <SelectItem key={teacher.id} value={String(teacher.id)}>
                                            {teacher.user?.name || teacher.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Status Batch</Label>
                            <Select value={form.status || 'active'} onValueChange={(v) => setForm({ ...form, status: v ?? 'active' })}>
                                <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                        <Button onClick={submitForm} disabled={saving}>{saving ? 'Menyimpan...' : editingBatch ? 'Simpan Perubahan' : 'Simpan'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
