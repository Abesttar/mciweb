'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search } from 'lucide-react';

interface Batch { id: number; name: string; }
interface Teacher { id: number; nip?: string; user: { name: string }; }
interface StudyClass {
    id: number; name: string; class_type: string; batch_id: number; subject_id?: number; teacher_id: number; schedule_info?: string;
    batch?: Batch; teacher?: Teacher & { user: { name: string } };
}

export default function ClassesPage() {
    const { hasRole, hasPermission } = useAuth();
    const { t } = useLanguage();
    const isAdmin = hasRole('Admin') || hasRole('Super Admin') || hasPermission('manage classes');
    const isSensei = hasRole('Sensei');
    const canManage = isAdmin || isSensei;
    const [classes, setClasses] = useState<StudyClass[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editing, setEditing] = useState<StudyClass | null>(null);
    const [deleting, setDeleting] = useState<StudyClass | null>(null);
    const [form, setForm] = useState({ name: '', class_type: 'shou', batch_id: '', teacher_id: '', days: [] as string[], startTime: '08:00', endTime: '15:30' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchClasses = useCallback(async () => {
        setLoading(true);
        try { const res = await axios.get('/api/study-classes', { params: { search: search || undefined } }); setClasses(res.data.data); }
        catch (err) { console.error(err); } finally { setLoading(false); }
    }, [search]);

    const fetchOptions = async () => {
        try {
            const [b, t] = await Promise.all([
                axios.get('/api/batches', { params: { per_page: 100 } }),
                axios.get('/api/teachers', { params: { per_page: 100 } }),
            ]);
            setBatches(b.data.data); setTeachers(t.data.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchClasses(); fetchOptions(); }, [fetchClasses]);

    const openCreate = () => { setEditing(null); setForm({ name: '', class_type: 'shou', batch_id: '', teacher_id: '', days: [], startTime: '08:00', endTime: '15:30' }); setError(''); setDialogOpen(true); };
    const openEdit = (c: StudyClass) => { 
        setEditing(c); 
        let days: string[] = []; let startTime = '08:00'; let endTime = '15:30';
        if (c.schedule_info) {
             const parts = c.schedule_info.split(', ');
             if (parts.length >= 2) {
                 const timePart = parts.pop();
                 days = parts.join(', ').split(', ');
                 if (timePart && timePart.includes(' - ')) {
                     const times = timePart.split(' - ');
                     startTime = times[0]; endTime = times[1];
                 }
             } else {
                 // Try to fallback
                 if (c.schedule_info.includes(' - ')) {
                     const times = c.schedule_info.split(' - ');
                     startTime = times[0].slice(-5);
                     endTime = times[1].substring(0, 5);
                 }
             }
        }
        setForm({ name: c.name, class_type: c.class_type || 'shou', batch_id: c.batch_id.toString(), teacher_id: c.teacher_id.toString(), days, startTime, endTime }); 
        setError(''); setDialogOpen(true); 
    };

    const handleSubmit = async () => {
        setSaving(true); setError('');
        try {
            const schedule_info = form.days.length > 0 ? `${form.days.join(', ')}, ${form.startTime} - ${form.endTime}` : '';
            const payload = { name: form.name, class_type: form.class_type, batch_id: parseInt(form.batch_id), teacher_id: parseInt(form.teacher_id), schedule_info };
            if (editing) await axios.put(`/api/study-classes/${editing.id}`, payload);
            else await axios.post('/api/study-classes', payload);
            setDialogOpen(false); fetchClasses();
        } catch (err: any) { setError(err.response?.data?.message || 'Gagal menyimpan'); } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        try { await axios.delete(`/api/study-classes/${deleting.id}`); setDeleteDialogOpen(false); fetchClasses(); }
        catch (err: any) { toast.error(err.response?.data?.message || 'Gagal menghapus'); }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.classManagement}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t.classManagementDesc}</p>
                </div>
                {canManage && <Button onClick={openCreate} className="shadow-sm">+ {t.addClass}</Button>}
            </div>

            <div className="flex justify-between items-center bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl p-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700/50">
                <div className="relative w-full max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input 
                        placeholder={t.searchClass} 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                        className="pl-10 border-0 focus-visible:ring-0 bg-gray-50 dark:bg-[#1e2532]/90 dark:backdrop-blur-xl dark:text-white w-full" 
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">{t.loading}</div>
            ) : classes.length === 0 ? (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-[#151a23]/90 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                    <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    </div>
                    <p>{t.noClassFound}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((c) => (
                        <div key={c.id} className="bg-white dark:bg-[#151a23]/90 dark:backdrop-blur-xl border border-gray-100 dark:border-gray-700/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-1" title={c.name}>{c.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                        {c.batch?.name || '-'}
                                    </p>
                                </div>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 uppercase tracking-wider border border-indigo-100 dark:border-indigo-800/50">
                                    {c.class_type || '-'}
                                </span>
                            </div>
                            
                            <div className="space-y-3 mb-6 flex-grow">
                                <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mr-3 flex-shrink-0 text-orange-600 dark:text-orange-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                    </div>
                                    <span className="truncate" title={c.teacher?.user?.name}>{c.teacher?.user?.name || '-'}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3 flex-shrink-0 text-blue-600 dark:text-blue-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    </div>
                                    <span className="truncate" title={c.schedule_info}>{c.schedule_info || t.scheduleNotSet}</span>
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-2 mt-auto">
                                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={() => window.location.href = `/dashboard/classes/${c.id}/grades`}>
                                    {t.inputGrades}
                                </Button>
                                
                                <div className="flex gap-1">
                                    <Button variant="outline" size="icon" className="h-9 w-9 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 dark:border-gray-700 dark:hover:bg-gray-800" onClick={() => openEdit(c)} title="Edit Kelas">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                    </Button>
                                    {isAdmin && (
                                        <Button variant="outline" size="icon" className="h-9 w-9 text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 dark:border-gray-700" onClick={() => { setDeleting(c); setDeleteDialogOpen(true); }} title="Hapus Kelas">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? t.editClass : t.addNewClass}</DialogTitle>
                        <DialogDescription>{editing ? t.editClass : t.addNewClass}</DialogDescription>
                    </DialogHeader>
                    {error && <div className="bg-red-50 dark:bg-red-950/40 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label>{t.className} *</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.className} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.scheduleDay}</Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => {
                                            setForm(prev => {
                                                const days = prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day];
                                                // Urutkan berdasarkan urutan hari standar
                                                const order = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
                                                days.sort((a, b) => order.indexOf(a) - order.indexOf(b));
                                                return { ...prev, days };
                                            });
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${form.days.includes(day) ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#1e2532] dark:text-gray-400 dark:hover:bg-[#2a3441]'}`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t.startTime}</Label>
                                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.endTime}</Label>
                                <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.classLevel} *</Label>
                            <Select value={form.class_type} onValueChange={(v) => setForm({ ...form, class_type: v ?? '' })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t.selectLevel}>
                                        {form.class_type === 'shou' ? 'Shou (Dasar)' : 
                                         form.class_type === 'chuu' ? 'Chuu (Tengah)' :
                                         form.class_type === 'kou' ? 'Kou (Atas)' :
                                         form.class_type === 'jft' ? 'JFT' :
                                         form.class_type === 'kaiwa' ? 'Kaiwa' : t.selectLevel}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="shou">Shou (Dasar)</SelectItem>
                                    <SelectItem value="chuu">Chuu (Tengah)</SelectItem>
                                    <SelectItem value="kou">Kou (Atas)</SelectItem>
                                    <SelectItem value="jft">JFT</SelectItem>
                                    <SelectItem value="kaiwa">Kaiwa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.batch} *</Label>
                            <Select value={form.batch_id ? String(form.batch_id) : ''} onValueChange={(v) => setForm({ ...form, batch_id: v ?? '' })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t.selectBatch}>
                                        {form.batch_id ? batches.find(b => b.id.toString() === String(form.batch_id))?.name : t.selectBatch}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        {/* Sensei dropdown hanya ditampilkan untuk Admin, Sensei otomatis di-assign backend */}
                        {isAdmin && (
                            <div className="grid gap-2">
                                <Label>Sensei *</Label>
                                <Select value={form.teacher_id ? String(form.teacher_id) : ''} onValueChange={(v) => setForm({ ...form, teacher_id: v ?? '' })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t.selectSensei}>
                                            {form.teacher_id ? (teachers.find((tc: any) => tc.id.toString() === String(form.teacher_id))?.user?.name || teachers.find((tc: any) => tc.id.toString() === String(form.teacher_id))?.nip) : t.selectSensei}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>{teachers.map((t: any) => <SelectItem key={t.id} value={t.id.toString()}>{t.user?.name || t.nip}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        )}
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
                        <AlertDialogTitle>{t.deleteClass}</AlertDialogTitle>
                        <AlertDialogDescription>{t.deleteClass} &quot;{deleting?.name}&quot;?</AlertDialogDescription>
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
