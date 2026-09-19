'use client';

import { useState, useEffect, useCallback, use } from 'react';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash, Plus, ArrowLeft, BookOpen, Clock, Eye, EyeOff, Shuffle, Globe, Lock } from 'lucide-react';

export default function ClassExamsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [exams, setExams] = useState<any[]>([]);
    const [kelas, setKelas] = useState<any>(null);
    const [packages, setPackages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

    const [form, setForm] = useState<any>({
        title: '', description: '', duration_minutes: 60,
        random_questions: true, show_results: true,
        question_bank_id: '', status: 'draft',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [clsRes, exRes, pkgRes] = await Promise.all([
                axios.get(`/api/study-classes/${id}`),
                axios.get('/api/exams', { params: { class_id: id } }),
                axios.get('/api/question-banks'),
            ]);
            setKelas(clsRes.data);
            setExams(exRes.data);
            setPackages(pkgRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const resetForm = () => ({
        title: '', description: '', duration_minutes: 60,
        random_questions: true, show_results: true,
        question_bank_id: '', status: 'draft',
    });

    const openCreate = () => {
        setEditing(null);
        setForm(resetForm());
        setError('');
        setDialogOpen(true);
    };

    const openEdit = (exam: any) => {
        setEditing(exam);
        setForm({
            title: exam.title,
            description: exam.description || '',
            duration_minutes: exam.duration_minutes,
            random_questions: exam.random_questions,
            show_results: exam.show_results,
            question_bank_id: String(exam.question_bank_id),
            status: exam.status,
        });
        setError('');
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) { setError('Judul ujian wajib diisi.'); return; }
        if (!form.question_bank_id) { setError('Pilih satu paket soal.'); return; }
        if (!form.duration_minutes || form.duration_minutes < 1) { setError('Durasi harus lebih dari 0 menit.'); return; }

        setSaving(true);
        setError('');
        try {
            const payload = { ...form, study_class_id: id };
            if (editing) {
                await axios.put(`/api/exams/${editing.id}`, payload);
            } else {
                await axios.post('/api/exams', payload);
            }
            setDialogOpen(false);
            fetchData();
        } catch (e: any) {
            setError(e.response?.data?.message || 'Terjadi kesalahan.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await axios.delete(`/api/exams/${deleteTarget.id}`);
            setDeleteTarget(null);
            fetchData();
        } catch { }
    };

    const toggleStatus = async (exam: any) => {
        const next = exam.status === 'published' ? 'closed' : 'published';
        try {
            await axios.put(`/api/exams/${exam.id}`, { status: next });
            fetchData();
        } catch { }
    };

    const selectedPkg = packages.find(p => String(p.id) === String(form.question_bank_id));

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/classes')}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kelola Ujian</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Kelas: <span className="font-medium text-gray-700 dark:text-gray-200">{kelas?.name || '...'}</span></p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                <p className="text-sm text-gray-500">{exams.length} ujian tersedia</p>
                <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700">
                    <Plus className="w-4 h-4 mr-2" /> Buat Ujian
                </Button>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Memuat...</div>
            ) : exams.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#151a23]/90 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                    <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Belum ada ujian</h3>
                    <p className="text-sm text-gray-500 mt-1">Klik "Buat Ujian" untuk mulai.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {exams.map(ex => {
                        const qCount = ex.question_bank?.questions_count ?? ex.question_bank?.questions?.length ?? '?';
                        return (
                            <Card key={ex.id} className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all flex flex-col">
                                <CardContent className="p-6 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-3">
                                        <Badge variant={ex.status === 'published' ? 'default' : ex.status === 'closed' ? 'secondary' : 'outline'} className={`rounded-full text-xs ${ex.status === 'published' ? 'bg-emerald-600' : ''}`}>
                                            {ex.status === 'published' ? 'Dibuka' : ex.status === 'closed' ? 'Ditutup' : 'Draft'}
                                        </Badge>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(ex)} className="h-7 w-7 text-blue-500">
                                                <Edit className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(ex)} className="h-7 w-7 text-red-400">
                                                <Trash className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{ex.title}</h3>
                                    {ex.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{ex.description}</p>}

                                    <div className="space-y-2 mt-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                                            <span className="line-clamp-1">{ex.question_bank?.name || '-'} <span className="text-gray-400">({qCount} soal)</span></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                            <span>{ex.duration_minutes} Menit</span>
                                        </div>
                                        <div className="flex gap-3 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">{ex.random_questions ? <Shuffle className="w-3 h-3" /> : null} {ex.random_questions ? 'Acak' : 'Berurutan'}</span>
                                            <span className="flex items-center gap-1">{ex.show_results ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} {ex.show_results ? 'Nilai ditampilkan' : 'Nilai disembunyikan'}</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto flex flex-col gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => router.push(`/dashboard/classes/${id}/exams/${ex.id}/results`)}
                                            className="w-full gap-2 font-semibold"
                                        >
                                            Lihat Hasil
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => toggleStatus(ex)}
                                            className={`w-full gap-2 ${ex.status === 'published' ? 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400' : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400'}`}
                                        >
                                            {ex.status === 'published' ? (
                                                <><Lock className="w-4 h-4" /> Tutup Ujian</>
                                            ) : (
                                                <><Globe className="w-4 h-4" /> Buka ke Siswa</>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ── Create/Edit Dialog ─────────────────────────────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Ujian' : 'Buat Ujian Baru'}</DialogTitle>
                        <DialogDescription>Pilih paket soal dari Bank Soal, atur durasi dan mode ujian.</DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

                    <div className="grid gap-4 py-2">
                        <div className="grid gap-1.5">
                            <Label>Judul Ujian <span className="text-red-500">*</span></Label>
                            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder='contoh: "Ujian Tengah Semester Bab 1-3"' />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Deskripsi <span className="text-gray-400 text-xs">(opsional)</span></Label>
                            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="resize-none" />
                        </div>

                        {/* Package selector */}
                        <div className="grid gap-1.5">
                            <Label>Paket Soal <span className="text-red-500">*</span></Label>
                            {packages.length === 0 ? (
                                <div className="border rounded-lg p-4 text-center text-sm text-gray-500 bg-gray-50 dark:bg-gray-800">
                                    Belum ada paket soal. <a href="/dashboard/question-banks" className="text-red-600 hover:underline">Buat dulu di Bank Soal →</a>
                                </div>
                            ) : (
                                <Select value={form.question_bank_id} onValueChange={v => setForm({ ...form, question_bank_id: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="-- Pilih satu paket soal --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {packages.map(p => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                                {p.name} <span className="text-gray-400 ml-1">({p.questions_count ?? p.questions?.length ?? 0} soal)</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {selectedPkg && (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                    ✓ {selectedPkg.questions_count ?? selectedPkg.questions?.length ?? 0} soal terpilih dari paket ini
                                    {selectedPkg.description && ` — ${selectedPkg.description}`}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-1.5">
                            <Label>Durasi <span className="text-red-500">*</span></Label>
                            <div className="flex items-center gap-2">
                                <Input type="number" min="1" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })} className="w-28" />
                                <span className="text-sm text-gray-500">menit</span>
                            </div>
                        </div>

                        {/* Toggle options */}
                        <div className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input type="checkbox" checked={form.random_questions} onChange={e => setForm({ ...form, random_questions: e.target.checked })} className="mt-0.5 accent-red-600 w-4 h-4" />
                                <div>
                                    <span className="text-sm font-medium">Acak urutan soal</span>
                                    <p className="text-xs text-gray-400 mt-0.5">Setiap siswa mendapat urutan soal yang berbeda secara otomatis.</p>
                                </div>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input type="checkbox" checked={form.show_results} onChange={e => setForm({ ...form, show_results: e.target.checked })} className="mt-0.5 accent-red-600 w-4 h-4" />
                                <div>
                                    <span className="text-sm font-medium">Tampilkan nilai setelah selesai</span>
                                    <p className="text-xs text-gray-400 mt-0.5">Siswa langsung bisa lihat skor begitu ujian dikumpulkan.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleSubmit} disabled={saving} className="bg-red-600 hover:bg-red-700 min-w-[120px]">
                            {saving ? 'Menyimpan...' : (editing ? 'Simpan' : 'Buat Ujian')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Ujian?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ujian <strong>{deleteTarget?.title}</strong> dan semua data sesi siswa akan terhapus permanen.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
